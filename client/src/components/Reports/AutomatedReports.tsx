import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Mail, FileText, Users, TrendingUp, Settings, Download, Send } from "lucide-react";

interface AutomatedReportsProps {
  data: any[];
}

export function AutomatedReports({ data }: AutomatedReportsProps) {
  const [reportSchedules, setReportSchedules] = useState([
    {
      id: 1,
      name: "Monthly Executive Summary",
      type: "executive",
      frequency: "monthly",
      recipients: ["director@example.com", "board@example.com"],
      enabled: true,
      lastSent: "2024-07-01",
      nextSend: "2024-08-01"
    },
    {
      id: 2,
      name: "Weekly Outreach Report",
      type: "outreach",
      frequency: "weekly",
      recipients: ["outreach@example.com"],
      enabled: true,
      lastSent: "2024-07-25",
      nextSend: "2024-08-01"
    },
    {
      id: 3,
      name: "Quarterly Grant Report",
      type: "grant",
      frequency: "quarterly",
      recipients: ["grants@example.com", "finance@example.com"],
      enabled: false,
      lastSent: "2024-04-01",
      nextSend: "2024-10-01"
    }
  ]);

  const [newReport, setNewReport] = useState({
    name: "",
    type: "executive",
    frequency: "monthly",
    recipients: "",
    enabled: true
  });

  const reportTypes = [
    {
      id: "executive",
      name: "Executive Summary",
      description: "High-level KPIs and strategic insights",
      icon: TrendingUp,
      metrics: ["Employment Rate", "Success Rate", "Total Alumni", "Key Trends"]
    },
    {
      id: "outreach",
      name: "Outreach Campaign",
      description: "Alumni needing follow-up and engagement",
      icon: Users,
      metrics: ["Contact Lists", "Response Rates", "Follow-up Needed", "Recent Activity"]
    },
    {
      id: "grant",
      name: "Grant Reporting",
      description: "Comprehensive data for funding applications",
      icon: FileText,
      metrics: ["Student Outcomes", "Employment Data", "Academic Progress", "Success Stories"]
    },
    {
      id: "academic",
      name: "Academic Progress",
      description: "Educational outcomes and enrollment tracking",
      icon: Calendar,
      metrics: ["Graduation Rates", "GPA Trends", "College Performance", "Enrollment Status"]
    }
  ];

  const frequencies = [
    { id: "daily", name: "Daily", description: "Every day at 8:00 AM" },
    { id: "weekly", name: "Weekly", description: "Every Monday at 8:00 AM" },
    { id: "monthly", name: "Monthly", description: "1st of every month at 8:00 AM" },
    { id: "quarterly", name: "Quarterly", description: "1st of Jan, Apr, Jul, Oct at 8:00 AM" }
  ];

  const generatePreviewReport = (type: string) => {
    const timestamp = new Date().toLocaleDateString();
    const totalAlumni = data.length;
    const employed = data.filter(a => a.employed === true).length;
    const onTrack = data.filter(a => a.trackingStatus === 'on-track').length;
    
    let content = '';
    
    if (type === 'executive') {
      content = `
EXECUTIVE SUMMARY - ${timestamp}

📊 KEY METRICS
• Total Alumni: ${totalAlumni}
• Employment Rate: ${Math.round((employed / totalAlumni) * 100)}%
• Success Rate: ${Math.round((onTrack / totalAlumni) * 100)}%

🎯 HIGHLIGHTS
• ${employed} alumni currently employed
• ${onTrack} alumni on track to success
• Top performing cohorts showing strong outcomes

📈 RECOMMENDATIONS
• Continue outreach to off-track alumni
• Leverage success stories for fundraising
• Strengthen college partnerships
      `.trim();
    } else if (type === 'outreach') {
      const needsOutreach = data.filter(a => a.flaggedForOutreach || !a.lastContactDate);
      content = `
OUTREACH CAMPAIGN REPORT - ${timestamp}

🎯 PRIORITY CONTACTS
• ${needsOutreach.length} alumni need immediate outreach
• ${data.filter(a => a.trackingStatus === 'off-track').length} off-track alumni requiring support
• ${data.filter(a => !a.phone && !a.personalEmail).length} missing contact information

📱 CONTACT METHODS
• Phone contacts available: ${data.filter(a => a.phone).length}
• Email contacts available: ${data.filter(a => a.personalEmail).length}
• Social media contacts: ${data.filter(a => a.instagramHandle || a.linkedinHandle).length}

✅ ACTION ITEMS
• Update contact information for alumni with missing data
• Schedule follow-up calls for priority cases
• Send engagement survey to recently contacted alumni
      `.trim();
    } else if (type === 'grant') {
      const colleges = [...new Set(data.map(a => a.collegeAttending).filter(Boolean))].length;
      content = `
GRANT REPORTING SUMMARY - ${timestamp}

🎓 EDUCATIONAL OUTCOMES
• Alumni attending ${colleges} different colleges
• ${data.filter(a => a.currentlyEnrolled).length} currently enrolled students
• Average college attendance rate: ${Math.round((data.filter(a => a.collegeAttending).length / totalAlumni) * 100)}%

💼 EMPLOYMENT IMPACT
• ${employed} alumni gainfully employed
• Economic mobility demonstrated across cohorts
• Career diversification across multiple industries

📊 PROGRAM EFFECTIVENESS
• Strong correlation between program completion and success
• Consistent improvement in yearly cohort outcomes
• High retention and engagement rates
      `.trim();
    }

    // Create preview modal or download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}-report-preview-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateReport = () => {
    const recipients = newReport.recipients.split(',').map(email => email.trim()).filter(Boolean);
    
    if (!newReport.name || recipients.length === 0) {
      alert("Please provide a report name and at least one recipient email.");
      return;
    }

    const nextSendDate = new Date();
    if (newReport.frequency === 'weekly') {
      nextSendDate.setDate(nextSendDate.getDate() + 7);
    } else if (newReport.frequency === 'monthly') {
      nextSendDate.setMonth(nextSendDate.getMonth() + 1);
    } else if (newReport.frequency === 'quarterly') {
      nextSendDate.setMonth(nextSendDate.getMonth() + 3);
    }

    const report = {
      id: Date.now(),
      name: newReport.name,
      type: newReport.type,
      frequency: newReport.frequency,
      recipients,
      enabled: newReport.enabled,
      lastSent: "Never",
      nextSend: nextSendDate.toISOString().split('T')[0]
    };

    setReportSchedules([...reportSchedules, report]);
    setNewReport({
      name: "",
      type: "executive",
      frequency: "monthly",
      recipients: "",
      enabled: true
    });
  };

  const toggleReportStatus = (id: number) => {
    setReportSchedules(schedules =>
      schedules.map(schedule =>
        schedule.id === id
          ? { ...schedule, enabled: !schedule.enabled }
          : schedule
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Reports</h2>
          <p className="text-gray-600">Schedule and manage recurring analytics reports</p>
        </div>
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Report Schedules</TabsTrigger>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="create">Create New Report</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <div className="grid gap-4">
            {reportSchedules.map((schedule) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${schedule.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <h3 className="font-semibold">{schedule.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {schedule.frequency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {schedule.recipients.length} recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Next: {schedule.nextSend}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={schedule.enabled ? "default" : "secondary"}>
                      {schedule.enabled ? "Active" : "Paused"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePreviewReport(schedule.type)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleReportStatus(schedule.id)}
                    >
                      {schedule.enabled ? "Pause" : "Resume"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card key={type.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-6 w-6 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{type.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Included Metrics:</p>
                        <div className="flex flex-wrap gap-1">
                          {type.metrics.map((metric) => (
                            <Badge key={metric} variant="outline" className="text-xs">
                              {metric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => generatePreviewReport(type.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Generate Sample
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Automated Report</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    placeholder="e.g., Monthly Board Report"
                  />
                </div>

                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <select
                    id="reportType"
                    value={newReport.type}
                    onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    {reportTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <select
                    id="frequency"
                    value={newReport.frequency}
                    onChange={(e) => setNewReport({ ...newReport, frequency: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    {frequencies.map((freq) => (
                      <option key={freq.id} value={freq.id}>
                        {freq.name} - {freq.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
                  <textarea
                    id="recipients"
                    value={newReport.recipients}
                    onChange={(e) => setNewReport({ ...newReport, recipients: e.target.value })}
                    placeholder="director@example.com, board@example.com"
                    className="w-full p-2 border rounded-md h-24 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newReport.enabled}
                    onCheckedChange={(checked) => setNewReport({ ...newReport, enabled: checked })}
                  />
                  <Label>Enable immediately after creation</Label>
                </div>

                <Button onClick={handleCreateReport} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Create Automated Report
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}