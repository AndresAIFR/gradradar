import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Phone, Calendar, ToggleLeft, Tag, RefreshCw, Users } from 'lucide-react';
import { ImportWizardState, TransformRule } from '../ImportWizard';
import { useToast } from '@/hooks/use-toast';

// Helper function to get current date in YYYY-MM-DD format
const getCurrentDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

interface DataTransformationStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

interface InteractionNote {
  type: 'phone' | 'in-person' | 'email' | 'other';
  date: string;
  content: string;
  followUp: boolean;
}

interface DropoutDateDetection {
  alumniName: string;
  dropoutDate: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  rowNumber: number;
  notes?: string;
}

interface TransformPreview {
  field: string;
  type: string;
  examples: Array<{
    original: string;
    transformed: string;
    rowNumbers: number[];
  }>;
}

// Component for individual dropout detection item
function DropoutDetectionItem({ 
  detection, 
  onUpdate, 
  onRemove 
}: { 
  detection: DropoutDateDetection; 
  onUpdate: (detection: DropoutDateDetection) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState(detection.dropoutDate);
  const [editedName, setEditedName] = useState(detection.alumniName);
  const [showNotes, setShowNotes] = useState(false);
  const isManual = detection.rowNumber === 0;
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">
            {isManual && isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm font-medium"
                placeholder="Alumni Name"
              />
            ) : (
              detection.alumniName
            )}
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {isManual ? 'Manual Entry' : `Row ${detection.rowNumber}`}
          </div>
          <div className="flex items-center gap-2 mb-2">
            {isEditing ? (
              <>
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="text-sm font-mono px-2 py-1 border rounded"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onUpdate({ 
                      ...detection, 
                      dropoutDate: editedDate,
                      alumniName: isManual ? editedName : detection.alumniName 
                    });
                    setIsEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditedDate(detection.dropoutDate);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-sm font-mono">{detection.dropoutDate}</span>
                <Badge 
                  variant={
                    detection.confidence === 'high' ? 'default' : 
                    detection.confidence === 'medium' ? 'secondary' : 
                    'outline'
                  }
                  className="text-xs"
                >
                  {detection.confidence} confidence
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-6 px-2 text-xs"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove()}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
                {detection.notes && detection.rowNumber > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNotes(!showNotes)}
                    className="h-6 px-2 text-xs"
                  >
                    {showNotes ? 'Hide' : 'View'} Notes
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 italic">{detection.reason}</div>
          {showNotes && detection.notes && (
            <div className="mt-2 p-2 bg-white rounded border text-xs">
              <div className="font-medium mb-1">Full Notes:</div>
              <div className="text-gray-600 whitespace-pre-wrap">{detection.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DataTransformationStep({ state, updateState }: DataTransformationStepProps) {
  const [transformPreviews, setTransformPreviews] = useState<TransformPreview[]>([]);
  const [customRules, setCustomRules] = useState<TransformRule[]>([]);
  const [interactionNotes, setInteractionNotes] = useState<Map<number, InteractionNote[]>>(new Map());
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [dropoutDetections, setDropoutDetections] = useState<DropoutDateDetection[]>([]);
  const [simplifiedDetection, setSimplifiedDetection] = useState<{
    note1Found: boolean;
    note2Found: boolean;
    connectedAsOf422Found: boolean;
  }>({ note1Found: false, note2Found: false, connectedAsOf422Found: false });
  const { toast } = useToast();
  
  // Test mode - process just a few rows without database import
  const runTestMode = () => {
    console.log('🧪 TEST MODE - Processing first 3 rows with simplified logic...');
    const results: any[] = [];
    
    // Find the required columns
    const note1ColumnIndex = state.headers.findIndex(h => h.toLowerCase().includes('note 1'));
    const note2ColumnIndex = state.headers.findIndex(h => h.toLowerCase().includes('note 2'));
    const connectedAsOf422Index = state.headers.findIndex(h => h.toLowerCase().includes('connected as of 4/22/25'));
    const attemptedOutreachIndex = state.columnMappings.findIndex(m => m.dbField === 'attemptedOutreach');
    const circleBackIndex = state.columnMappings.findIndex(m => m.dbField === 'circleBack');
    
    // Process first 3 data rows (skip header)
    const testRows = state.rawData.slice(1, 4);
    
    testRows.forEach((row, rowIndex) => {
      const alumniName = `${row[state.headers.findIndex(h => h.toLowerCase().includes('first'))] || 'Unknown'} ${row[state.headers.findIndex(h => h.toLowerCase().includes('last'))] || 'Unknown'}`;
      
      // Determine the most recent date (between 4/22/25 and Attempted Outreach)
      const baseDate = '2025-04-22';
      let mostRecentDate = baseDate;
      
      if (attemptedOutreachIndex >= 0 && row[attemptedOutreachIndex]) {
        const outreachValue = row[attemptedOutreachIndex].trim();
        const outreachDate = formatDate(outreachValue);
        if (outreachDate && outreachDate > baseDate) {
          mostRecentDate = outreachDate;
        }
      }
      
      // Check if contact was successful
      let wasSuccessfulContact = false;
      if (connectedAsOf422Index >= 0 && row[connectedAsOf422Index]) {
        const connectedValue = row[connectedAsOf422Index].trim().toLowerCase();
        wasSuccessfulContact = connectedValue === 'yes' || connectedValue === 'true' || connectedValue === '1';
      }
      
      // Check if Circle Back = Yes
      let needsCircleBack = false;
      if (circleBackIndex >= 0 && row[circleBackIndex]) {
        const circleBackValue = row[circleBackIndex].trim().toLowerCase();
        needsCircleBack = circleBackValue === 'yes' || circleBackValue === 'true' || circleBackValue === '1';
      }
      
      const result = {
        rowIndex: rowIndex + 1,
        name: alumniName,
        rawData: {
          note1Value: note1ColumnIndex >= 0 ? row[note1ColumnIndex] : 'N/A',
          note2Value: note2ColumnIndex >= 0 ? row[note2ColumnIndex] : 'N/A',
          connectedAs422Value: connectedAsOf422Index >= 0 ? row[connectedAsOf422Index] : 'N/A',
          attemptedOutreachValue: attemptedOutreachIndex >= 0 ? row[attemptedOutreachIndex] : 'N/A',
          circleBackValue: circleBackIndex >= 0 ? row[circleBackIndex] : 'N/A',
          mostRecentDate,
          wasSuccessfulContact,
          needsCircleBack
        },
        processedNotes: [] as any[],
        issues: [] as string[]
      };
      
      // Process Note 1 (Phone)
      if (note1ColumnIndex >= 0 && row[note1ColumnIndex]) {
        const note1Content = row[note1ColumnIndex].trim();
        if (note1Content && note1Content.toLowerCase() !== 'no') {
          result.processedNotes.push({
            type: 'Note 1 (Phone)',
            content: note1Content,
            date: mostRecentDate,
            followUp: needsCircleBack
          });
        } else {
          result.issues.push('Note 1 text was empty or "no"');
        }
      } else {
        result.issues.push('No Note 1 column found');
      }
      
      // Process Note 2 (General)
      if (note2ColumnIndex >= 0 && row[note2ColumnIndex]) {
        const note2Content = row[note2ColumnIndex].trim();
        if (note2Content && note2Content.toLowerCase() !== 'no') {
          result.processedNotes.push({
            type: 'Note 2 (General)',
            content: note2Content,
            date: mostRecentDate
          });
        } else {
          result.issues.push('Note 2 text was empty or "no"');
        }
      } else {
        result.issues.push('No Note 2 column found');
      }
      
      results.push(result);
    });
    
    setTestResults(results);
    setShowTestResults(true);
    console.log('🧪 SIMPLIFIED TEST RESULTS:', results);
  };

  useEffect(() => {
    if (state.columnMappings.length > 0 && state.rawData.length > 1) {
      // Only run auto-detection if no transform rules exist yet
      if (state.transformRules.length === 0) {
        autoDetectTypeTransforms();
      }
      generateTransformPreviews();
      generateInteractionNotes();
      detectDropoutDates();
    }
  }, [state.columnMappings, state.rawData]);

  useEffect(() => {
    // Update parent state with interaction notes
    updateState({ interactionNotes });
  }, [interactionNotes, updateState]);

  // Define expected data types for database fields
  const getExpectedFieldType = (dbField: string): 'string' | 'number' | 'boolean' | 'date' => {
    const numberFields = ['cohortYear', 'householdSize', 'currentSalary'];
    const booleanFields = [
      'militaryService', 'pathTypeModified', 'currentStageModified', 'currentlyEnrolled',
      'receivedScholarships', 'enrolledInOpportunityProgram', 'onCourseEconomicLiberation',
      'employed', 'salaryDataConsent', 'circleBack', 'transcriptCollected', 'needsTutor',
      'needsFollowUp', 'flaggedForOutreach', 'isArchived'
    ];
    const dateFields = [
      'dateOfBirth', 'dropoutDate', 'expectedGraduationDate', 'trainingStartDate',
      'trainingEndDate', 'latestIncomeDate', 'connectedAsOf', 'attemptedOutreach',
      'lastContactDate', 'reminderDate'
    ];

    if (numberFields.includes(dbField)) return 'number';
    if (booleanFields.includes(dbField)) return 'boolean';
    if (dateFields.includes(dbField)) return 'date';
    return 'string';
  };

  // Check if a string value can be converted to the expected type
  const canConvertToType = (value: string, expectedType: string): boolean => {
    if (!value || value.trim() === '') return true; // Empty values can be null
    
    const trimmed = value.trim();
    
    switch (expectedType) {
      case 'number':
        return /^\d+(\.\d+)?$/.test(trimmed);
      case 'boolean':
        const lowerVal = trimmed.toLowerCase();
        return ['true', 'false', 'yes', 'no', '1', '0'].includes(lowerVal);
      case 'date':
        return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed);
      default:
        return true;
    }
  };

  const autoDetectTypeTransforms = () => {
    const newTransformRules: TransformRule[] = [...state.transformRules];
    let addedRules = 0;

    state.columnMappings.forEach((mapping, colIndex) => {
      if (!mapping.dbField) return;
      
      const expectedType = getExpectedFieldType(mapping.dbField);
      
      // Skip if already has a transform rule for this field
      if (newTransformRules.some(rule => rule.field === mapping.dbField)) {
        return;
      }
      
      // Sample the first few non-empty values from this column
      const sampleValues = state.rawData.slice(1, 6) // Sample first 5 data rows
        .map(row => row[colIndex])
        .filter(val => val && val.trim() !== '')
        .slice(0, 3); // Take first 3 non-empty values
      
      if (sampleValues.length === 0) return;
      
      // Check if we need type conversion - all CSV values are strings, but some need to become numbers/booleans
      const needsTypeConversion = (expectedType === 'number' || expectedType === 'boolean' || expectedType === 'date') && 
        sampleValues.every(value => typeof value === 'string');
      
      if (needsTypeConversion) {
        // Verify the values can actually be converted to the expected type
        const canConvert = sampleValues.every(value => canConvertToType(value, expectedType));
        
        if (canConvert) {
          // Add transform rule
          const newRule: TransformRule = {
            field: mapping.dbField,
            type: expectedType as any,
            from: sampleValues[0], // Example "from" value
            to: applyTransformation(sampleValues[0], expectedType) // Example "to" value
          };
          
          newTransformRules.push(newRule);
          addedRules++;
          
          // Update the column mapping to include the transform
          mapping.transform = expectedType;
          
          
        }
      }
    });
    
    if (addedRules > 0) {
      
      updateState({ 
        transformRules: newTransformRules,
        columnMappings: [...state.columnMappings] // Trigger re-render with updated transforms
      });
    }
  };

  const generateTransformPreviews = () => {
    const previews: TransformPreview[] = [];
    
    state.columnMappings.forEach((mapping, colIndex) => {
      if (!mapping.dbField || !mapping.transform) return;
      
      const transformExamples = new Map<string, { transformed: string; rows: number[] }>();
      
      // Process each row to find unique transformation examples
      state.rawData.slice(1).forEach((row, rowIndex) => {
        const originalValue = row[colIndex] || '';
        if (!originalValue || originalValue.trim() === '') return;
        
        const transformed = applyTransformation(originalValue, mapping.transform!);
        
        const key = `${originalValue}→${transformed}`;
        if (transformExamples.has(key)) {
          transformExamples.get(key)!.rows.push(rowIndex + 1);
        } else {
          transformExamples.set(key, {
            transformed,
            rows: [rowIndex + 1]
          });
        }
      });
      
      // Convert to preview format (show top 5 examples)
      const examples = Array.from(transformExamples.entries())
        .slice(0, 5)
        .map(([_, data]) => {
          const [original] = _.split('→');
          return {
            original,
            transformed: data.transformed,
            rowNumbers: data.rows
          };
        });
      
      if (examples.length > 0) {
        previews.push({
          field: mapping.dbField,
          type: mapping.transform,
          examples
        });
      }
    });
    
    setTransformPreviews(previews);
  };

  const generateInteractionNotes = () => {
    const notesMap = new Map<number, InteractionNote[]>();
    
    console.log(`🎯 SIMPLIFIED NOTE GENERATION - Processing ${state.rawData.length - 1} rows`);
    
    // Find the required columns - support both 2024 and 2025 formats
    const note1ColumnIndex = state.headers.findIndex(h => h.toLowerCase().includes('note 1'));
    const note2ColumnIndex = state.headers.findIndex(h => h.toLowerCase().includes('note 2'));
    
    // 2024 format: "Connected as of 4/22/25" vs 2025 format: "Connected"
    const connectedAsOf422Index = state.headers.findIndex(h => h.toLowerCase().includes('connected as of 4/22/25'));
    const connectedIndex = state.headers.findIndex(h => h.toLowerCase() === 'connected');
    
    // 2024 format: "Attempted Outreach" vs 2025 format: "Last Attempted Outreach"
    const attemptedOutreachIndex = state.columnMappings.findIndex(m => m.dbField === 'attemptedOutreach');
    const lastAttemptedIndex = state.headers.findIndex(h => h.toLowerCase().includes('last attempted outreach'));
    
    const circleBackIndex = state.columnMappings.findIndex(m => m.dbField === 'circleBack');
    
    // Determine which format we're using (2024 vs 2025)
    const is2025Format = connectedIndex >= 0 || lastAttemptedIndex >= 0;
    
    console.log(`📋 COLUMN MAPPING (${is2025Format ? '2025' : '2024'} Format):`, {
      note1ColumnIndex,
      note2ColumnIndex, 
      connectedAsOf422Index,
      connectedIndex,
      attemptedOutreachIndex,
      lastAttemptedIndex,
      circleBackIndex,
      is2025Format
    });
    
    // Update detection state
    setSimplifiedDetection({
      note1Found: note1ColumnIndex >= 0,
      note2Found: note2ColumnIndex >= 0,
      connectedAsOf422Found: connectedAsOf422Index >= 0
    });
    
    // Process each row
    state.rawData.slice(1).forEach((row, rowIndex) => {
      const notes: InteractionNote[] = [];
      const alumniName = `${row[state.headers.findIndex(h => h.toLowerCase().includes('first'))] || 'Unknown'} ${row[state.headers.findIndex(h => h.toLowerCase().includes('last'))] || 'Unknown'}`;
      
      // Determine contact date and success based on format
      let contactDate;
      let wasSuccessfulContact = false;
      let needsCircleBack = false;
      
      if (is2025Format) {
        // 2025 Format Logic
        const connectedValue = connectedIndex >= 0 ? row[connectedIndex]?.trim() : '';
        const lastAttemptedValue = lastAttemptedIndex >= 0 ? row[lastAttemptedIndex]?.trim() : '';
        
        if (connectedValue) {
          // Has a date in Connected column = successful contact
          contactDate = formatDate(connectedValue) || getCurrentDate();
          wasSuccessfulContact = true;
        } else if (lastAttemptedValue) {
          // No Connected date but has Last Attempted = failed attempt
          contactDate = formatDate(lastAttemptedValue) || getCurrentDate();
          wasSuccessfulContact = false;
        } else {
          // No dates in either column
          contactDate = getCurrentDate();
          wasSuccessfulContact = false;
        }
        
        // No Circle Back column in 2025 format
        needsCircleBack = false;
        
      } else {
        // 2024 Format Logic (existing)
        const baseDate = '2025-04-22'; // 4/22/25
        contactDate = baseDate;
        
        if (attemptedOutreachIndex >= 0 && row[attemptedOutreachIndex]) {
          const outreachValue = row[attemptedOutreachIndex].trim();
          const outreachDate = formatDate(outreachValue);
          if (outreachDate && outreachDate > baseDate) {
            contactDate = outreachDate;
          }
        }
        
        // Check if contact was successful (Connected as of 4/22/25 = Yes)
        if (connectedAsOf422Index >= 0 && row[connectedAsOf422Index]) {
          const connectedValue = row[connectedAsOf422Index].trim().toLowerCase();
          wasSuccessfulContact = connectedValue === 'yes' || connectedValue === 'true' || connectedValue === '1';
        }
        
        // Check if Circle Back = Yes (1 week priority)
        if (circleBackIndex >= 0 && row[circleBackIndex]) {
          const circleBackValue = row[circleBackIndex].trim().toLowerCase();
          needsCircleBack = circleBackValue === 'yes' || circleBackValue === 'true' || circleBackValue === '1';
        }
      }
      
      // NOTE GENERATION: Different logic for 2024 vs 2025 formats
      if (is2025Format) {
        // 2025 Format: Generate notes from Connected/Last Attempted columns only (ignore Note 1)
        if (contactDate && (connectedIndex >= 0 || lastAttemptedIndex >= 0)) {
          const noteContent = wasSuccessfulContact 
            ? `Phone call - Alumni connected successfully on ${contactDate}`
            : `Phone call attempt - Unable to reach alumni on ${contactDate}`;
          
          const phoneNote: any = {
            type: 'phone',
            date: contactDate,
            content: noteContent,
            followUp: false, // Keep interface compatibility
            studentResponded: wasSuccessfulContact,
            needsFollowUp: !wasSuccessfulContact, // Failed attempts need follow-up
            followUpPriority: !wasSuccessfulContact ? 'normal' : 'none'
          };
          notes.push(phoneNote);
          
          console.log(`📞 [Row ${rowIndex + 1}] ${alumniName} - 2025 Auto-Generated Note:`, {
            content: noteContent,
            date: contactDate,
            successful: wasSuccessfulContact,
            needsFollowUp: !wasSuccessfulContact,
            priority: !wasSuccessfulContact ? 'normal' : 'none'
          });
        }
      } else {
        // 2024 Format: Use Note 1 content (existing logic)
        if (note1ColumnIndex >= 0 && row[note1ColumnIndex]) {
          const note1Content = row[note1ColumnIndex].trim();
          if (note1Content && note1Content.toLowerCase() !== 'no') {
            const phoneNote: any = {
              type: 'phone',
              date: contactDate,
              content: note1Content,
              followUp: false, // Keep interface compatibility
              studentResponded: wasSuccessfulContact,
              needsFollowUp: needsCircleBack, // Circle Back determines follow-up
              followUpPriority: needsCircleBack ? 'normal' : 'none'
            };
            notes.push(phoneNote);
            
            console.log(`📞 [Row ${rowIndex + 1}] ${alumniName} - 2024 Note 1 (Phone):`, {
              content: note1Content.substring(0, 50) + '...',
              date: contactDate,
              successful: wasSuccessfulContact,
              circleBack: needsCircleBack,
              needsFollowUp: needsCircleBack,
              priority: needsCircleBack ? 'normal' : 'none'
            });
          }
        }
      }
      
      // NOTE 2 (General) - Only available in 2024 format
      if (!is2025Format && note2ColumnIndex >= 0 && row[note2ColumnIndex]) {
        const note2Content = row[note2ColumnIndex].trim();
        if (note2Content && note2Content.toLowerCase() !== 'no') {
          const generalNote: any = {
            type: 'other',
            date: contactDate,
            content: note2Content,
            followUp: false, // Keep interface compatibility
            needsFollowUp: false, // Note 2 doesn't need follow-up
            followUpPriority: 'none' // Note 2 has no priority
          };
          notes.push(generalNote);
          
          console.log(`📝 [Row ${rowIndex + 1}] ${alumniName} - Note 2 (General):`, {
            content: note2Content.substring(0, 50) + '...',
            date: contactDate
          });
        }
      }
      
      // Store notes if any were created
      if (notes.length > 0) {
        const globalRowIndex = rowIndex + 1;
        notesMap.set(globalRowIndex, notes);
        console.log(`💾 [Row ${globalRowIndex}] ${alumniName} - Created ${notes.length} notes`);
      }
    });
    
    console.log(`✅ SIMPLIFIED NOTE GENERATION COMPLETE:`, {
      totalRows: state.rawData.length - 1,
      rowsWithNotes: notesMap.size,
      totalNotes: Array.from(notesMap.values()).reduce((sum, notes) => sum + notes.length, 0)
    });
    
    setInteractionNotes(notesMap);
  };

  const applyTransformation = (value: string, transformType: string): string => {
    switch (transformType) {
      case 'phone':
        return formatPhoneNumber(value);
      case 'date':
        return formatDate(value);
      case 'boolean':
        return formatBoolean(value);
      case 'number':
        return formatNumber(value);
      case 'status':
        return formatTrackingStatus(value);
      case 'support':
        return formatSupportCategory(value);
      default:
        return value;
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phone; // Return original if can't format
  };

  const formatDate = (dateStr: string): string => {
    const normalized = dateStr.toLowerCase().trim();
    
    // Handle "Yes" → current date
    if (normalized === 'yes') {
      return new Date().toISOString().split('T')[0];
    }
    
    // Handle "No" → null
    if (normalized === 'no' || normalized === '') {
      return '';
    }
    
    // Try parsing various formats
    const datePatterns = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YY or MM/DD/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        try {
          let year, month, day;
          if (pattern === datePatterns[0]) {
            month = parseInt(match[1]);
            day = parseInt(match[2]);
            year = parseInt(match[3]);
            if (year < 100) {
              year += year < 50 ? 2000 : 1900;
            }
          } else {
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          }
          
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Continue to next format
        }
      }
    }
    
    return dateStr; // Return original if can't parse
  };

  const formatBoolean = (value: string): string => {
    const normalized = value.toLowerCase().trim();
    const trueValues = ['true', '1', 'yes', 'y'];
    const falseValues = ['false', '0', 'no', 'n', ''];
    
    if (trueValues.includes(normalized)) return 'true';
    if (falseValues.includes(normalized)) return 'false';
    return 'false'; // Default to false for unknown values
  };

  const formatNumber = (value: string): string => {
    const trimmed = value.trim();
    
    // Remove any non-numeric characters except decimal points and negative signs
    const numericOnly = trimmed.replace(/[^0-9.-]/g, '');
    
    // Parse as number to validate and then return as string
    const parsed = parseFloat(numericOnly);
    
    // Return the original trimmed value if it's already a valid integer
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }
    
    // Return parsed number as string, or original if parsing failed
    return isNaN(parsed) ? trimmed : parsed.toString();
  };

  const formatTrackingStatus = (status: string): string => {
    const normalized = status.toLowerCase().trim();
    
    const statusMap: { [key: string]: string } = {
      'on track': 'on-track',
      'on-track': 'on-track',
      'off track': 'off-track',
      'off-track': 'off-track',
      'near course': 'near-track',
      'near-track': 'near-track',
      'unknown': 'unknown',
      '': 'on-track' // Default
    };
    
    return statusMap[normalized] || 'on-track';
  };

  const formatSupportCategory = (category: string): string => {
    const normalized = category.toLowerCase().trim();
    
    const categoryMap: { [key: string]: string } = {
      'low needs': 'Low Needs',
      'low': 'Low Needs',
      'medium needs': 'Medium Needs',
      'medium': 'Medium Needs',
      'high needs': 'High Needs',
      'high': 'High Needs',
      'unknown': 'Unknown',
      '': ''
    };
    
    return categoryMap[normalized] || category;
  };

  const getTransformIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'date':
        return <Calendar className="h-4 w-4" />;
      case 'boolean':
        return <ToggleLeft className="h-4 w-4" />;
      case 'status':
      case 'support':
        return <Tag className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getFieldLabel = (field: string): string => {
    const fieldLabels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      cohortYear: 'Cohort Year',
      phone: 'Phone Number',
      connectedAsOf: 'Connected As Of',
      attemptedOutreach: 'Attempted Outreach',
      circleBack: 'Circle Back',
      transcriptCollected: 'Transcript Collected',
      needsTutor: 'Needs Tutor',
      trackingStatus: 'Tracking Status',
      supportCategory: 'Support Category',
      dropoutDate: 'Dropout Date'
    };
    return fieldLabels[field] || field;
  };

  // Generate and save transformation rules
  useEffect(() => {
    const rules: TransformRule[] = [];
    
    transformPreviews.forEach(preview => {
      preview.examples.forEach(example => {
        if (example.original !== example.transformed) {
          rules.push({
            field: preview.field,
            type: preview.type as any,
            from: example.original,
            to: example.transformed
          });
        }
      });
    });
    
    updateState({ transformRules: [...rules, ...customRules] });
  }, [transformPreviews, customRules]);

  // Detect dropout dates from notes
  const detectDropoutDates = () => {
    const detections: DropoutDateDetection[] = [];
    
    // Find indices for necessary columns
    const firstNameIdx = state.columnMappings.findIndex(m => m.dbField === 'firstName');
    const lastNameIdx = state.columnMappings.findIndex(m => m.dbField === 'lastName');
    const notesIdx = state.columnMappings.findIndex(m => m.dbField === 'notes');
    const cohortYearIdx = state.columnMappings.findIndex(m => m.dbField === 'cohortYear');
    const collegeIdx = state.columnMappings.findIndex(m => m.dbField === 'collegeAttending' || m.dbField === 'matriculation');
    const trackingStatusIdx = state.columnMappings.findIndex(m => m.dbField === 'trackingStatus');
    if (firstNameIdx === -1 || lastNameIdx === -1) {
      
      return;
    }
    
    // Phrases that indicate explicit dropout or status change
    const dropoutPhrases = [
      { phrase: "doesn't go to", confidence: 'high' as const },
      { phrase: "doesn't go anymore", confidence: 'high' as const },
      { phrase: "stopped out", confidence: 'high' as const },
      { phrase: "decided not to go back", confidence: 'high' as const },
      { phrase: "not attending classes", confidence: 'high' as const },
      { phrase: "kicked out", confidence: 'high' as const },
      { phrase: "academic probation", confidence: 'high' as const },
      { phrase: "FAFSA removed", confidence: 'high' as const },
      { phrase: "did not finish", confidence: 'medium' as const },
      { phrase: "off track", confidence: 'medium' as const },
      { phrase: "unknown status", confidence: 'low' as const },
      { phrase: "failing", confidence: 'medium' as const },
      { phrase: "failed", confidence: 'high' as const },
      { phrase: "withdrawn", confidence: 'high' as const },
      { phrase: "withdrew", confidence: 'high' as const },
      { phrase: "dropped out", confidence: 'high' as const },
      { phrase: "not enrolled", confidence: 'high' as const },
      { phrase: "left school", confidence: 'high' as const },
      { phrase: "not returning", confidence: 'high' as const }
    ];
    
    // Phrases that indicate still enrolled (despite being unresponsive)
    const stillEnrolledPhrases = [
      "unresponsive", "no response", "stopped responding", "not responding",
      "will need support but still registered", "still enrolled"
    ];
    
    // Process each row
    let processedCount = 0;
    state.rawData.slice(1).forEach((row, index) => {
      const notes = (row[notesIdx] || '').toLowerCase();
      const firstName = row[firstNameIdx] || '';
      const lastName = row[lastNameIdx] || '';
      const cohortYear = parseInt(row[cohortYearIdx] || '');
      const college = row[collegeIdx] || '';
      const trackingStatus = row[trackingStatusIdx] || '';
      
      processedCount++;
      
      // Skip if no name (required fields)
      if (!firstName || !lastName) return;
      
      const fullName = `${firstName} ${lastName}`;
      
      // Check if student has a college mentioned
      const hasCollege = college && college.trim() !== '';
      
      // Check for "never enrolled" indicators
      const neverEnrolledIndicators = [
        "working at", "works as", "never responded", "didn't make cutoff",
        "no college", "not in college", "employed"
      ];
      
      const isNeverEnrolled = neverEnrolledIndicators.some(indicator => 
        notes.includes(indicator) && !hasCollege
      );
      
      if (isNeverEnrolled) return; // Skip - never enrolled
      
      // Check if just unresponsive (but likely still enrolled)
      const isJustUnresponsive = hasCollege && 
        stillEnrolledPhrases.some(phrase => notes.includes(phrase)) &&
        !dropoutPhrases.some(dp => notes.includes(dp.phrase));
      
      if (isJustUnresponsive) return; // Skip - assume still enrolled
      
      // Look for explicit dropout evidence
      let detectedDropout = false;
      let dropoutReason = '';
      let confidence: 'high' | 'medium' | 'low' = 'low';
      
      for (const dropoutPhrase of dropoutPhrases) {
        if (notes.includes(dropoutPhrase.phrase)) {
          detectedDropout = true;
          dropoutReason = dropoutPhrase.phrase;
          confidence = dropoutPhrase.confidence;
          break;
        }
      }
      
      
      if (detectedDropout) {
        // Try to extract date from notes or use defaults
        let dropoutDate = '';
        
        // Look for specific date mentions
        const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})?/i;
        const fallPattern = /fall\s*(\d{4})?/i;
        const springPattern = /spring\s*(\d{4})?/i;
        
        const monthMatch = notes.match(monthPattern);
        const fallMatch = notes.match(fallPattern);
        const springMatch = notes.match(springPattern);
        
        if (monthMatch) {
          const month = monthMatch[1];
          const year = monthMatch[2] || cohortYear;
          dropoutDate = getDateFromMonth(month, parseInt(year.toString()));
        } else if (fallMatch) {
          const year = fallMatch[1] || cohortYear;
          dropoutDate = `${year}-10-01`; // October for fall
        } else if (springMatch) {
          const year = springMatch[1] || cohortYear;
          dropoutDate = `${year}-03-01`; // March for spring
        } else {
          // Default dates based on typical dropout patterns
          if (confidence === 'high') {
            dropoutDate = `${cohortYear}-11-15`; // Mid-fall semester
          } else {
            dropoutDate = `${cohortYear}-10-01`; // Early fall
          }
        }
        
        detections.push({
          alumniName: fullName,
          dropoutDate,
          reason: `Detected: "${dropoutReason}" in notes`,
          confidence,
          rowNumber: index + 2, // +2 because we skip header and arrays are 0-indexed
          notes: row[notesIdx] || '' // Include full notes for context
        });
      }
    });
    
    
    
    
    setDropoutDetections(detections);
    updateState({ dropoutDetections: detections });
  };
  
  const getDateFromMonth = (month: string, year: number): string => {
    const monthMap: { [key: string]: string } = {
      'january': '01-15', 'jan': '01-15',
      'february': '02-15', 'feb': '02-15',
      'march': '03-15', 'mar': '03-15',
      'april': '04-15', 'apr': '04-15',
      'may': '05-15',
      'june': '06-15', 'jun': '06-15',
      'july': '07-15', 'jul': '07-15',
      'august': '08-15', 'aug': '08-15',
      'september': '09-15', 'sep': '09-15',
      'october': '10-15', 'oct': '10-15',
      'november': '11-15', 'nov': '11-15',
      'december': '12-15', 'dec': '12-15'
    };
    
    const datePart = monthMap[month.toLowerCase()] || '01-01';
    return `${year}-${datePart}`;
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Transformation Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription>
              Review how your data will be transformed before import. 
              These transformations ensure data consistency and compatibility.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Transformation Previews */}
      {transformPreviews.map(preview => (
        <Card key={preview.field}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTransformIcon(preview.type)}
              <span>{getFieldLabel(preview.field)}</span>
              <Badge variant="outline" className="ml-auto">
                {preview.type}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preview.examples.map((example, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Original</div>
                    <div className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded mt-1">
                      {example.original || '(empty)'}
                    </div>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Transformed</div>
                    <div className="text-sm text-gray-900 font-mono bg-green-50 px-2 py-1 rounded mt-1">
                      {example.transformed || '(empty)'}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {example.rowNumbers.length} rows
                    </Badge>
                  </div>
                </div>
              ))}
              
              {preview.examples.length === 5 && (
                <div className="text-center text-sm text-gray-500">
                  ... and more transformations
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {transformPreviews.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No data transformations needed. Your data is already in the correct format.
          </CardContent>
        </Card>
      )}

      {/* Interaction Notes Generation */}
      {interactionNotes.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>Interaction Notes Generation</span>
              <Badge variant="outline" className="ml-auto">
                {interactionNotes.size} alumni
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                The following interaction notes will be generated using simplified logic:
                Note 1 (phone calls) and Note 2 (general notes) based on your CSV columns.
                {(simplifiedDetection.note1Found || simplifiedDetection.note2Found) && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                    <strong>Simplified Pattern Detected:</strong> 
                    {simplifiedDetection.note1Found && " Note 1 column found (phone calls)"}
                    {simplifiedDetection.note2Found && " Note 2 column found (general notes)"}
                    {simplifiedDetection.connectedAsOf422Found && " Connected as of 4/22/25 column found (success indicator)"}
                  </div>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Array.from(interactionNotes.entries()).slice(0, 10).map(([rowNum, notes]) => (
                <div key={rowNum} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Row {rowNum}</span>
                    <Badge variant="secondary" className="text-xs">
                      {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {notes.map((note, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0">
                          {note.type === 'phone' && <Phone className="h-3 w-3 text-blue-600" />}
                          {note.type === 'in-person' && <Users className="h-3 w-3 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{note.content}</div>
                          <div className="text-gray-500 text-xs">
                            {note.date}
                            {note.followUp && (
                              <span className="ml-2 text-orange-600">• Follow-up needed</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {interactionNotes.size > 10 && (
                <div className="text-center text-sm text-gray-500">
                  ... and {interactionNotes.size - 10} more alumni with interaction notes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dropout Date Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Dropout Date Detection</span>
            {dropoutDetections.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {dropoutDetections.length} detected
              </Badge>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Add manual dropout date
                  const newDetection: DropoutDateDetection = {
                    alumniName: 'New Alumni',
                    dropoutDate: new Date().toISOString().split('T')[0],
                    reason: 'Manually added',
                    confidence: 'high',
                    rowNumber: 0,
                    notes: ''
                  };
                  setDropoutDetections([...dropoutDetections, newDetection]);
                }}
              >
                <Tag className="h-3 w-3 mr-1" />
                Add Manual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDropoutDetections([]);
                  setTimeout(() => {
                    detectDropoutDates();
                  }, 100);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-detect
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                {dropoutDetections.length > 0 
                  ? `Found ${dropoutDetections.length} alumni with dropout indicators. These dropout dates will be automatically applied during import. Detection looks for: • Tracking status (Off Track, Near Course) • Academic issues (probation, failing) • Explicit dropout phrases (stopped out, kicked out, left school)`
                  : "No dropout dates were detected. Dropout detection looks for tracking status changes (Near Course, Off Track) or explicit dropout indicators in notes."}
              </AlertDescription>
            </Alert>
            
            {dropoutDetections.length > 0 && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
              {dropoutDetections.map((detection, index) => (
                <DropoutDetectionItem 
                  key={index} 
                  detection={detection} 
                  onUpdate={(updatedDetection) => {
                    const newDetections = [...dropoutDetections];
                    newDetections[index] = updatedDetection;
                    setDropoutDetections(newDetections);
                  }}
                  onRemove={() => {
                    const newDetections = dropoutDetections.filter((_, i) => i !== index);
                    setDropoutDetections(newDetections);
                  }}
                />
              ))}
              
              {dropoutDetections.length > 10 && (
                <div className="text-center text-sm text-gray-500">
                  Showing all {dropoutDetections.length} detected dropout dates
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
        
        {/* Test Mode Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Debug Mode - Test Note Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button 
                onClick={runTestMode}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Test First 3 Rows
              </Button>
              <p className="text-sm text-gray-600">
                Process the first 3 rows to debug note content without importing to database
              </p>
            </div>
            
            {showTestResults && testResults.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Test Results:</h4>
                {testResults.map((result, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-medium mb-2">
                      Row {result.rowIndex}: {result.name}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Raw CSV Data:</div>
                        <div className="text-xs font-mono bg-white p-2 rounded border">
                          Connected: {result.rawData.connectedAsOfValue}<br/>
                          Note 1: {result.rawData.note1Value}<br/>
                          Note 2: {result.rawData.note2Value}<br/>
                          Notes: {result.rawData.notesValue}<br/>
                          Date: {result.rawData.extractedDate}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Processed Notes:</div>
                        {result.processedNotes.length > 0 ? (
                          <div className="space-y-2">
                            {result.processedNotes.map((note: any, noteIdx: number) => (
                              <div key={noteIdx} className="text-xs bg-white p-2 rounded border">
                                <div className="font-medium text-blue-600">{note.type}</div>
                                <div className="text-gray-600 mt-1">{note.content}</div>
                                {note.originalNotes && (
                                  <div className="text-green-600 mt-1">Original: {note.originalNotes}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">No notes generated</div>
                        )}
                      </div>
                    </div>
                    
                    {result.issues.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-red-700 mb-1">Issues:</div>
                        <ul className="text-xs text-red-600">
                          {result.issues.map((issue: string, issueIdx: number) => (
                            <li key={issueIdx}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
    </div>
  );
}