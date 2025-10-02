import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Download, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Database,
  FileText,
  Users,
  Calendar,
  Award,
  BarChart3,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeleteDataDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AlumniStats {
  totalAlumni: number;
  totalInteractions: number;
  totalTasks: number;
  totalScholarships: number;
  totalMetrics: number;
  totalResources: number;
  totalAuditLogs: number;
}

interface DeletionResults {
  deletedAlumni: number;
  deletedInteractions: number;
  deletedTasks: number;
  deletedScholarships: number;
  deletedMetrics: number;
  deletedResources: number;
  deletedAuditLogs: number;
}

type Step = 'warning' | 'backup' | 'confirm' | 'final-check' | 'deleting' | 'complete';

export function DeleteDataDialog({ open, onClose }: DeleteDataDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('warning');
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletionResults, setDeletionResults] = useState<DeletionResults | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Load stats when dialog opens
  useEffect(() => {
    if (open && step === 'warning') {
      loadStats();
    }
  }, [open, step]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('warning');
      setStats(null);
      setConfirmationText('');
      setBackupDownloaded(false);
      setIsLoading(false);
      setDeletionResults(null);
      setStatsError(null);
    }
  }, [open]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setStatsError(null);
      const response = await apiRequest('GET', '/api/admin/alumni-stats');
      const statsData = await response.json();
      setStats(statsData);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to load data statistics due to database connection issues";
      setStatsError(errorMessage);
      toast({
        title: "Database Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackup = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/admin/export-backup');
      
      if (response.csvData) {
        // Create and download the CSV file
        const blob = new Blob([response.csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setBackupDownloaded(true);
        toast({
          title: "Backup Downloaded",
          description: `Exported ${response.recordCount} alumni records to ${response.filename}`,
        });
      } else {
        toast({
          title: "No Data",
          description: "No alumni data to export",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export backup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAllData = async () => {
    try {
      setIsLoading(true);
      setStep('deleting');
      
      const response = await apiRequest('DELETE', '/api/admin/delete-all-alumni', {
        confirmationText: 'DELETE'
      });
      
      setDeletionResults(response.deletionResults);
      setStep('complete');
      
      toast({
        title: "Data Deleted",
        description: "All alumni data has been permanently deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete data",
        variant: "destructive",
      });
      setStep('final-check'); // Go back to previous step on error
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'warning':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  This action is permanent and cannot be undone
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You are about to delete all alumni tracking data. User accounts and system settings will be preserved.
                </p>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading data statistics...</span>
              </div>
            ) : statsError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-100">
                          Cannot Load Data Statistics
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {statsError}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={loadStats}
                      variant="outline"
                      className="mx-auto"
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : stats ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data to be Deleted
                  </CardTitle>
                  <CardDescription>
                    Current database contains the following alumni-related records:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>Alumni Records:</span>
                      <Badge variant="secondary">{(stats?.totalAlumni || 0).toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span>Interactions:</span>
                      <Badge variant="secondary">{(stats?.totalInteractions || 0).toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span>Tasks:</span>
                      <Badge variant="secondary">{(stats?.totalTasks || 0).toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span>Scholarships:</span>
                      <Badge variant="secondary">{(stats?.totalScholarships || 0).toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      <span>Metrics:</span>
                      <Badge variant="secondary">{(stats?.totalMetrics || 0).toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-gray-500" />
                      <span>Audit Logs:</span>
                      <Badge variant="secondary">{(stats?.totalAuditLogs || 0).toLocaleString()}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                    <p className="text-sm font-medium">
                      Total Records: {(
                        (stats?.totalAlumni || 0) + 
                        (stats?.totalInteractions || 0) + 
                        (stats?.totalTasks || 0) + 
                        (stats?.totalScholarships || 0) + 
                        (stats?.totalMetrics || 0) + 
                        (stats?.totalResources || 0) + 
                        (stats?.totalAuditLogs || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
              <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Download Data Backup
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Before proceeding, we strongly recommend downloading a backup of all alumni data.
                </p>
              </div>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    The backup will be exported as a CSV file containing all alumni records with their complete information.
                  </p>
                  <Button
                    onClick={downloadBackup}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Backup...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Alumni Data Backup
                      </>
                    )}
                  </Button>
                  {backupDownloaded && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Backup downloaded successfully</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Confirm Data Deletion
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Type "DELETE" to confirm you want to permanently delete all alumni data.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Type "DELETE" to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-1"
                />
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>What will be deleted:</strong> All alumni records, interactions, tasks, scholarships, metrics, resources, and audit logs.
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                  <strong>What will be preserved:</strong> User accounts, system settings, and application configuration.
                </p>
              </div>
            </div>
          </div>
        );

      case 'final-check':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Final Confirmation
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  This is your last chance to cancel. Once confirmed, the data deletion will begin immediately.
                </p>
              </div>
            </div>
            
            {stats && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-900 dark:text-red-100">
                    Final Record Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-2xl font-bold text-red-600 dark:text-red-400">
                    {(
                      stats.totalAlumni + 
                      stats.totalInteractions + 
                      stats.totalTasks + 
                      stats.totalScholarships + 
                      stats.totalMetrics + 
                      stats.totalResources + 
                      stats.totalAuditLogs
                    ).toLocaleString()} records
                  </p>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                    will be permanently deleted
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'deleting':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-red-600 dark:text-red-400" />
              <h3 className="mt-4 text-lg font-semibold">Deleting Alumni Data...</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Please wait while we permanently remove all alumni records from the database.
              </p>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Do not close this window</strong> until the process completes.
                </p>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 dark:text-green-400" />
              <h3 className="mt-4 text-lg font-semibold text-green-900 dark:text-green-100">
                Data Deletion Complete
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                All alumni data has been permanently removed from the database.
              </p>
            </div>
            
            {deletionResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Deletion Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Alumni Records: <Badge variant="outline">{deletionResults.deletedAlumni}</Badge></div>
                    <div>Interactions: <Badge variant="outline">{deletionResults.deletedInteractions}</Badge></div>
                    <div>Tasks: <Badge variant="outline">{deletionResults.deletedTasks}</Badge></div>
                    <div>Scholarships: <Badge variant="outline">{deletionResults.deletedScholarships}</Badge></div>
                    <div>Metrics: <Badge variant="outline">{deletionResults.deletedMetrics}</Badge></div>
                    <div>Resources: <Badge variant="outline">{deletionResults.deletedResources}</Badge></div>
                    <div>Audit Logs: <Badge variant="outline">{deletionResults.deletedAuditLogs}</Badge></div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium">
                      Total Records Deleted: {(
                        deletionResults.deletedAlumni + 
                        deletionResults.deletedInteractions + 
                        deletionResults.deletedTasks + 
                        deletionResults.deletedScholarships + 
                        deletionResults.deletedMetrics + 
                        deletionResults.deletedResources + 
                        deletionResults.deletedAuditLogs
                      ).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'warning': return 'Delete All Alumni Data';
      case 'backup': return 'Download Backup';
      case 'confirm': return 'Confirm Deletion';
      case 'final-check': return 'Final Confirmation';
      case 'deleting': return 'Deleting Data';
      case 'complete': return 'Deletion Complete';
      default: return '';
    }
  };

  const getNextButtonText = () => {
    switch (step) {
      case 'warning': return 'Continue to Backup';
      case 'backup': return backupDownloaded ? 'Continue to Confirmation' : 'Skip Backup (Not Recommended)';
      case 'confirm': return 'Continue to Final Check';
      case 'final-check': return 'DELETE ALL DATA';
      default: return 'Next';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'warning': return stats !== null;
      case 'backup': return true; // Can skip backup
      case 'confirm': return confirmationText === 'DELETE';
      case 'final-check': return true;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'warning':
        setStep('backup');
        break;
      case 'backup':
        setStep('confirm');
        break;
      case 'confirm':
        setStep('final-check');
        break;
      case 'final-check':
        deleteAllData();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'backup':
        setStep('warning');
        break;
      case 'confirm':
        setStep('backup');
        break;
      case 'final-check':
        setStep('confirm');
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {step === 'complete' 
              ? 'The data deletion process has completed successfully.'
              : 'This action will permanently delete all alumni tracking data.'
            }
          </DialogDescription>
        </DialogHeader>

        {renderStepContent()}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step !== 'warning' && step !== 'deleting' && step !== 'complete' && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {step !== 'deleting' && (
              <Button variant="outline" onClick={onClose}>
                {step === 'complete' ? 'Close' : 'Cancel'}
              </Button>
            )}
            
            {step !== 'complete' && step !== 'deleting' && (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                variant={step === 'final-check' ? 'destructive' : 'default'}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {getNextButtonText()}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}