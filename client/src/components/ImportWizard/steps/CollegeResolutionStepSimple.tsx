import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { ImportWizardState, CollegeMapping } from '../ImportWizard';
import SimpleMappingRow from '../SimpleMappingRowClean';

interface CollegeResolutionStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

export interface CollegeInfo {
  name: string;
  count: number;
  rowNumbers: number[];
  isMapped: boolean;
  standardName?: string;
  category?: 'college' | 'work' | 'training' | 'military' | 'other';
}

export default function CollegeResolutionStep({ state, updateState }: CollegeResolutionStepProps) {
  const [localMappings, setLocalMappings] = useState<CollegeMapping[]>([]);
  const [showKeepOriginalWarning, setShowKeepOriginalWarning] = useState(false);
  const [pendingKeepOriginal, setPendingKeepOriginal] = useState<CollegeInfo | null>(null);

  // Detect category based on college name
  const detectCategory = (collegeName: string): 'college' | 'work' | 'training' | 'military' | 'other' => {
    const name = collegeName.toLowerCase();
    
    // Military patterns (more specific to avoid false positives like "LaGuardia")
    if (name.includes('marine corps') || name.includes('marines') || 
        name.includes('army') || name.includes('navy') || name.includes('air force') ||
        name.includes('coast guard') || name.includes('military') || 
        name.includes('national guard') || name.includes('army guard')) {
      return 'military';
    }
    
    // Work patterns
    if (name.includes('working') || name.includes('employed') || name.includes('job') ||
        name.includes('work') || name.includes('employment') || name.includes('company') ||
        name.includes('business') || name.includes('retail') || name.includes('restaurant') ||
        name.includes('security') || name.includes('sales')) {
      return 'work';
    }
    
    // Training/trade patterns
    if (name.includes('trade') || name.includes('hvac') || name.includes('carpentry') ||
        name.includes('plumbing') || name.includes('electrician') || name.includes('training') ||
        name.includes('certification') || name.includes('bootcamp')) {
      return 'training';
    }
    
    // Default to college
    return 'college';
  };

  // Load existing college mappings and resolve colleges using IPEDS data
  useEffect(() => {
    const loadMappingsAndResolveColleges = async () => {
      try {
        // Get existing database mappings
        const dbResponse = await fetch('/api/college-locations');
        const existingLocations = dbResponse.ok ? await dbResponse.json() as Array<{
          standardName: string;
          aliases: string[];
        }> : [];

        // Extract colleges from current dataset
        const collegeFieldIndex = state.columnMappings.findIndex(
          m => m.dbField === 'collegeAttending' || m.dbField === 'matriculation'
        );
        
        if (collegeFieldIndex === -1) return;

        const datasetColleges = new Set<string>();
        state.rawData.slice(1).forEach(row => {
          const collegeName = row[collegeFieldIndex]?.trim();
          if (collegeName && collegeName !== '' && collegeName.toLowerCase() !== 'na') {
            datasetColleges.add(collegeName);
          }
        });

        // Create database lookup map
        const existingMappings = new Map<string, string>();
        existingLocations.forEach(location => {
          existingMappings.set(location.standardName.toLowerCase(), location.standardName);
          location.aliases.forEach(alias => {
            existingMappings.set(alias.toLowerCase(), location.standardName);
          });
        });

        const initialMappings: CollegeMapping[] = [];
        const unmappedColleges: string[] = [];
        
        // Find colleges with existing database mappings
        datasetColleges.forEach(collegeName => {
          const standardName = existingMappings.get(collegeName.toLowerCase());
          if (standardName) {
            initialMappings.push({
              originalName: collegeName,
              standardName: standardName,
              category: detectCategory(standardName), // Auto-detect category from standard name
              isNew: false,
              affectedRows: []
            });
          } else {
            unmappedColleges.push(collegeName);
          }
        });

        // Resolve unmapped colleges using IPEDS data
        if (unmappedColleges.length > 0) {
          const resolveResponse = await fetch('/api/resolve-colleges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collegeNames: unmappedColleges })
          });

          if (resolveResponse.ok) {
            const resolutions = await resolveResponse.json() as Array<{
              originalName: string;
              standardName: string | null;
              latitude: number | null;
              longitude: number | null;
              confidence: number;
              source: string;
            }>;

            // Add high-confidence IPEDS matches as pre-populated mappings
            // BUT exclude armed-forces and employment - they need user confirmation
            resolutions.forEach(resolution => {
              if (resolution.standardName && resolution.confidence >= 0.9) {
                const category = detectCategory(resolution.standardName);
                
                // Only auto-assign college and training paths
                // Armed forces and employment require user confirmation
                if (category === 'college' || category === 'training') {
                  initialMappings.push({
                    originalName: resolution.originalName,
                    standardName: resolution.standardName,
                    category: category,
                    isNew: true, // Will create new college location entry
                    affectedRows: []
                  });
                }
                // armed-forces and employment will remain unmapped for user review
              }
            });
          }
        }

        setLocalMappings(initialMappings);
      } catch (error) {
        console.error('Error loading mappings and resolving colleges:', error);
        setLocalMappings([]);
      }
    };

    if (state.rawData.length > 0) {
      loadMappingsAndResolveColleges();
    }
  }, [state.rawData, state.columnMappings]);

  // Extract unique colleges from the data
  const extractColleges = (): CollegeInfo[] => {
    const collegeMap = new Map<string, CollegeInfo>();
    
    // Find the college column index
    const collegeFieldIndex = state.columnMappings.findIndex(
      m => m.dbField === 'collegeAttending' || m.dbField === 'matriculation'
    );
    
    if (collegeFieldIndex === -1) {
      return [];
    }

    // Process each row (skip header)
    state.rawData.slice(1).forEach((row, index) => {
      let collegeName = row[collegeFieldIndex]?.trim();
      if (!collegeName || collegeName === '' || collegeName.toLowerCase() === 'na') return;
      
      // Strip quotes from college names
      if (collegeName.startsWith('"') && collegeName.endsWith('"')) {
        collegeName = collegeName.slice(1, -1);
      }
      
      if (collegeMap.has(collegeName)) {
        const existing = collegeMap.get(collegeName)!;
        existing.count++;
        existing.rowNumbers.push(index + 1);
      } else {
        collegeMap.set(collegeName, {
          name: collegeName,
          count: 1,
          rowNumbers: [index + 1],
          isMapped: false,
          standardName: undefined
        });
      }
    });

    const colleges = Array.from(collegeMap.values());
    
    colleges.forEach(college => {
      // Check if this college has been mapped in localMappings
      const localMapping = localMappings.find(m => m.originalName === college.name);
      if (localMapping) {
        college.isMapped = true;
        college.standardName = localMapping.standardName;
        college.category = localMapping.category;
      } else {
        college.isMapped = false;
        college.standardName = undefined;
      }
    });

    return colleges.sort((a, b) => {
      // Unmapped first, then by student count
      if (a.isMapped !== b.isMapped) {
        return a.isMapped ? 1 : -1;
      }
      return b.count - a.count;
    });
  };

  // Memoize colleges computation
  const colleges = useMemo(() => {
    const result = extractColleges();
    return result;
  }, [
    state.rawData,
    state.columnMappings,
    localMappings
  ]);

  const handleRemoveMapping = (originalName: string) => {
    const updatedMappings = localMappings.filter(m => m.originalName !== originalName);
    setLocalMappings(updatedMappings);
  };

  // Simple mapping: user selects college from dropdown
  const handleMapCollege = (originalName: string, standardName: string, category: 'college' | 'work' | 'training' | 'military' | 'other') => {
    const college = colleges.find(c => c.name === originalName);
    if (!college) return;


    const newMapping: CollegeMapping = {
      originalName,
      standardName,
      category,
      isNew: false,
      affectedRows: college.rowNumbers
    };
    
    // Remove any existing mapping for this college, then add the new one
    const updatedMappings = localMappings.filter(m => m.originalName !== originalName);
    setLocalMappings([...updatedMappings, newMapping]);
    
  };

  const handleConfirmKeepOriginal = () => {
    if (pendingKeepOriginal) {
      const newMapping: CollegeMapping = {
        originalName: pendingKeepOriginal.name,
        standardName: pendingKeepOriginal.name,
        category: 'college' as const,
        isNew: true,
        affectedRows: pendingKeepOriginal.rowNumbers
      };
      const updatedMappings = [...localMappings, newMapping];
      setLocalMappings(updatedMappings);
      setShowKeepOriginalWarning(false);
      setPendingKeepOriginal(null);
    }
  };

  // Sync localMappings with parent state  
  useEffect(() => {
    updateState({ 
      collegeMappings: localMappings
    });
  }, [localMappings, updateState]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>College Name Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              Map each college to the official name from our database, or categorize as Work/Training/Other.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Simplified Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Map Colleges ({colleges.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {colleges.map((college) => (
              <SimpleMappingRow
                key={college.name}
                college={college}
                onMap={handleMapCollege}
                onRemove={handleRemoveMapping}
              />
            ))}
            
            {colleges.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No entries found in your data
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Keep Original Warning Dialog */}
      <Dialog open={showKeepOriginalWarning} onOpenChange={setShowKeepOriginalWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keep Original College Name?</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <MapPin className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>{pendingKeepOriginal?.name}</strong> is not in the official IPEDS database. 
                The original name will be preserved.
              </AlertDescription>
            </Alert>
            
            <p className="text-sm text-gray-600">
              This institution is not recognized in the U.S. Department of Education's official database. 
              You can still proceed with the import using the original name from your data.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowKeepOriginalWarning(false);
                setPendingKeepOriginal(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmKeepOriginal}
              className="bg-green-600 hover:bg-green-700"
            >
              Keep Original Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}