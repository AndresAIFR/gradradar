import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Phone, GraduationCap, DollarSign, Eye, Users, Briefcase } from "lucide-react";

interface ColumnManagerProps {
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
}

// Define column groups for better organization
const columnGroups = {
  basic: {
    label: "Basic Information",
    columns: ["firstName", "lastName", "cohortYear", "trackingStatus", "supportCategory"]
  },
  contact: {
    label: "Contact Information", 
    columns: ["phone", "personalEmail", "collegeEmail", "preferredEmail", "instagramHandle", "linkedinHandle"]
  },
  academic: {
    label: "Academic Information",
    columns: ["collegeAttending", "collegeLatitude", "collegeLongitude", "collegeStandardName", "collegeMajor", "collegeMinor", "collegeGpa", "currentlyEnrolled", "expectedGraduationDate", "receivedScholarships"]
  },
  employment: {
    label: "Employment Information",
    columns: ["employed", "employerName", "latestAnnualIncome", "currentSalary"]
  },
  dates: {
    label: "Important Dates",
    columns: ["lastContactDate", "expectedGraduationDate"]
  },
  financial: {
    label: "Financial Information", 
    columns: ["householdIncome", "latestAnnualIncome", "currentSalary", "receivedScholarships"]
  },
  system: {
    label: "System Fields",
    columns: ["contactId", "notes"]
  }
};

// Smart Column Presets for different use cases
const columnPresets = {
  grantReporting: {
    name: "Grant Reporting",
    description: "Essential data for grant reports and funding applications",
    icon: FileText,
    columns: ["firstName", "lastName", "cohortYear", "trackingStatus", "collegeAttending", "collegeMajor", "currentlyEnrolled", "employed", "employerName", "latestAnnualIncome", "expectedGraduationDate", "receivedScholarships"]
  },
  outreachCampaign: {
    name: "Outreach Campaign",
    description: "Contact information and engagement status",
    icon: Phone,
    columns: ["firstName", "lastName", "cohortYear", "phone", "personalEmail", "lastContactDate", "trackingStatus", "flaggedForOutreach", "needsFollowUp", "collegeAttending"]
  },
  academicProgress: {
    name: "Academic Progress",
    description: "Educational status and academic performance",
    icon: GraduationCap,
    columns: ["firstName", "lastName", "cohortYear", "collegeAttending", "collegeMajor", "collegeMinor", "collegeGpa", "currentlyEnrolled", "expectedGraduationDate", "trackingStatus", "transcriptCollected"]
  },
  economicOutcomes: {
    name: "Economic Outcomes",
    description: "Employment and financial success metrics",
    icon: DollarSign,
    columns: ["firstName", "lastName", "cohortYear", "employed", "employerName", "employmentType", "latestAnnualIncome", "currentSalary", "onCourseEconomicLiberation", "householdIncome", "collegeAttending"]
  },
  dataQuality: {
    name: "Data Quality Review",
    description: "Fields to verify data completeness and accuracy",
    icon: Eye,
    columns: ["firstName", "lastName", "cohortYear", "phone", "personalEmail", "collegeAttending", "employed", "latestAnnualIncome", "lastContactDate", "notes", "contactId"]
  },
  comprehensive: {
    name: "Full Dataset",
    description: "All available alumni fields",
    icon: Users,
    columns: ["firstName", "lastName", "cohortYear", "trackingStatus", "collegeAttending", "collegeMajor", "currentlyEnrolled", "phone", "personalEmail", "employed", "employerName", "latestAnnualIncome", "lastContactDate", "expectedGraduationDate", "receivedScholarships", "notes"]
  }
};

// Column display names
const columnLabels: Record<string, string> = {
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
  collegeLatitude: "College Latitude",
  collegeLongitude: "College Longitude", 
  collegeStandardName: "College Standard Name",
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

// Preset column configurations
const presets = {
  essential: ["firstName", "lastName", "cohortYear", "trackingStatus", "collegeAttending", "phone", "personalEmail"],
  contact: ["firstName", "lastName", "cohortYear", "phone", "personalEmail", "collegeEmail", "preferredEmail", "instagramHandle", "linkedinHandle"],
  academic: ["firstName", "lastName", "cohortYear", "collegeAttending", "collegeMajor", "collegeGpa", "currentlyEnrolled", "expectedGraduationDate"],
  employment: ["firstName", "lastName", "cohortYear", "employed", "employerName", "latestAnnualIncome", "currentSalary"],
  all: Object.keys(columnLabels)
};

export function ColumnManager({ visibleColumns, onVisibleColumnsChange }: ColumnManagerProps) {
  const handleColumnToggle = (columnId: string, checked: boolean) => {
    if (checked) {
      onVisibleColumnsChange([...visibleColumns, columnId]);
    } else {
      onVisibleColumnsChange(visibleColumns.filter(id => id !== columnId));
    }
  };

  const handlePresetSelect = (presetKey: keyof typeof presets) => {
    onVisibleColumnsChange(presets[presetKey]);
  };

  const handleGroupToggle = (groupColumns: string[], checked: boolean) => {
    if (checked) {
      // Add all columns from the group that aren't already visible
      const newColumns = Array.from(new Set([...visibleColumns, ...groupColumns]));
      onVisibleColumnsChange(newColumns);
    } else {
      // Remove all columns from the group
      onVisibleColumnsChange(visibleColumns.filter(col => !groupColumns.includes(col)));
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Column Manager</h3>
          <Badge variant="secondary">{visibleColumns.length} columns visible</Badge>
        </div>

        {/* Smart Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">Smart Column Presets</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(columnPresets).map(([key, preset]) => {
              const Icon = preset.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => onVisibleColumnsChange(preset.columns)}
                  className="h-auto p-3 flex flex-col items-start text-left justify-start"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{preset.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{preset.columns.length}</Badge>
                  </div>
                  <span className="text-xs text-gray-600 mt-1">{preset.description}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">Legacy Presets</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(presets).map(([key, columns]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect(key as keyof typeof presets)}
                className="capitalize"
              >
                {key} ({columns.length})
              </Button>
            ))}
          </div>
        </div>

        {/* Column Groups */}
        <div className="space-y-3">
          {Object.entries(columnGroups).map(([groupKey, group]) => {
            const groupColumnsVisible = group.columns.filter(col => visibleColumns.includes(col));
            const allGroupVisible = groupColumnsVisible.length === group.columns.length;
            const someGroupVisible = groupColumnsVisible.length > 0;

            return (
              <div key={groupKey} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={allGroupVisible}
                    onCheckedChange={(checked) => handleGroupToggle(group.columns, !!checked)}
                    className={someGroupVisible && !allGroupVisible ? "data-[state=checked]:bg-orange-500" : ""}
                  />
                  <label className="font-medium">{group.label}</label>
                  <Badge variant="outline" className="ml-auto">
                    {groupColumnsVisible.length}/{group.columns.length}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 ml-6">
                  {group.columns.map(columnId => (
                    <div key={columnId} className="flex items-center gap-2">
                      <Checkbox
                        checked={visibleColumns.includes(columnId)}
                        onCheckedChange={(checked) => handleColumnToggle(columnId, !!checked)}
                      />
                      <label className="text-sm">{columnLabels[columnId] || columnId}</label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}