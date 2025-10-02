import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Import wizard steps
import FileUploadStep from './steps/FileUploadStep';
import ColumnMappingStep from './steps/ColumnMappingStep';
import CollegeResolutionStep from './steps/CollegeResolutionStepSimple';
import DataTransformationStep from './steps/DataTransformationStep';
import ValidationReviewStep from './steps/ValidationReviewStep';
import ImportConfirmationStep from './steps/ImportConfirmationStep';

export interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export interface ParsedRow {
  [key: string]: any;
  _errors?: string[];
  _warnings?: string[];
  _rowNumber?: number;
}

export interface ColumnMapping {
  csvHeader: string;
  dbField: string | null;
  transform?: string;
}

export interface CollegeMapping {
  originalName: string;
  editedName?: string; // User can edit the original name
  standardName: string;
  category: 'college' | 'work' | 'training' | 'military' | 'other';
  isNew?: boolean;
  affectedRows: number[];
  latitude?: number;
  longitude?: number;
}

export interface TransformRule {
  field: string;
  type: 'phone' | 'date' | 'boolean' | 'status' | 'support' | 'custom';
  from: string;
  to: string;
}

export interface ExtractedData {
  rowNumber: number;
  field: string;
  extractedValue: any;
  confidence: number;
  category: 'gpa' | 'support_need' | 'action_item' | 'dropout_indicator' | 'other';
}

export interface InteractionNote {
  type: 'phone' | 'in-person' | 'email' | 'other';
  date: string;
  content: string;
  followUp: boolean;
}

export interface ImportWizardState {
  currentStep: number;
  file: File | null;
  rawData: string[][];
  headers: string[];
  parsedData: ParsedRow[];
  columnMappings: ColumnMapping[];
  collegeMappings: CollegeMapping[];
  flaggedEntries: string[];
  transformRules: TransformRule[];
  extractedData: ExtractedData[];
  interactionNotes: Map<number, InteractionNote[]>;
  dropoutDetections?: Array<{
    alumniName: string;
    dropoutDate: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    rowNumber: number;
  }>;
  validationErrors: string[];
  validationWarnings: string[];
  importStrategy: 'skip' | 'update';
  summary: {
    totalRows: number;
    newRecords: number;
    updates: number;
    skipped: number;
    errors: number;
  };
  editedNames?: { [key: string]: string };
}

const WIZARD_STEPS = [
  { id: 1, name: 'Upload File', description: 'Select and preview your CSV file' },
  { id: 2, name: 'Map Columns', description: 'Match CSV columns to database fields' },
  { id: 3, name: 'Resolve Colleges', description: 'Map college variations to standard names' },
  { id: 4, name: 'Transform Data', description: 'Preview and adjust data transformations' },
  // { id: 5, name: 'AI Analysis', description: 'Extract insights from unstructured data' }, // COMMENTED OUT - AI Analysis removed
  { id: 5, name: 'Review & Validate', description: 'Final validation and corrections' },
  { id: 6, name: 'Import', description: 'Confirm and execute import' }
];

