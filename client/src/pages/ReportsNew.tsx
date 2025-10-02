import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Eye, 
  Clock,
  Filter,
  SortAsc,
  Columns
} from "lucide-react";
import { ReportBuilder } from "@/components/Reports/ReportBuilder";
import { format } from "date-fns";

interface SavedReport {
  id: string;
  name: string;
  description: string;
  columns: string[];
  filters: any[];
  sortRules: any[];
  groupBy?: string;
  showTotals: boolean;
  createdAt: string;
  lastRun?: string;
  createdBy: string;
}

export default function ReportsNew() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");


  const queryClient = useQueryClient();

  // Fetch saved reports
  const { data: reports = [], isLoading } = useQuery<SavedReport[]>({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const response = await fetch("/api/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  // Save report mutation
  const saveReportMutation = useMutation({
    mutationFn: async (reportConfig: any) => {
      console.log('MUTATION - saveReportMutation called with:', reportConfig);
      console.log('MUTATION - Making POST request to /api/reports');
      
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportConfig),
      });
      
      console.log('MUTATION - Response received:', response);
      console.log('MUTATION - Response status:', response.status);
      console.log('MUTATION - Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('MUTATION - Error response text:', errorText);
        throw new Error(`Failed to save report: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('MUTATION - Success response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('MUTATION - onSuccess called with:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setShowBuilder(false);
      setEditingReport(null);
    },
    onError: (error) => {
      console.log('MUTATION - onError called with:', error);
    },
  });

  // Update report mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ id, ...reportConfig }: any) => {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportConfig),
      });
      if (!response.ok) throw new Error("Failed to update report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setShowBuilder(false);
      setEditingReport(null);
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete report");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });

  const handleSaveReport = (config: any) => {
    console.log('HANDLE SAVE REPORT - Function called with config:', config);
    console.log('HANDLE SAVE REPORT - editingReport:', editingReport);
    
    if (editingReport) {
      console.log('HANDLE SAVE REPORT - Updating existing report');
      updateReportMutation.mutate({ id: editingReport.id, ...config });
    } else {
      console.log('HANDLE SAVE REPORT - Creating new report');
      console.log('HANDLE SAVE REPORT - About to call saveReportMutation.mutate');
      saveReportMutation.mutate(config);
    }
  };

  const handleEditReport = (report: SavedReport) => {
    setEditingReport(report);
    setShowBuilder(true);
  };

  const handleDeleteReport = (id: string) => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteReportMutation.mutate(id);
    }
  };

  const handleRunReport = (report: SavedReport) => {
    console.log('RUN REPORT - Button clicked for report:', report);
    console.log('RUN REPORT - Report ID:', report.id);
    
    // Generate and download the report
    const queryParams = new URLSearchParams({
      reportId: report.id,
      format: 'csv'
    });
    const exportUrl = `/api/reports/${report.id}/export?${queryParams}`;
    console.log('RUN REPORT - Opening URL:', exportUrl);
    
    window.open(exportUrl, '_blank');
  };

  const handlePreviewReport = (report: SavedReport) => {
    console.log('PREVIEW REPORT - Button clicked for report:', report);
    console.log('PREVIEW REPORT - Report ID:', report.id);
    
    const previewUrl = `/reports/${report.id}/preview`;
    console.log('PREVIEW REPORT - Opening URL:', previewUrl);
    
    // Open preview modal or navigate to preview page
    window.open(previewUrl, '_blank');
  };

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFilterSummary = (filters: any[]) => {
    if (filters.length === 0) return "No filters";
    if (filters.length === 1) return `1 filter applied`;
    return `${filters.length} filters applied`;
  };

  const formatColumnSummary = (columns: string[]) => {
    if (columns.length <= 3) return columns.join(", ");
    return `${columns.slice(0, 3).join(", ")} +${columns.length - 3} more`;
  };



  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-gray-600">Create, save, and run custom alumni reports</p>
          </div>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredReports.length} of {reports.length} reports
        </div>
      </div>

      {/* Reports List - Always show */}
      <>

        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-6">
                  {searchTerm ? "No reports found" : "No reports created yet"}
                </h3>
                {!searchTerm && !showBuilder && (
                  <Button onClick={() => setShowBuilder(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Report
                  </Button>
                )}
                {!searchTerm && showBuilder && (
                  <p className="text-gray-500">Choose a report type below to get started</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{report.name}</CardTitle>
                    {report.description && (
                      <p className="text-sm text-gray-600">{report.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditReport(report)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Report Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Columns className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{report.columns.length} columns</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Filter className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{formatFilterSummary(report.filters)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <SortAsc className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{report.sortRules.length} sort rules</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">
                        {report.lastRun 
                          ? `Run ${format(new Date(report.lastRun), 'MMM d')}`
                          : "Never run"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Column Preview */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Columns:</p>
                    <p className="text-xs text-gray-700 truncate">
                      {formatColumnSummary(report.columns)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleRunReport(report)}
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Run & Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewReport(report)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create New Report button below existing reports */}
        {!showBuilder && (
          <Card className="border-dashed border-2">
            <CardContent className="text-center py-8">
              <Button onClick={() => setShowBuilder(true)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create New Report
              </Button>
            </CardContent>
          </Card>
        )}
      </>
    )}
  </>

      {/* Report Builder - Inline */}

      {showBuilder && (
        <div className="mt-8">
          <div className="mb-6 flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowBuilder(false);
                setEditingReport(null);
              }}
            >
              Cancel
            </Button>
          </div>
          
          <ReportBuilder
            onSaveReport={handleSaveReport}
            initialConfig={editingReport ? {
              name: editingReport.name,
              description: editingReport.description,
              columns: editingReport.columns,
              filters: editingReport.filters,
              sortRules: editingReport.sortRules,
              groupBy: editingReport.groupBy,
              showTotals: editingReport.showTotals,
            } : undefined}
            mode={editingReport ? 'edit' : 'create'}
          />
        </div>
      )}

    </div>
  );
}