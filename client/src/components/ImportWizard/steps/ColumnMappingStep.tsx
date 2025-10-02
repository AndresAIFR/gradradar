import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, CheckCircle, AlertCircle, Shuffle } from 'lucide-react';
import { ImportWizardState, ColumnMapping } from '../ImportWizard';
import { Button } from '@/components/ui/button';

interface ColumnMappingStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

// Database fields that can be mapped to
const DB_FIELDS = [
  { value: 'firstName', label: 'First Name', required: true },
  { value: 'lastName', label: 'Last Name', required: true },
  { value: 'cohortYear', label: 'Cohort Year', required: true },
  { value: 'contactId', label: 'Contact ID' },
  { value: 'compSciHighEmail', label: 'School Email' },
  { value: 'personalEmail', label: 'Personal Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'matriculation', label: 'Matriculation' },
  { value: 'collegeAttending', label: 'College Attending' },
  { value: 'collegeOrWorkforce', label: 'College or Workforce' },
  { value: 'collegeMajor', label: 'Major' },
  { value: 'trackingStatus', label: 'Tracking Status' },
  { value: 'supportCategory', label: 'Support Category' },
  { value: 'connectedAsOf', label: 'Connected As Of' },
  { value: 'notes', label: 'Notes' },
  { value: 'attemptedOutreach', label: 'Attempted Outreach' },
  { value: 'circleBack', label: 'Circle Back' },
  { value: 'transcriptCollected', label: 'Transcript Collected' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'needsTutor', label: 'Needs Tutor' },
  { value: 'subjectSupport', label: 'Subject Support' },
  { value: 'grouping', label: 'Grouping' },
  { value: 'highSchoolGpa', label: 'High School GPA' },
  { value: 'collegeGpa', label: 'College GPA' },
  { value: 'employerName', label: 'Employer Name' },
  { value: 'latestAnnualIncome', label: 'Annual Income' },
  { value: 'trainingProgramName', label: 'Training Program' },
  { value: 'dropoutDate', label: 'Dropout Date' }
];

// Auto-mapping rules
const AUTO_MAPPING_RULES: { [key: string]: string } = {
  // Basic info mappings
  'contactid': 'contactId',
  'contact id': 'contactId',
  'osis': 'contactId',
  'first name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'cohort year': 'cohortYear',
  'cohortyear': 'cohortYear',
  'year': 'cohortYear',
  'class': 'cohortYear',
  
  // Contact info
  'phone number': 'phone',
  'phone': 'phone',
  'mobilenumber': 'phone',
  'mobile': 'phone',
  'email': 'compSciHighEmail',
  'comp sci high email': 'compSciHighEmail',
  'school email': 'compSciHighEmail',
  'personal email': 'personalEmail',
  
  // Academic/Career - College/School Names (go to collegeAttending field for processing)
  'matriculation': 'collegeAttending',  // 2022 cohort format - FIXED: map to collegeAttending for proper processing
  'college attending': 'collegeAttending',  // Common variation
  'college name': 'collegeAttending',  // Another variation
  'school': 'collegeAttending',  // Short form
  'institution': 'collegeAttending',  // Formal version
  'university': 'collegeAttending',  // Higher ed specific
  
  // College/Workforce Type (generic categories)
  'college or workforce': 'collegeOrWorkforce',  // 2022 cohort format
  'college/workforce': 'collegeOrWorkforce',  // Slash variation
  'path type': 'collegeOrWorkforce',  // Alternative naming
  'path': 'collegeOrWorkforce',  // Short form
  'type': 'collegeOrWorkforce',  // Very short form
  
  // Major/Subject
  'major': 'collegeMajor',
  'college major': 'collegeMajor',
  'field of study': 'collegeMajor',  // Academic variation
  'subject': 'collegeMajor',  // Short form
  'degree': 'collegeMajor',  // Another variation
  
  // Tracking Status
  'track': 'trackingStatus',  // 2022 cohort format
  'tracking status': 'trackingStatus',
  'status': 'trackingStatus',  // Short form
  'current status': 'trackingStatus',  // Descriptive version
  'progress': 'trackingStatus',  // Alternative naming
  
  // Support/Grouping
  'support category': 'supportCategory',
  'grouping': 'supportCategory',  // 2022 cohort format
  'group': 'supportCategory',  // Short form
  'category': 'supportCategory',  // Generic term
  'needs level': 'supportCategory',  // Descriptive version
  
  // Backwards compatibility
  'college': 'collegeAttending',  // Legacy mapping
  
  // Other fields
  'notes': 'notes',
  'connected as of': 'connectedAsOf',
  'connected as of 4/30': 'connectedAsOf',
  'attempted outreach': 'attemptedOutreach',
  'last attempted outreach': 'attemptedOutreach',
  'circle back': 'circleBack',
  'transcript collected': 'transcriptCollected',
  'transcript': 'transcript',
  'needs tutor': 'needsTutor',
  'subject support': 'subjectSupport',
  'employer name': 'employerName',
  'employer': 'employerName',
  'annual income': 'latestAnnualIncome',
  'latest annual income': 'latestAnnualIncome',
  'income': 'latestAnnualIncome',
  
  // Note fields for dual note import
  'note 1': 'note1Content',
  'note 1 connected': 'note1Connected', 
  'note 1 meet 1:1': 'note1InPerson',
  'note 2': 'note2Content'
};

export default function ColumnMappingStep({ state, updateState }: ColumnMappingStepProps) {
  const [localMappings, setLocalMappings] = useState<ColumnMapping[]>([]);
  const [savedMappingName, setSavedMappingName] = useState<string>('');

  useEffect(() => {
    // Initialize mappings if not already done
    if (state.columnMappings.length === 0 && state.headers.length > 0) {
      const initialMappings = autoMapColumns(state.headers);
      setLocalMappings(initialMappings);
      updateState({ columnMappings: initialMappings });
    } else {
      setLocalMappings(state.columnMappings);
    }
  }, [state.headers]);

  const autoMapColumns = (headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
      const normalized = header.toLowerCase().trim();
      const dbField = AUTO_MAPPING_RULES[normalized] || null;
      
      return {
        csvHeader: header,
        dbField,
        transform: dbField ? getDefaultTransform(dbField) : undefined
      };
    });
  };

  const getDefaultTransform = (dbField: string): string | undefined => {
    switch (dbField) {
      case 'phone':
        return 'phone';
      case 'connectedAsOf':
      case 'attemptedOutreach':
      case 'dropoutDate':
        return 'date';
      case 'circleBack':
      case 'transcriptCollected':
      case 'needsTutor':
        return 'boolean';
      case 'trackingStatus':
        return 'status';
      case 'supportCategory':
        return 'support';
      default:
        return undefined;
    }
  };

  const handleMappingChange = (csvHeader: string, dbField: string | null) => {
    const updatedMappings = localMappings.map(mapping => {
      if (mapping.csvHeader === csvHeader) {
        return {
          ...mapping,
          dbField,
          transform: dbField ? getDefaultTransform(dbField) : undefined
        };
      }
      return mapping;
    });
    
    setLocalMappings(updatedMappings);
    updateState({ columnMappings: updatedMappings });
  };

  const getMappedFields = () => {
    return localMappings
      .filter(m => m.dbField !== null)
      .map(m => m.dbField);
  };

  const getUnmappedRequiredFields = () => {
    const mappedFields = getMappedFields();
    return DB_FIELDS
      .filter(field => field.required && !mappedFields.includes(field.value))
      .map(field => field.label);
  };

  const saveMappingTemplate = () => {
    if (!savedMappingName) return;
    
    // Save to localStorage for now
    const savedMappings = JSON.parse(localStorage.getItem('alumniImportMappings') || '{}');
    savedMappings[savedMappingName] = localMappings;
    localStorage.setItem('alumniImportMappings', JSON.stringify(savedMappings));
    
    setSavedMappingName('');
    // Show success message
  };

  const loadMappingTemplate = (templateName: string) => {
    const savedMappings = JSON.parse(localStorage.getItem('alumniImportMappings') || '{}');
    if (savedMappings[templateName]) {
      const template = savedMappings[templateName];
      // Apply template to current headers
      const appliedMappings = state.headers.map(header => {
        const templateMapping = template.find((t: ColumnMapping) => t.csvHeader === header);
        if (templateMapping) {
          return templateMapping;
        }
        return {
          csvHeader: header,
          dbField: null,
          transform: undefined
        };
      });
      
      setLocalMappings(appliedMappings);
      updateState({ columnMappings: appliedMappings });
    }
  };

  const unmappedRequired = getUnmappedRequiredFields();
  const mappedCount = getMappedFields().length;
  const unmappedCount = state.headers.length - mappedCount;

  return (
    <div className="space-y-6">
      {/* Mapping Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Column Mapping</span>
            <div className="flex gap-2">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {mappedCount} Mapped
              </Badge>
              {unmappedCount > 0 && (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {unmappedCount} Unmapped
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unmappedRequired.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Required fields not mapped: {unmappedRequired.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const autoMapped = autoMapColumns(state.headers);
                  setLocalMappings(autoMapped);
                  updateState({ columnMappings: autoMapped });
                }}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Auto-Map All
              </Button>
            </div>

            {/* Mapping Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CSV Column
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <ArrowRight className="h-4 w-4 inline" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Database Field
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Transform
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sample Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localMappings.map((mapping, index) => {
                    const sampleData = state.rawData[1]?.[index] || '';
                    return (
                      <tr key={mapping.csvHeader}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {mapping.csvHeader}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ArrowRight className="h-4 w-4 text-gray-400 inline" />
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={mapping.dbField || 'unmapped'}
                            onValueChange={(value) => 
                              handleMappingChange(mapping.csvHeader, value === 'unmapped' ? null : value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">
                                <span className="text-gray-500">-- Not Mapped --</span>
                              </SelectItem>
                              {DB_FIELDS.map(field => (
                                <SelectItem 
                                  key={field.value} 
                                  value={field.value}
                                  disabled={
                                    getMappedFields().includes(field.value) && 
                                    mapping.dbField !== field.value
                                  }
                                >
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {mapping.transform && (
                            <Badge variant="outline" className="text-xs">
                              {mapping.transform}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {sampleData}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}