export default function ImportWizard({ open, onOpenChange, onImportSuccess }: ImportWizardProps) {
  
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<ImportWizardState>({
    currentStep: 1,
    file: null,
    rawData: [],
    headers: [],
    parsedData: [],
    columnMappings: [],
    collegeMappings: [],
    flaggedEntries: [],
    transformRules: [],
    extractedData: [],
    interactionNotes: new Map(),
    dropoutDetections: [],
    validationErrors: [],
    validationWarnings: [],
    importStrategy: 'skip',
    summary: {
      totalRows: 0,
      newRecords: 0,
      updates: 0,
      skipped: 0,
      errors: 0
    }
  });

  const updateState = useCallback((updates: Partial<ImportWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback(() => {
    switch (state.currentStep) {
      case 1:
        return state.file !== null && state.headers.length > 0;
      case 2:
        // At least firstName, lastName, and cohortYear must be mapped
        const requiredMappings = ['firstName', 'lastName', 'cohortYear'];
        return requiredMappings.every(field => 
          state.columnMappings.some(mapping => mapping.dbField === field)
        );
      case 3:
        // College resolution - ensure all entries are mapped
        const collegeFieldIndex = state.columnMappings.findIndex(
          m => m.dbField === 'collegeAttending' || m.dbField === 'matriculation'
        );
        
        if (collegeFieldIndex === -1) return true; // No college data to map
        
        // Extract unique college entries from data
        const collegeEntries = new Set<string>();
        state.rawData.slice(1).forEach(row => {
          const collegeName = row[collegeFieldIndex]?.trim();
          if (collegeName && collegeName !== '' && collegeName.toLowerCase() !== 'na') {
            collegeEntries.add(collegeName);
          }
        });
        
        // Check if all entries have mappings
        const allMapped = Array.from(collegeEntries).every(entry => 
          state.collegeMappings.some(mapping => mapping.originalName === entry)
        );
        
        console.log('🚦 COLLEGE RESOLUTION VALIDATION:', {
          totalEntries: collegeEntries.size,
          mappedEntries: state.collegeMappings.length,
          allMapped,
          unmappedEntries: Array.from(collegeEntries).filter(entry => 
            !state.collegeMappings.some(mapping => mapping.originalName === entry)
          )
        });
        
        return allMapped;
      case 4:
        return state.transformRules.length >= 0; // Can be empty
      case 5:
        return state.validationErrors.length === 0; // Review & Validate (formerly step 6)
      case 6:
        return true; // Import (formerly step 7)
      default:
        return false;
    }
  }, [state]);

  const handleNext = () => {
    if (canProceed()) {
      setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, WIZARD_STEPS.length) }));
    }
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) }));
  };

  const handleClose = () => {
    if (state.currentStep > 1 && state.currentStep < WIZARD_STEPS.length) {
      if (window.confirm('Are you sure you want to cancel the import? All progress will be lost.')) {
        onOpenChange(false);
        // Reset state
        setState({
          currentStep: 1,
          file: null,
          rawData: [],
          headers: [],
          parsedData: [],
          columnMappings: [],
          collegeMappings: [],
          flaggedEntries: [],
          transformRules: [],
          extractedData: [],
          interactionNotes: new Map(),
          dropoutDetections: [],
          validationErrors: [],
          validationWarnings: [],
          importStrategy: 'skip',
          summary: {
            totalRows: 0,
            newRecords: 0,
            updates: 0,
            skipped: 0,
            errors: 0
          }
        });
      }
    } else {
      onOpenChange(false);
    }
  };

  const renderStep = () => {
    
    switch (state.currentStep) {
      case 1:
        return <FileUploadStep state={state} updateState={updateState} />;
      case 2:
        return <ColumnMappingStep state={state} updateState={updateState} />;
      case 3:
        return <CollegeResolutionStep state={state} updateState={updateState} />;
      case 4:
        return <DataTransformationStep state={state} updateState={updateState} />;
      // case 5: AI Analysis step removed
      case 5:
        return <ValidationReviewStep state={state} updateState={updateState} />;
      case 6:
        return (
          <ImportConfirmationStep 
            state={state} 
            updateState={updateState}
            onImportSuccess={() => {
              onImportSuccess();
              handleClose();
            }}
          />
        );
      default:
        return null;
    }
  };

  const progressPercentage = ((state.currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-green-600" />
            <span>Import Alumni Data</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Import alumni data from CSV files with intelligent column mapping and data transformation
          </DialogDescription>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between mt-2">
              {WIZARD_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`text-xs ${
                    step.id === state.currentStep
                      ? 'text-green-600 font-medium'
                      : step.id < state.currentStep
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {step.id < state.currentStep && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                    <span className="hidden sm:inline">{step.name}</span>
                    <span className="sm:hidden">{step.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Step {state.currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[state.currentStep - 1].description}
          </div>
          
          <div className="flex gap-2">
            {state.currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={state.currentStep === 7 && state.summary.totalRows > 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {state.currentStep < WIZARD_STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-green-600 hover:bg-green-700"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}