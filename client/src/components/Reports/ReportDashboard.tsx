import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, GraduationCap, Briefcase, Calendar, Target, FileText, Download } from "lucide-react";

interface ReportDashboardProps {
  data: any[];
}

export function ReportDashboard({ data }: ReportDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1y' | '2y' | '3y' | 'all'>('all');
  
  // Calculate key metrics
  const totalAlumni = data.length;
  const employed = data.filter(a => a.employed === true).length;
  const onTrack = data.filter(a => a.trackingStatus === 'on-track').length;
  const currentlyEnrolled = data.filter(a => a.currentlyEnrolled === true).length;
  
  const employmentRate = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;
  const successRate = totalAlumni > 0 ? Math.round((onTrack / totalAlumni) * 100) : 0;
  const enrollmentRate = totalAlumni > 0 ? Math.round((currentlyEnrolled / totalAlumni) * 100) : 0;

  // Cohort Analysis
  const cohortData = Object.entries(
    data.reduce((acc, alumni) => {
      const cohort = alumni.cohortYear?.toString() || 'Unknown';
      if (!acc[cohort]) {
        acc[cohort] = { cohort, total: 0, employed: 0, onTrack: 0, enrolled: 0 };
      }
      acc[cohort].total++;
      if (alumni.employed === true) acc[cohort].employed++;
      if (alumni.trackingStatus === 'on-track') acc[cohort].onTrack++;
      if (alumni.currentlyEnrolled === true) acc[cohort].enrolled++;
      return acc;
    }, {} as Record<string, { cohort: string; total: number; employed: number; onTrack: number; enrolled: number }>)
  ).map(([_, stats]) => ({
    cohort: stats.cohort,
    total: stats.total,
    employed: stats.employed,
    onTrack: stats.onTrack,
    enrolled: stats.enrolled,
    employmentRate: Math.round((stats.employed / stats.total) * 100),
    successRate: Math.round((stats.onTrack / stats.total) * 100),
    enrollmentRate: Math.round((stats.enrolled / stats.total) * 100)
  })).sort((a, b) => b.cohort.localeCompare(a.cohort));

  // Status Distribution
  const statusData = [
    { name: 'On Track', value: data.filter(a => a.trackingStatus === 'on-track').length, color: '#10B981' },
    { name: 'Near Track', value: data.filter(a => a.trackingStatus === 'near-track').length, color: '#F59E0B' },
    { name: 'Off Track', value: data.filter(a => a.trackingStatus === 'off-track').length, color: '#EF4444' },
    { name: 'Unknown', value: data.filter(a => !a.trackingStatus || a.trackingStatus === 'unknown').length, color: '#6B7280' }
  ];

  // College Distribution (Top 10)
  const collegeStats = Object.entries(
    data.reduce((acc, alumni) => {
      const college = alumni.collegeAttending || 'Unknown';
      if (college !== 'College' && college !== 'Unknown') {
        acc[college] = (acc[college] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  )
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([college, count]) => ({ college, count: count as number }));

  // Income Analysis
  const incomeRanges = [
    { range: 'Under $30k', min: 0, max: 30000 },
    { range: '$30k-$50k', min: 30000, max: 50000 },
    { range: '$50k-$75k', min: 50000, max: 75000 },
    { range: '$75k-$100k', min: 75000, max: 100000 },
    { range: 'Over $100k', min: 100000, max: Infinity }
  ];

  const incomeData = incomeRanges.map(range => ({
    range: range.range,
    count: data.filter(a => {
      const income = a.latestAnnualIncome || a.currentSalary;
      return income && income >= range.min && income < range.max;
    }).length
  }));

  // Key Performance Indicators
  const kpis = [
    {
      title: "Employment Rate",
      value: `${employmentRate}%`,
      change: "+5.2%",
      trend: "up",
      icon: Briefcase,
      color: "text-green-600"
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      change: "+3.1%",
      trend: "up",
      icon: Target,
      color: "text-blue-600"
    },
    {
      title: "Enrollment Rate",
      value: `${enrollmentRate}%`,
      change: "-1.8%",
      trend: "down",
      icon: GraduationCap,
      color: "text-orange-600"
    },
    {
      title: "Total Alumni",
      value: totalAlumni.toString(),
      change: "+12",
      trend: "up",
      icon: Users,
      color: "text-purple-600"
    }
  ];

  const generateReport = (type: 'executive' | 'detailed' | 'cohort') => {
    const timestamp = new Date().toLocaleDateString();
    let content = '';

    if (type === 'executive') {
      content = `
EXECUTIVE SUMMARY REPORT
Generated: ${timestamp}

=== KEY PERFORMANCE INDICATORS ===
• Employment Rate: ${employmentRate}% (${employed}/${totalAlumni} alumni)
• Academic Success Rate: ${successRate}% on track
• Current Enrollment: ${enrollmentRate}% still enrolled
• Total Alumni Tracked: ${totalAlumni}

=== COHORT PERFORMANCE ===
${cohortData.slice(0, 5).map(c => 
  `• Class of ${c.cohort}: ${c.employmentRate}% employed, ${c.successRate}% on track`
).join('\n')}

=== TOP PERFORMING COLLEGES ===
${collegeStats.slice(0, 5).map((c, i) => 
  `${i + 1}. ${c.college}: ${c.count} alumni`
).join('\n')}

=== RECOMMENDATIONS ===
• Focus outreach on ${statusData.find(s => s.name === 'Off Track')?.value || 0} off-track alumni
• Strengthen support for ${statusData.find(s => s.name === 'Near Track')?.value || 0} near-track cases
• Leverage success stories from top-performing cohorts
      `.trim();
      
    } else if (type === 'detailed') {
      content = `
DETAILED ANALYTICS REPORT
Generated: ${timestamp}

=== COMPREHENSIVE METRICS ===
Total Alumni: ${totalAlumni}
Employment Status:
  • Employed: ${employed} (${employmentRate}%)
  • Unemployed: ${data.filter(a => a.employed === false).length}
  • Unknown: ${data.filter(a => a.employed === null || a.employed === undefined).length}

Tracking Status Distribution:
${statusData.map(s => `  • ${s.name}: ${s.value}`).join('\n')}

=== COHORT ANALYSIS ===
${cohortData.map(c => `
Class of ${c.cohort}:
  • Total Alumni: ${c.total}
  • Employment Rate: ${c.employmentRate}%
  • Success Rate: ${c.successRate}%
  • Still Enrolled: ${c.enrollmentRate}%
`).join('')}

=== COLLEGE PERFORMANCE ===
${collegeStats.map((c, i) => `${i + 1}. ${c.college}: ${c.count} alumni`).join('\n')}

=== INCOME DISTRIBUTION ===
${incomeData.map(i => `${i.range}: ${i.count} alumni`).join('\n')}
      `.trim();
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}-report-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive performance insights and reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => generateReport('executive')}>
            <FileText className="h-4 w-4 mr-2" />
            Executive Report
          </Button>
          <Button variant="outline" onClick={() => generateReport('detailed')}>
            <Download className="h-4 w-4 mr-2" />
            Detailed Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <Card key={kpi.title} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon className={`h-3 w-3 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <Icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="cohorts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="status">Status Distribution</TabsTrigger>
          <TabsTrigger value="colleges">College Performance</TabsTrigger>
          <TabsTrigger value="income">Income Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="cohorts" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cohort Performance Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="employmentRate" fill="#10B981" name="Employment Rate %" />
                <Bar dataKey="successRate" fill="#3B82F6" name="Success Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Status Breakdown</h3>
              <div className="space-y-3">
                {statusData.map((status) => (
                  <div key={status.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="font-medium">{status.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{status.value}</span>
                      <Badge variant="outline">
                        {Math.round((status.value / totalAlumni) * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="colleges" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performing Colleges</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={collegeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="college" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Income Distribution</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={incomeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#F59E0B" fill="#FEF3C7" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}