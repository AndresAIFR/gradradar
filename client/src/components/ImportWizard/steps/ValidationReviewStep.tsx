import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, AlertTriangle, Users, UserPlus, UserCheck, School } from 'lucide-react';
import { ImportWizardState, ParsedRow } from '../ImportWizard';
import { useQuery } from '@tanstack/react-query';
import { insertAlumniSchema } from '@shared/schema';
import { ZodError } from 'zod';

interface ValidationReviewStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  newAlumni: number;
  existingAlumni: number;
  duplicatesInFile: number;
  collegesMapped: number;
  dataExtracted: number;
}

interface ValidationError {
  field: string;
  expectedType: string;
  receivedType: string;
  sampleValue: string;
  count: number;
  canAutoFix: boolean;
}

export default function ValidationReviewStep({ state, updateState }: ValidationReviewStepProps) {
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    warningRows: 0,
    newAlumni: 0,
    existingAlumni: 0,
    duplicatesInFile: 0,
    collegesMapped: 0,
    dataExtracted: 0
  });
  const [validatedData, setValidatedData] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Fetch existing alumni to check for duplicates
  const { data: existingAlumni = [] } = useQuery({
    queryKey: ['/api/alumni'],
    queryFn: async () => {
      const response = await fetch('/api/alumni');
      if (!response.ok) throw new Error('Failed to fetch alumni');
      return response.json();
    }
  });

  useEffect(() => {
    validateData();
  }, [state.rawData, state.columnMappings, state.transformRules, existingAlumni]);

  // Helper function to apply transformations (matching DataTransformationStep logic)
  const applyTransformations = (value: string, transformType: string): any => {
    if (!value || value.trim() === '') return null;
    
    switch (transformType) {
      case 'boolean':
        const normalized = value.toLowerCase().trim();
        const trueValues = ['true', '1', 'yes', 'y'];
        const falseValues = ['false', '0', 'no', 'n', ''];
        if (trueValues.includes(normalized)) return true;
        if (falseValues.includes(normalized)) return false;
        return false;
      
      case 'number':
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) {
          return parseInt(trimmed, 10);
        }
        const parsed = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? null : parsed;
      
      case 'date':
        if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
          return value.trim();
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim())) {
          const [month, day, year] = value.trim().split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return value.trim();
      
      default:
        return value.trim() || null;
    }
  };

  // Analyze validation errors and group them for display
  const analyzeValidationErrors = (parsedRows: ParsedRow[]): ValidationError[] => {
    const errorMap = new Map<string, ValidationError>();
    
    parsedRows.forEach(row => {
      if (row._errors && row._errors.length > 0) {
        row._errors.forEach(errorMsg => {
          // Parse error message: "cohortYear: Expected number, received string"
          const match = errorMsg.match(/^([^:]+):\s*Expected\s+(\w+),\s*received\s+(\w+)/);
          if (match) {
            const [, field, expectedType, receivedType] = match;
            const key = `${field}_${expectedType}_${receivedType}`;
            
            if (errorMap.has(key)) {
              errorMap.get(key)!.count++;
            } else {
              // Get sample value for this field from the first row with this error
              const sampleValue = row[field] as string || '';
              const canAutoFix = (expectedType === 'number' && /^\d+$/.test(sampleValue)) ||
                                (expectedType === 'boolean' && ['true', 'false', '0', '1'].includes(sampleValue.toLowerCase()));
              
              errorMap.set(key, {
                field,
                expectedType,
                receivedType,
                sampleValue,
                count: 1,
                canAutoFix
              });
            }
          }
        });
      }
    });
    
    return Array.from(errorMap.values());
  };

  // Auto-fix common validation errors
  const autoFixValidationErrors = (errorToFix: ValidationError) => {
    
    
    let transformType: string;
    switch (errorToFix.expectedType) {
      case 'number':
        transformType = 'number';
        break;
      case 'boolean':
        transformType = 'boolean';
        break;
      default:
        
        return; // Can't auto-fix other types
    }
    
    // Update column mapping with transform (this is what actually applies the conversion)
    const updatedMappings = state.columnMappings.map(mapping => {
      if (mapping.dbField === errorToFix.field) {
        
        return { ...mapping, transform: transformType };
      }
      return mapping;
    });
    
    // Create a generic transform rule for this field (not value-specific)
    const newTransformRules = [...state.transformRules];
    const existingRuleIndex = newTransformRules.findIndex(rule => rule.field === errorToFix.field);
    
    const newRule = {
      field: errorToFix.field,
      type: transformType as any,
      from: `all_${errorToFix.receivedType}_values`, // Generic identifier
      to: `converted_to_${errorToFix.expectedType}` // Generic identifier
    };
    
    if (existingRuleIndex >= 0) {
      newTransformRules[existingRuleIndex] = newRule;
    } else {
      newTransformRules.push(newRule);
    }
    
    
    
    // Update state and re-validate
    updateState({
      transformRules: newTransformRules,
      columnMappings: updatedMappings
    });
  };

  const validateData = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsedRows: ParsedRow[] = [];
    
    // Create field mapping
    const fieldMap = new Map<string, number>();
    state.columnMappings.forEach((mapping, index) => {
      if (mapping.dbField) {
        fieldMap.set(mapping.dbField, index);
      }
    });

    // Check for duplicates within the file
    const seenNames = new Map<string, number[]>();
    const seenContactIds = new Map<string, number[]>();

    // Process each row
    state.rawData.slice(1).forEach((row, rowIndex) => {
      const parsedRow: ParsedRow = {
        _rowNumber: rowIndex + 1,
        _errors: [],
        _warnings: []
      };

      // Apply mappings and transformations with proper type conversion
      const transformedData: any = {};
      
      state.columnMappings.forEach((mapping, colIndex) => {
        if (mapping.dbField) {
          let rawValue = row[colIndex] || '';
          let finalValue = rawValue;
          
          // Apply transformation if needed
          if (mapping.transform) {
            
            const transformedValue = applyTransformations(rawValue, mapping.transform);
            
            finalValue = transformedValue;
          }
          
          // Set the final value - convert empty strings to null, but preserve transformed values
          const dbValue = (finalValue === '' || finalValue === null || finalValue === undefined) ? null : finalValue;
          transformedData[mapping.dbField] = dbValue;
          parsedRow[mapping.dbField] = dbValue;
        }
      });

      // Validate using the actual Zod schema that matches server-side validation
      try {
        // Remove auto-generated fields that shouldn't be validated during import
        const dataToValidate = { ...transformedData };
        delete dataToValidate.id;
        delete dataToValidate.createdAt;
        delete dataToValidate.updatedAt;
        
        // Validate against the same schema the server uses
        insertAlumniSchema.parse(dataToValidate);
        
      } catch (error) {
        if (error instanceof ZodError) {
          error.errors.forEach(zodError => {
            const fieldPath = zodError.path.join('.');
            const fieldName = fieldPath || 'unknown field';
            const errorMessage = `${fieldName}: ${zodError.message}`;
            parsedRow._errors!.push(errorMessage);
          });
        } else {
          parsedRow._errors!.push('Unexpected validation error');
        }
      }

      // Additional business logic validation
      const firstName = parsedRow.firstName as string;
      const lastName = parsedRow.lastName as string;
      const cohortYear = parsedRow.cohortYear;

      // Check for duplicates within file
      const nameKey = `${firstName?.toLowerCase()}_${lastName?.toLowerCase()}`;
      if (seenNames.has(nameKey)) {
        seenNames.get(nameKey)!.push(rowIndex + 1);
        parsedRow._warnings!.push('Duplicate name in import file');
      } else {
        seenNames.set(nameKey, [rowIndex + 1]);
      }

      const contactId = parsedRow.contactId as string;
      if (contactId) {
        if (seenContactIds.has(contactId)) {
          seenContactIds.get(contactId)!.push(rowIndex + 1);
          parsedRow._errors!.push('Duplicate contact ID in import file');
        } else {
          seenContactIds.set(contactId, [rowIndex + 1]);
        }
      }

      // Check against existing database
      const existingMatch = existingAlumni.find((alum: any) => 
        (contactId && alum.contactId === contactId) ||
        (alum.firstName?.toLowerCase() === firstName?.toLowerCase() && 
         alum.lastName?.toLowerCase() === lastName?.toLowerCase() &&
         alum.cohortYear === parseInt(cohortYear))
      );

      if (existingMatch) {
        parsedRow._warnings!.push('Alumni already exists in database');
        parsedRow._existingId = existingMatch.id;
      }

      // Validate email format
      const compSciEmail = parsedRow.compSciHighEmail as string;
      const personalEmail = parsedRow.personalEmail as string;
      
      if (compSciEmail && !isValidEmail(compSciEmail)) {
        parsedRow._warnings!.push('Invalid school email format');
      }
      if (personalEmail && !isValidEmail(personalEmail)) {
        parsedRow._warnings!.push('Invalid personal email format');
      }

      // Add AI extracted data if available
      const aiData = state.extractedData.filter(d => d.rowNumber === rowIndex + 1);
      if (aiData.length > 0) {
        parsedRow._aiExtracted = aiData;
      }

      parsedRows.push(parsedRow);
    });

    // Update validation summary
    const summary: ValidationSummary = {
      totalRows: parsedRows.length,
      validRows: parsedRows.filter(r => r._errors!.length === 0).length,
      errorRows: parsedRows.filter(r => r._errors!.length > 0).length,
      warningRows: parsedRows.filter(r => r._warnings!.length > 0).length,
      newAlumni: parsedRows.filter(r => !r._existingId && r._errors!.length === 0).length,
      existingAlumni: parsedRows.filter(r => r._existingId).length,
      duplicatesInFile: Array.from(seenNames.values()).filter(rows => rows.length > 1).length,
      collegesMapped: state.collegeMappings.length,
      dataExtracted: state.extractedData.length
    };

    // Analyze validation errors for display and auto-fixing
    const groupedErrors = analyzeValidationErrors(parsedRows);
    

    setValidationSummary(summary);
    setValidatedData(parsedRows);
    setValidationErrors(groupedErrors);
    updateState({ 
      parsedData: parsedRows,
      validationErrors: parsedRows.filter(r => r._errors!.length > 0).map(r => 
        `Row ${r._rowNumber}: ${r._errors!.join(', ')}`
      ),
      validationWarnings: parsedRows.filter(r => r._warnings!.length > 0).map(r => 
        `Row ${r._rowNumber}: ${r._warnings!.join(', ')}`
      ),
      summary: {
        totalRows: summary.totalRows,
        newRecords: summary.newAlumni,
        updates: summary.existingAlumni,
        skipped: 0,
        errors: summary.errorRows
      }
    });
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const hasErrors = validationSummary.errorRows > 0;
  const hasWarnings = validationSummary.warningRows > 0;

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : hasWarnings ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <span>Validation Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Users className="h-4 w-4" />
                <span>Total Rows</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {validationSummary.totalRows}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <UserPlus className="h-4 w-4" />
                <span>New Alumni</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {validationSummary.newAlumni}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <UserCheck className="h-4 w-4" />
                <span>Updates</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {validationSummary.existingAlumni}
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Errors</span>
              </div>
              <div className="text-2xl font-bold text-red-900 mt-1">
                {validationSummary.errorRows}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            {validationSummary.warningRows > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validationSummary.warningRows} warnings
              </Badge>
            )}
            {validationSummary.duplicatesInFile > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                {validationSummary.duplicatesInFile} duplicates in file
              </Badge>
            )}
            {validationSummary.collegesMapped > 0 && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                <School className="h-3 w-3 mr-1" />
                {validationSummary.collegesMapped} colleges mapped
              </Badge>
            )}
            {validationSummary.dataExtracted > 0 && (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                {validationSummary.dataExtracted} AI extractions
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors with Auto-Fix */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Data Validation Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-red-600">
                  Found {validationSummary.errorRows} rows with validation errors. These can be fixed automatically:
                </p>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => validationErrors.forEach(error => error.canAutoFix && autoFixValidationErrors(error))}
                >
                  Fix All Errors
                </Button>
              </div>
              
              {validationErrors.map((error, index) => (
                <div key={index} className="bg-white rounded-lg border border-red-200 p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Field: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{error.field}</code>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Expected <span className="font-medium">{error.expectedType}</span>, received <span className="font-medium">{error.receivedType}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Sample value: <code className="bg-gray-100 px-1 rounded">"{error.sampleValue}"</code> • {error.count} rows affected
                      </div>
                    </div>
                    
                    {error.canAutoFix && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => autoFixValidationErrors(error)}
                      >
                        Auto-Fix
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="bg-white rounded-lg border border-blue-200 p-3 mt-4">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Click "Auto-Fix" to automatically convert data types and resolve validation errors.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {hasWarnings && !hasErrors && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Warnings</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {state.validationWarnings.slice(0, 10).map((warning, index) => (
                <div key={index} className="text-sm">{warning}</div>
              ))}
              {state.validationWarnings.length > 10 && (
                <div className="text-sm font-medium">
                  ... and {state.validationWarnings.length - 10} more warnings
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {validatedData.slice(0, 10).map((row, index) => (
                  <tr key={index} className={row._errors!.length > 0 ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-sm text-gray-900">{row._rowNumber}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.cohortYear}</td>
                    <td className="px-3 py-2 text-sm">
                      {row._existingId ? (
                        <Badge variant="secondary" className="text-xs">Update</Badge>
                      ) : (
                        <Badge className="text-xs bg-green-600">New</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {row._errors!.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {row._errors!.length} error{row._errors!.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {row._warnings!.length > 0 && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {row._warnings!.length} warning{row._warnings!.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validatedData.length > 10 && (
              <div className="text-center py-2 text-sm text-gray-500">
                ... and {validatedData.length - 10} more rows
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}