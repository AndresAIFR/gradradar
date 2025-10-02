import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone, GraduationCap, Briefcase, Calendar, MapPin, Globe } from "lucide-react";

interface FilterPresetsProps {
  onApplyPreset: (preset: FilterPreset) => void;
  currentFilters: {
    searchTerm: string;
    selectedCohort: string;
    trackingStatusFilter: string;
  };
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  filters: {
    searchTerm?: string;
    selectedCohort?: string;
    trackingStatusFilter?: string;
    customFilter?: (alumni: any[]) => any[];
  };
  color: string;
}

const filterPresets: FilterPreset[] = [
  {
    id: "data-quality-issues",
    name: "Data Quality Issues",
    description: "Alumni with missing or incomplete data",
    icon: AlertTriangle,
    filters: {
      customFilter: (alumni) => alumni.filter(a => 
        !a.collegeAttending || 
        a.collegeAttending === "College" ||
        (!a.phone && !a.personalEmail) ||
        (!a.latestAnnualIncome && !a.currentSalary)
      )
    },
    color: "red"
  },
  {
    id: "missing-contact",
    name: "Missing Contact Info",
    description: "Alumni without phone or email",
    icon: Phone,
    filters: {
      customFilter: (alumni) => alumni.filter(a => 
        !a.phone && !a.personalEmail
      )
    },
    color: "orange"
  },
  {
    id: "generic-college",
    name: "Generic College Entries",
    description: "Alumni with 'College' as institution",
    icon: GraduationCap,
    filters: {
      customFilter: (alumni) => alumni.filter(a => 
        a.collegeAttending === "College"
      )
    },
    color: "red"
  },
  {
    id: "off-track-2022",
    name: "Off-Track 2022",
    description: "2022 cohort alumni who are off-track",
    icon: Calendar,
    filters: {
      selectedCohort: "2022",
      trackingStatusFilter: "off-track"
    },
    color: "red"
  },
  {
    id: "employed-alumni",
    name: "Employed Alumni",
    description: "Alumni currently employed",
    icon: Briefcase,
    filters: {
      customFilter: (alumni) => alumni.filter(a => a.employed === true)
    },
    color: "green"
  },
  {
    id: "needs-outreach",
    name: "Needs Outreach",
    description: "Alumni flagged for outreach or no recent contact",
    icon: Phone,
    filters: {
      customFilter: (alumni) => alumni.filter(a => 
        a.flaggedForOutreach === true || 
        !a.lastContactDate ||
        (new Date() - new Date(a.lastContactDate)) > (90 * 24 * 60 * 60 * 1000) // 90 days
      )
    },
    color: "blue"
  }
];

export function FilterPresets({ onApplyPreset, currentFilters }: FilterPresetsProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <h3 className="font-semibold">Quick Filter Presets</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filterPresets.map((preset) => {
            const Icon = preset.icon;
            const colorClasses = {
              red: "border-red-200 bg-red-50 hover:bg-red-100 text-red-700",
              orange: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700",
              green: "border-green-200 bg-green-50 hover:bg-green-100 text-green-700",
              blue: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700",
              gray: "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
            };

            return (
              <Button
                key={preset.id}
                variant="outline"
                onClick={() => onApplyPreset(preset)}
                className={`h-auto p-3 flex flex-col items-start text-left ${colorClasses[preset.color as keyof typeof colorClasses] || colorClasses.gray}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{preset.name}</span>
                </div>
                <span className="text-xs mt-1 opacity-75">{preset.description}</span>
              </Button>
            );
          })}
        </div>
        
        {/* Clear Filters */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset({
              id: "clear",
              name: "Clear All Filters",
              description: "",
              icon: AlertTriangle,
              filters: {
                searchTerm: "",
                selectedCohort: "all",
                trackingStatusFilter: "all"
              },
              color: "gray"
            })}
            className="text-gray-600"
          >
            Clear All Filters
          </Button>
        </div>
      </div>
    </Card>
  );
}