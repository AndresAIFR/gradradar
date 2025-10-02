import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Upload, Download, FileText, Loader2 } from 'lucide-react';
import { ImportWizardState } from '../ImportWizard';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { calculateCurrentStage } from '@/../../shared/liberationPath';

interface ImportConfirmationStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
  onImportSuccess: () => void;
}

export default function ImportConfirmationStep({ 
  state, 
  updateState, 
  onImportSuccess 
}: ImportConfirmationStepProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  const executeImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      // Prepare import data
      const importData = state.parsedData
        .filter(row => !row._errors || row._errors.length === 0)
        .map(row => {
          // Remove internal fields
          const cleanRow = { ...row };
          delete cleanRow._rowNumber;
          delete cleanRow._errors;
          delete cleanRow._warnings;
          delete cleanRow._existingId;
          delete cleanRow._aiExtracted;
          delete cleanRow._createVerificationNote; // Remove verification note data from actual import
          
          // Check if this row has interaction notes - if so, exclude the notes field from alumni data
          // to prevent CSV Notes from appearing in both interaction notes AND About section
          const rowNumber = state.parsedData.findIndex(r => r === row) + 1;
          const hasInteractionNotes = state.interactionNotes.has(rowNumber) && 
                                    state.interactionNotes.get(rowNumber)!.length > 0;
          if (hasInteractionNotes) {
            delete cleanRow.notes; // Remove notes field so it doesn't go to About section
          }
          
          // Fix tracking status format conversion
          if (cleanRow.trackingStatus) {
            const originalStatus = cleanRow.trackingStatus;
            const normalizedStatus = String(cleanRow.trackingStatus).toLowerCase().trim();
            if (normalizedStatus === 'on track') {
              cleanRow.trackingStatus = 'on-track';
            } else if (normalizedStatus === 'off track') {
              cleanRow.trackingStatus = 'off-track';  
            } else if (normalizedStatus === 'near course' || normalizedStatus === 'near track') {
              cleanRow.trackingStatus = 'near-track';
            } else if (normalizedStatus === 'unknown') {
              cleanRow.trackingStatus = 'unknown';
            }
          }
          
          // Auto-calculate path type based on CSV data
          
          if (!cleanRow.pathType) {
            if (cleanRow.currentlyEnrolled) {
              cleanRow.pathType = 'college';
            } else if (cleanRow.trainingProgramName) {
              cleanRow.pathType = 'training';
            } else if (cleanRow.employed) {
              cleanRow.pathType = 'work';
            } else {
            }
            // No else clause - leave pathType as null for unclear cases
          }
          
          
          // Use unified stage calculation system
          if (!cleanRow.currentStage) {
            // The unified system respects:
            // - Academic calendar (June cutoff)
            // - Cohort year
            // - Individual student status (enrollment, dropout, employment)
            // - Path type (college, vocation, employment)
            cleanRow.currentStage = calculateCurrentStage(cleanRow);
          }
          
          // Apply college mappings and check for flagged entries
          // FIXED: Prefer actual school name over generic category
          const collegeField = cleanRow.collegeAttending || cleanRow.matriculation || cleanRow.collegeOrWorkforce;
          
          
          // Process college field data with proper priority - but only if it has meaningful content
          if (collegeField && collegeField.trim() && collegeField.trim().length > 0) {
            const norm = (s: string) => (s ?? '').trim().toLowerCase();
            const mapping = state.collegeMappings.find(
              m => norm(m.originalName) === norm(collegeField)
            );
            const finalCollegeName = mapping ? mapping.standardName : collegeField;
            
            // Use explicit category from mapping if available, otherwise auto-detect
            let explicitCategory = mapping?.category;
            
            if (!explicitCategory) {
              // Enhanced detection of data type for proper field distribution
              const lowerName = finalCollegeName.toLowerCase();
              
              // Military detection (specific to avoid false positives like "LaGuardia")
              const isMilitary = lowerName.includes('army') || lowerName.includes('navy') || 
                               lowerName.includes('marine') || lowerName.includes('national guard') ||
                               lowerName.includes('army guard') || lowerName.includes('corps') || 
                               lowerName.includes('military');
              
              // Security/Training/Job detection
              const isTrainingOrJob = lowerName.includes('security') || lowerName.includes('training') ||
                                    lowerName.includes('police') || lowerName.includes('apprentice') ||
                                    lowerName.includes('program') || finalCollegeName === 'Workforce';
              
              if (isMilitary) explicitCategory = 'military';
              else if (isTrainingOrJob) explicitCategory = 'training';
              else explicitCategory = 'college';
            }
            
            // Apply category-based path assignment
            if (explicitCategory === 'military') {
              cleanRow.pathType = 'military';
              cleanRow.militaryService = true;
              cleanRow.employerName = finalCollegeName;
              cleanRow.employmentType = 'full-time';
              cleanRow.collegeAttending = null;
              if (!cleanRow.collegeOrWorkforce) {
                cleanRow.collegeOrWorkforce = 'Military';
              }
            } else if (explicitCategory === 'training') {
              cleanRow.pathType = 'training';
              
              // Training program name: use employer field if populated, otherwise matriculation
              const trainingSource = cleanRow.employerName || finalCollegeName;
              
              // Parse entries like "Security (LaGuardia Community College)"
              const parenMatch = trainingSource.match(/^([^(]+)\s*\(([^)]+)\)$/);
              if (parenMatch) {
                const [, jobTitle, institution] = parenMatch;
                cleanRow.trainingProgramName = jobTitle.trim();
                cleanRow.trainingProgramLocation = institution.trim();
              } else {
                cleanRow.trainingProgramName = trainingSource;
              }
              
              cleanRow.collegeAttending = null;
              cleanRow.employmentType = 'Other';
              if (!cleanRow.collegeOrWorkforce) {
                cleanRow.collegeOrWorkforce = 'Training';
              }
            } else if (explicitCategory === 'work') {
              cleanRow.pathType = 'work';
              cleanRow.employed = true;
              
              // Use employer field if available, otherwise use matriculation data
              if (cleanRow.employerName) {
                // Employer column exists - keep college info from matriculation
                cleanRow.collegeAttending = finalCollegeName;
              } else {
                // No employer column - use matriculation data as employer
                cleanRow.employerName = finalCollegeName;
                cleanRow.collegeAttending = null;
              }
              
              if (!cleanRow.collegeOrWorkforce) {
                cleanRow.collegeOrWorkforce = 'Work';
              }
            } else if (explicitCategory === 'other') {
              cleanRow.pathType = 'other';
              cleanRow.collegeAttending = null;
              if (!cleanRow.collegeOrWorkforce) {
                cleanRow.collegeOrWorkforce = 'Other';
              }
            } else {
              // College path
              cleanRow.pathType = 'college';
              if (finalCollegeName && finalCollegeName.toLowerCase() !== 'college' && finalCollegeName.toLowerCase() !== 'workforce') {
                cleanRow.collegeAttending = finalCollegeName;
              }
              if (!cleanRow.collegeOrWorkforce) {
                cleanRow.collegeOrWorkforce = 'College';
              }
            }
            
            
            const isFlagged = state.flaggedEntries.includes(collegeField);
            if (isFlagged) {
              cleanRow.needsFollowUp = true;
              // Store flagged info for creating interaction note after alumni is created
              cleanRow._createVerificationNote = {
                type: 'general',
                overview: `DATA VERIFICATION NEEDED: College/employment entry '${collegeField}' was ambiguous during import. Please verify and update if incorrect.`,
                needsFollowUp: true
              };
            }
          } else {
          }
          
          // Apply AI extracted data
          const aiData = state.extractedData.filter(
            d => d.rowNumber === row._rowNumber
          );
          
          aiData.forEach(data => {
            switch (data.category) {
              case 'gpa':
                if (data.field === 'highSchoolGpa') {
                  cleanRow.highSchoolGpa = data.extractedValue;
                } else if (data.field === 'collegeGpa') {
                  cleanRow.collegeGpa = data.extractedValue;
                }
                break;
              case 'support_need':
                cleanRow.supportCategory = data.extractedValue;
                break;
              case 'dropout_indicator':
                cleanRow.dropoutDate = data.extractedValue;
                break;
            }
          });
          
          // Apply dropout dates from transformation step
          if (state.dropoutDetections && state.dropoutDetections.length > 0) {
            // For detected dropouts (rowNumber > 0)
            const dropoutDetection = state.dropoutDetections.find(
              d => d.rowNumber === (row._rowNumber || 0)
            );
            
            if (dropoutDetection && !cleanRow.dropoutDate) {
              cleanRow.dropoutDate = dropoutDetection.dropoutDate;
            }
            
            // For manual entries (rowNumber = 0), match by name
            const manualDetection = state.dropoutDetections.find(
              d => d.rowNumber === 0 && 
              d.alumniName === `${cleanRow.firstName} ${cleanRow.lastName}`
            );
            
            if (manualDetection && !cleanRow.dropoutDate) {
              cleanRow.dropoutDate = manualDetection.dropoutDate;
            }
          }
          
          // Handle "Connected as of 4/30" field - convert "Yes" to lastContactDate
          if (cleanRow.connectedAsOf) {
            const connectedValue = String(cleanRow.connectedAsOf).toLowerCase().trim();
            if (connectedValue === 'yes') {
              cleanRow.lastContactDate = '2025-04-30';
            }
            // Remove the original field since it's not a database field
            delete cleanRow.connectedAsOf;
          }
          
          // Handle "Last Attempted Outreach" field - parse dates and prepare interaction notes
          if (cleanRow.attemptedOutreach) {
            const outreachValue = String(cleanRow.attemptedOutreach).trim();
            if (outreachValue && outreachValue.toLowerCase() !== 'no' && outreachValue !== '') {
              // Parse the date - handle formats like "5/14/25", "4/25/25", "5/8", "5/20"
              const parseOutreachDate = (dateStr: string): string | null => {
                try {
                  const parts = dateStr.split('/');
                  if (parts.length === 2) {
                    // Format like "5/8" - assume 2025
                    const month = parseInt(parts[0]);
                    const day = parseInt(parts[1]);
                    return `2025-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  } else if (parts.length === 3) {
                    // Format like "5/14/25"
                    const month = parseInt(parts[0]);
                    const day = parseInt(parts[1]);
                    let year = parseInt(parts[2]);
                    if (year < 100) year += 2000; // Convert 25 to 2025
                    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  }
                  return null;
                } catch (e) {
                  return null;
                }
              };
              
              const parsedDate = parseOutreachDate(outreachValue);
              if (parsedDate) {
                // Store the interaction note data to be created after alumni is inserted
                if (!cleanRow.interactionNotes) {
                  cleanRow.interactionNotes = [];
                }
                cleanRow.interactionNotes.push({
                  type: 'phone',
                  date: parsedDate,
                  durationMin: 0, // Required field
                  overview: `Phone call attempted on ${new Date(parsedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Outreach attempt during import process.`
                });
              }
            }
            // Remove the original field since it's not a database field
            delete cleanRow.attemptedOutreach;
          }
          
          // Handle Note 1 with contact logic
          if (cleanRow.note1Content && cleanRow.note1Content.trim()) {
            if (!cleanRow.interactionNotes) {
              cleanRow.interactionNotes = [];
            }
            
            // Determine contact type based on "Meet 1:1"
            const isInPerson = String(cleanRow.note1InPerson || '').toLowerCase().trim() === 'yes';
            const contactType = isInPerson ? 'in-person' : 'phone';
            
            // Determine if contact was successful based on "Connected as of 4/30"
            const wasSuccessful = String(cleanRow.note1Connected || '').toLowerCase().trim() === 'yes';
            
            cleanRow.interactionNotes.push({
              type: contactType,
              date: '2025-04-30',
              durationMin: 0,
              overview: cleanRow.note1Content.trim(),
              studentResponded: wasSuccessful
            });
          }
          
          // Handle Note 2 as general note
          if (cleanRow.note2Content && cleanRow.note2Content.trim()) {
            if (!cleanRow.interactionNotes) {
              cleanRow.interactionNotes = [];
            }
            
            cleanRow.interactionNotes.push({
              type: 'general',
              date: '2025-04-30', 
              durationMin: 0,
              overview: cleanRow.note2Content.trim()
            });
          }
          
          // Clean up temporary note fields
          delete cleanRow.note1Content;
          delete cleanRow.note1Connected; 
          delete cleanRow.note1InPerson;
          delete cleanRow.note2Content;
          
          // Data ready for database save
          
          return cleanRow;
        });

      // Handle college mappings first
      if (state.collegeMappings.length > 0) {
        setImportProgress(10);
        
        for (const mapping of state.collegeMappings) {
          if (mapping.isNew) {
            // Create new college location with IPEDS coordinates if available
            const latitude = mapping.latitude ? mapping.latitude.toString() : '40.7128'; // Fallback to NYC
            const longitude = mapping.longitude ? mapping.longitude.toString() : '-74.0060';
            const notes = mapping.latitude && mapping.longitude 
              ? 'Created during import with IPEDS coordinates' 
              : 'Created during import with default coordinates';
            
            await fetch('/api/college-locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                collegeName: mapping.originalName,
                standardName: mapping.standardName,
                latitude,
                longitude,
                notes
              })
            });
          }
        }
        
        setImportProgress(25);
      }

      // Import alumni data in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(importData.length / batchSize);
      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = importData.slice(i * batchSize, (i + 1) * batchSize);
        
        // Get interaction notes for this batch
        const batchWithNotes = batch.map((row, index) => {
          const globalRowIndex = i * batchSize + index + 1;
          const notes = state.interactionNotes.get(globalRowIndex) || [];
          const alumniName = `${row.firstName || 'Unknown'} ${row.lastName || 'Unknown'}`;
          
          
          return { ...row, interactionNotes: notes };
        });
        
        const response = await fetch('/api/alumni/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alumni: batchWithNotes,
            importStrategy: state.importStrategy
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('Import batch failed:', response.status, errorData);
          throw new Error(`Import batch failed: ${errorData.message || 'Unknown error'}`);
        }
        
        const result = await response.json();
        successCount += result.created || 0;
        updateCount += result.updated || 0;
        errorCount += result.errors || 0;
        
        // Update progress
        const batchProgress = 25 + ((i + 1) / totalBatches) * 70;
        setImportProgress(batchProgress);
      }
      
      // Create verification notes for flagged entries  
      const flaggedRows = state.parsedData.filter((row: any) => row._createVerificationNote);
      
      if (flaggedRows.length > 0) {
        
        // Get all alumni to find newly created ones
        const allAlumni = await fetch('/api/alumni').then(r => r.json());
        
        for (const row of flaggedRows) {
          try {
            // Find the alumni by contact ID or name
            const targetAlumni = allAlumni.find((a: any) => 
              a.contactId === row.contactId || 
              (a.firstName === row.firstName && a.lastName === row.lastName)
            );
            
            
            if (targetAlumni && row._createVerificationNote) {
              
              // Create interaction note using apiRequest
              const result = await apiRequest('POST', `/api/alumni/${targetAlumni.id}/interactions`, {
                type: row._createVerificationNote.type,
                date: new Date().toISOString().split('T')[0], // Today's date
                durationMin: 0,
                overview: row._createVerificationNote.overview,
                needsFollowUp: row._createVerificationNote.needsFollowUp
              });
            }
          } catch (error) {
            console.error('Failed to create verification note:', error);
          }
        }
      }
      
      setImportProgress(100);
      
      // Update final summary
      updateState({
        summary: {
          ...state.summary,
          newRecords: successCount,
          updates: updateCount,
          errors: errorCount,
          skipped: state.parsedData.filter(row => row._errors && row._errors.length > 0).length
        }
      });
      
      setImportResults({
        success: true,
        message: `Import completed successfully!`,
        details: {
          created: successCount,
          updated: updateCount,
          errors: errorCount
        }
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unmapped-colleges'] });
      
      toast({
        title: "Import successful",
        description: `Created ${successCount} new alumni, updated ${updateCount} existing records`
      });
      
      // Wait a moment before closing
      setTimeout(() => {
        onImportSuccess();
      }, 2000);
      
    } catch (error) {
      
      setImportResults({
        success: false,
        message: 'Import failed. Please check your data and try again.',
        details: error
      });
      
      toast({
        title: "Import failed",
        description: "There was an error importing your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadImportReport = () => {
    const report = {
      importDate: new Date().toISOString(),
      summary: state.summary,
      mappings: {
        columns: state.columnMappings,
        colleges: state.collegeMappings
      },
      transformations: state.transformRules,
      aiExtractions: state.extractedData,
      errors: state.validationErrors,
      warnings: state.validationWarnings
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canImport = state.validationErrors.length === 0 && !isImporting && !importResults;

  return (
    <div className="space-y-6">
      {/* Import Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Ready to Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your data has been validated and is ready for import. Review the summary below and choose how to handle existing records.
              </AlertDescription>
            </Alert>

            {/* Import Strategy */}
            <div className="space-y-3">
              <Label>How should we handle existing alumni?</Label>
              <RadioGroup 
                value={state.importStrategy}
                onValueChange={(value: 'skip' | 'update') => updateState({ importStrategy: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer">
                    Skip existing alumni (only add new records)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="cursor-pointer">
                    Update existing alumni with new data
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Final Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Import Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total rows to process:</span>
                  <span className="font-medium">{state.summary.totalRows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New alumni to create:</span>
                  <span className="font-medium text-green-600">{state.summary.newRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Existing alumni to {state.importStrategy}:</span>
                  <span className="font-medium text-blue-600">
                    {state.importStrategy === 'skip' ? 0 : state.summary.updates}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rows with errors (will skip):</span>
                  <span className="font-medium text-red-600">{state.summary.errors}</span>
                </div>
                {state.collegeMappings.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">College mappings to apply:</span>
                    <span className="font-medium text-purple-600">{state.collegeMappings.length}</span>
                  </div>
                )}
                {state.extractedData.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI data extractions to apply:</span>
                    <span className="font-medium text-indigo-600">{state.extractedData.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={executeImport}
                disabled={!canImport}
                className="bg-green-600 hover:bg-green-700"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Execute Import
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadImportReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {isImporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Import Progress</span>
                <span className="text-sm text-gray-600">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-gray-600">
                Processing alumni data... Please do not close this window.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Alert className={importResults.success ? 'border-green-200 bg-green-50' : ''}>
          {importResults.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="font-medium">{importResults.message}</div>
            {importResults.details && importResults.success && (
              <div className="mt-2 text-sm">
                <div>• Created {importResults.details.created} new alumni</div>
                <div>• Updated {importResults.details.updated} existing records</div>
                {importResults.details.errors > 0 && (
                  <div>• {importResults.details.errors} errors encountered</div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}