import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Brain, Sparkles, GraduationCap, AlertTriangle, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { ImportWizardState, ExtractedData } from '../ImportWizard';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface AIAnalysisStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

interface AIAnalysisResult {
  rowNumber: number;
  studentName: string;
  extractedData: ExtractedData[];
  suggestedDropoutDate?: string;
  suggestedSupportLevel?: string;
  actionItems: string[];
}

export default function AIAnalysisStep({ state, updateState }: AIAnalysisStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResult[]>([]);
  const { toast } = useToast();

  // Check if OpenAI key is available
  const { data: secrets } = useQuery<{ hasKey: boolean }>({
    queryKey: ['/api/check-secrets', ['OPENAI_API_KEY']],
    queryFn: async () => {
      const response = await fetch('/api/check-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_keys: ['OPENAI_API_KEY'] })
      });
      if (!response.ok) throw new Error('Failed to check secrets');
      const result = await response.json();
      return { hasKey: result.OPENAI_API_KEY || false };
    }
  });

  const findNotesColumn = () => {
    return state.columnMappings.findIndex(m => m.dbField === 'notes');
  };

  const analyzeNotes = async () => {
    const notesColIndex = findNotesColumn();
    if (notesColIndex === -1) {
      toast({
        title: "No notes column found",
        description: "AI analysis requires a notes column to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    
    try {
      const results: AIAnalysisResult[] = [];
      const rowsWithNotes = state.rawData.slice(1).filter((row, index) => {
        const notes = row[notesColIndex];
        return notes && notes.trim() !== '';
      });

      const totalRows = rowsWithNotes.length;
      const batchSize = 5; // Process 5 rows at a time
      
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = rowsWithNotes.slice(i, i + batchSize);
        
        // Prepare batch for API
        const batchData = batch.map((row, batchIndex) => {
          const rowIndex = state.rawData.indexOf(row);
          const firstNameCol = state.columnMappings.findIndex(m => m.dbField === 'firstName');
          const lastNameCol = state.columnMappings.findIndex(m => m.dbField === 'lastName');
          
          return {
            rowNumber: rowIndex,
            studentName: `${row[firstNameCol] || ''} ${row[lastNameCol] || ''}`.trim(),
            notes: row[notesColIndex]
          };
        });

        // Call AI API
        const response = await fetch('/api/ai/analyze-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: batchData })
        });

        if (!response.ok) {
          throw new Error('AI analysis failed');
        }

        const batchResults = await response.json();
        results.push(...batchResults);
        
        // Update progress
        setProgress(Math.min(95, ((i + batchSize) / totalRows) * 100));
      }

      // Convert results to ExtractedData format
      const extractedData: ExtractedData[] = [];
      results.forEach(result => {
        result.extractedData.forEach(data => {
          extractedData.push(data);
        });
      });

      setAnalysisResults(results);
      updateState({ extractedData });
      setProgress(100);
      
      toast({
        title: "AI analysis complete",
        description: `Analyzed ${results.length} student records`
      });
    } catch (error) {
      
      toast({
        title: "Analysis failed",
        description: "Unable to complete AI analysis. You can continue without it.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gpa':
        return <GraduationCap className="h-4 w-4" />;
      case 'support_need':
        return <AlertTriangle className="h-4 w-4" />;
      case 'dropout_indicator':
        return <Calendar className="h-4 w-4" />;
      case 'action_item':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gpa':
        return 'bg-blue-100 text-blue-800';
      case 'support_need':
        return 'bg-amber-100 text-amber-800';
      case 'dropout_indicator':
        return 'bg-red-100 text-red-800';
      case 'action_item':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const notesColumnExists = findNotesColumn() !== -1;
  const hasOpenAIKey = secrets?.hasKey || false;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Use AI to extract structured information from unstructured notes. 
              This can help identify GPAs, support needs, dropout indicators, and action items automatically.
            </AlertDescription>
          </Alert>

          {!notesColumnExists && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No notes column found. AI analysis requires a notes column to analyze.
              </AlertDescription>
            </Alert>
          )}

          {notesColumnExists && !hasOpenAIKey && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                OpenAI API key not configured. Please contact an administrator to enable AI analysis.
              </AlertDescription>
            </Alert>
          )}

          {notesColumnExists && hasOpenAIKey && !isAnalyzing && analysisResults.length === 0 && (
            <div className="mt-4">
              <Button
                onClick={analyzeNotes}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                Start AI Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                <span className="font-medium">Analyzing notes with AI...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-600">
                This may take a few minutes depending on the amount of data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <GraduationCap className="h-4 w-4" />
                    <span>GPAs Found</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {state.extractedData.filter(d => d.category === 'gpa').length}
                  </div>
                </div>
                
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-700 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Support Needs</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-900 mt-1">
                    {state.extractedData.filter(d => d.category === 'support_need').length}
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <Calendar className="h-4 w-4" />
                    <span>Dropout Indicators</span>
                  </div>
                  <div className="text-2xl font-bold text-red-900 mt-1">
                    {state.extractedData.filter(d => d.category === 'dropout_indicator').length}
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-700 font-medium">
                    <DollarSign className="h-4 w-4" />
                    <span>Action Items</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {state.extractedData.filter(d => d.category === 'action_item').length}
                  </div>
                </div>
              </div>

              {/* Sample Extractions */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Sample Extractions</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analysisResults.slice(0, 10).map((result, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{result.studentName}</span>
                        <Badge variant="secondary" className="text-xs">
                          Row {result.rowNumber}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.extractedData.map((data, dataIndex) => (
                          <Badge
                            key={dataIndex}
                            className={`text-xs ${getCategoryColor(data.category)}`}
                          >
                            {getCategoryIcon(data.category)}
                            <span className="ml-1">{data.extractedValue}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Option */}
      {!isAnalyzing && analysisResults.length === 0 && (
        <div className="text-center text-sm text-gray-600">
          AI analysis is optional. You can proceed without it if needed.
        </div>
      )}
    </div>
  );
}