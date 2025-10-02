import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Table, Code, X, ChevronDown } from "lucide-react";

interface ExportButtonProps {
  data: any[];
  visibleColumns: string[];
}

// Column headers for export
const columnHeaders: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  cohortYear: "Cohort Year",
  trackingStatus: "Tracking Status",
  supportCategory: "Support Category",
  phone: "Phone",
  personalEmail: "Personal Email",
  collegeEmail: "College Email",
  preferredEmail: "Preferred Email",
  instagramHandle: "Instagram",
  linkedinHandle: "LinkedIn",
  collegeAttending: "College",
  collegeMajor: "Major",
  collegeMinor: "Minor",
  collegeGpa: "College GPA",
  currentlyEnrolled: "Currently Enrolled",
  expectedGraduationDate: "Expected Graduation",
  receivedScholarships: "Scholarships",
  employed: "Employed",
  employerName: "Employer",
  latestAnnualIncome: "Annual Income",
  currentSalary: "Current Salary",
  lastContactDate: "Last Contact",
  householdIncome: "Household Income",
  contactId: "Contact ID",
  notes: "Notes"
};

const exportFormats = [
  {
    id: 'csv',
    name: 'CSV',
    description: 'Excel-compatible spreadsheet format',
    icon: Table,
    extension: 'csv'
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'Structured data format for developers',
    icon: Code,
    extension: 'json'
  },
  {
    id: 'txt',
    name: 'Text Report',
    description: 'Human-readable summary report',
    icon: FileText,
    extension: 'txt'
  }
];

export function ExportButton({ data, visibleColumns }: ExportButtonProps) {
  const [showFormats, setShowFormats] = useState(false);

  const generateSummaryReport = () => {
    const total = data.length;
    const employed = data.filter(a => a.employed === true).length;
    const onTrack = data.filter(a => a.trackingStatus === 'on-track').length;
    const colleges = [...new Set(data.map(a => a.collegeAttending).filter(Boolean))].length;
    
    const cohortBreakdown = data.reduce((acc, a) => {
      const cohort = a.cohortYear?.toString() || 'Unknown';
      acc[cohort] = (acc[cohort] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
Alumni Data Export Report
Generated: ${new Date().toLocaleDateString()}

=== SUMMARY ===
Total Alumni: ${total}
Employment Rate: ${Math.round((employed / total) * 100)}% (${employed}/${total})
On Track Rate: ${Math.round((onTrack / total) * 100)}% (${onTrack}/${total})
Unique Colleges: ${colleges}

=== COHORT BREAKDOWN ===
${Object.entries(cohortBreakdown)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([cohort, count]) => `${cohort}: ${count} alumni`)
  .join('\n')}

=== DATA FIELDS INCLUDED ===
${visibleColumns.map(col => columnHeaders[col] || col).join(', ')}

=== DETAILED DATA ===
${data.map((alumni, index) => `
--- Alumni #${index + 1} ---
${visibleColumns.map(col => `${columnHeaders[col] || col}: ${alumni[col] || 'N/A'}`).join('\n')}
`).join('\n')}
    `.trim();
  };

  const handleExport = (format: string) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      // Create CSV headers
      const headers = visibleColumns.map(col => columnHeaders[col] || col);
      
      // Create CSV rows
      const rows = data.map(row => 
        visibleColumns.map(col => {
          let value = row[col];
          
          // Format different data types
          if (value === null || value === undefined) {
            return '';
          }
          
          if (typeof value === 'boolean') {
            value = value ? 'Yes' : 'No';
          }
          
          if (col.includes('Date') && value) {
            value = new Date(value).toLocaleDateString();
          }
          
          // Escape quotes and wrap in quotes if contains comma or quote
          const stringValue = value.toString();
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          
          return stringValue;
        })
      );

      content = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `alumni-data-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
      
    } else if (format === 'json') {
      const exportData = data.map(row => {
        const formattedRow: any = {};
        visibleColumns.forEach(col => {
          formattedRow[columnHeaders[col] || col] = row[col];
        });
        return formattedRow;
      });
      
      content = JSON.stringify(exportData, null, 2);
      filename = `alumni-data-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json;charset=utf-8;';
      
    } else if (format === 'txt') {
      content = generateSummaryReport();
      filename = `alumni-report-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain;charset=utf-8;';
    }

    // Create and download the file
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowFormats(false);
  };

  if (data.length === 0) {
    return (
      <Button disabled className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        No Data to Export
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setShowFormats(!showFormats)}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        <Download className="h-4 w-4" />
        Export Data
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showFormats && (
        <div className="absolute top-full right-0 mt-2 z-50">
          <Card className="p-2 w-80 shadow-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Export Format</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFormats(false)}
                className="h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <Button
                    key={format.id}
                    variant="outline"
                    className="w-full h-auto p-3 flex items-start justify-start"
                    onClick={() => handleExport(format.id)}
                  >
                    <div className="flex items-start gap-3 w-full text-left">
                      <Icon className="h-5 w-5 mt-0.5 text-gray-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{format.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {data.length} records
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {format.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}