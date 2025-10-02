import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Send, 
  Settings, 
  BarChart3, 
  Calendar, 
  Mail, 
  X,
  ChevronUp,
  TrendingUp,
  Users,
  Target
} from "lucide-react";

interface FloatingReportsPanelProps {
  data: any[];
}

export function FloatingReportsPanel({ data }: FloatingReportsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Quick export functions
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you'd call the actual export API
      
      // Create download link for demo
      const blob = new Blob([`Analytics Export - ${format.toUpperCase()}\nGenerated: ${new Date().toISOString()}\nTotal Alumni: ${data.length}`], 
        { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Quick report templates
  const reportTemplates = [
    {
      id: "executive",
      name: "Executive Summary",
      description: "High-level KPIs and strategic insights",
      icon: TrendingUp,
      format: "pdf"
    },
    {
      id: "outreach",
      name: "Outreach Report",
      description: "Alumni needing follow-up",
      icon: Users,
      format: "excel"
    },
    {
      id: "grant",
      name: "Grant Report",
      description: "Comprehensive funding data",
      icon: Target,
      format: "pdf"
    }
  ];

  return (
    <>
      {/* Floating Action Button - TEMPORARILY HIDDEN */}
      {false && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsExpanded(true)}
            size="lg"
            className="rounded-full h-14 w-14 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <BarChart3 className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="fixed bottom-6 right-6 w-96 max-h-[80vh] overflow-hidden">
            <Card className="shadow-2xl border-0">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Reports & Export</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Quick Exports */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Quick Export Current View
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      disabled={isExporting}
                      className="flex flex-col items-center p-3 h-auto"
                    >
                      <FileText className="h-4 w-4 mb-1" />
                      <span className="text-xs">CSV</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel')}
                      disabled={isExporting}
                      className="flex flex-col items-center p-3 h-auto"
                    >
                      <Download className="h-4 w-4 mb-1" />
                      <span className="text-xs">Excel</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      disabled={isExporting}
                      className="flex flex-col items-center p-3 h-auto"
                    >
                      <FileText className="h-4 w-4 mb-1" />
                      <span className="text-xs">PDF</span>
                    </Button>
                  </div>
                </div>

                {/* Report Templates */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Generate Report
                  </Label>
                  <div className="space-y-2">
                    {reportTemplates.map((template) => (
                      <Button
                        key={template.id}
                        variant="ghost"
                        className="w-full justify-start p-3 h-auto"
                        onClick={() => handleExport(template.format as 'csv' | 'excel' | 'pdf')}
                        disabled={isExporting}
                      >
                        <template.icon className="h-4 w-4 mr-3 text-blue-600" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {template.format.toUpperCase()}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Current Data Summary
                  </Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Total Alumni:</span>
                      <span className="font-medium ml-1">{data.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Employed:</span>
                      <span className="font-medium ml-1">
                        {data.filter(a => a.employed === true).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">On Track:</span>
                      <span className="font-medium ml-1">
                        {data.filter(a => a.trackingStatus === 'on-track').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Enrolled:</span>
                      <span className="font-medium ml-1">
                        {data.filter(a => a.currentlyEnrolled === true).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Reports
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Advanced Reporting Options</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                      <Tabs defaultValue="automated" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="automated">Automated Reports</TabsTrigger>
                          <TabsTrigger value="custom">Custom Export</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="automated" className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">Monthly Executive Summary</div>
                                <div className="text-sm text-gray-500">High-level KPIs via email</div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">Weekly Outreach Report</div>
                                <div className="text-sm text-gray-500">Alumni needing follow-up</div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">Quarterly Grant Report</div>
                                <div className="text-sm text-gray-500">Comprehensive funding data</div>
                              </div>
                              <Switch />
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="custom" className="space-y-4">
                          <div className="text-sm text-gray-600">
                            Advanced filtering and custom report generation coming soon.
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}