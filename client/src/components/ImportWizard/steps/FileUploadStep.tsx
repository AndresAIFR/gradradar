import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { ImportWizardState } from '../ImportWizard';

interface FileUploadStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

export default function FileUploadStep({ state, updateState }: FileUploadStepProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  
  const handleFileSelect = useCallback((file: File) => {

    if (!file.name.endsWith('.csv')) {
      updateState({
        validationErrors: ['Please upload a CSV file'],
        file: null
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        updateState({
          validationErrors: ['CSV file must contain at least a header row and one data row'],
          file: null
        });
        return;
      }

      // Parse CSV with proper quote handling
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i += 2;
            } else {
              inQuotes = !inQuotes;
              i++;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
            i++;
          } else {
            current += char;
            i++;
          }
        }

        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '')).filter(h => h.length > 0);
      const rawData: string[][] = [headers];
      
      // Parse first 10 rows for preview
      const previewRows = Math.min(lines.length - 1, 10);
      for (let i = 1; i <= previewRows; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.some(cell => cell.trim() !== '')) {
          rawData.push(row);
        }
      }

      // Parse all data
      const allData: string[][] = [headers];
      const contactIdIndex = headers.findIndex(h => h.toLowerCase().includes('contactid'));
      
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        // Skip empty rows and rows without ContactId (summary/count rows)
        if (row.some(cell => cell.trim() !== '')) {
          // Only include rows that have a ContactId value
          if (contactIdIndex === -1 || (contactIdIndex >= 0 && row[contactIdIndex]?.trim())) {
            allData.push(row);
          }
        }
      }

      updateState({
        file,
        headers,
        rawData: allData,
        validationErrors: [],
        summary: {
          ...state.summary,
          totalRows: allData.length - 1 // Exclude header
        }
      });
    };

    reader.readAsText(file);
  }, [updateState, state.summary]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const downloadTemplate = () => {
    const headers = [
      'ContactId', 'First Name', 'Last Name', 'Cohort Year', 'Phone Number', 'Email',
      'Matriculation', 'College or Workforce', 'Major', 'Track', 'Connected as of',
      'Notes', 'Attempted Outreach', 'Circle Back', 'Transcript Collected', 
      'Needs Tutor', 'Subject Support', 'Grouping'
    ];

    const sampleData = [
      headers.join(','),
      '12345,John,Doe,2024,(555) 123-4567,john.doe@email.com,Fall 2024,City College,Computer Science,On Track,Yes,Doing well in classes,4/15/24,No,Yes,No,Math,Low Needs',
      '12346,Jane,Smith,2023,(555) 987-6543,jane.smith@email.com,Fall 2023,Working,N/A,Off Track,No,Stopped responding to outreach,5/1/24,Yes,No,Yes,Writing,High Needs'
    ];

    const blob = new Blob([sampleData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alumni_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => document.getElementById('file-upload')?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              Click to upload or drag and drop your CSV file here
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Maximum file size: 10MB
            </p>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {state.file && (
            <Alert className="bg-green-50 border-green-200">
              <FileText className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <span className="font-medium text-green-800">{state.file.name}</span>
                <span className="text-green-700"> ({(state.file.size / 1024).toFixed(1)} KB)</span>
              </AlertDescription>
            </Alert>
          )}

          {state.validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {state.validationErrors[0]}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            
            {state.file && (
              <span className="text-sm text-gray-600">
                {state.summary.totalRows} rows detected
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      {state.rawData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {state.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.rawData.slice(1, 6).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-2 whitespace-nowrap text-sm text-gray-900"
                        >
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {state.rawData.length > 6 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  ... and {state.rawData.length - 6} more rows
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}