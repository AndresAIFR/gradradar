import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Briefcase, Users, GraduationCap, Target } from "lucide-react";
import type { Alumni } from "@shared/schema";

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SortRule {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

interface ReportConfig {
  name: string;
  description: string;
  columns: string[];
  filters: FilterCondition[];
  sortRules: SortRule[];
  groupBy?: string;
  showTotals: boolean;
}

const AVAILABLE_COLUMNS = [
  { key: 'firstName', label: 'First Name', category: 'basic' },
  { key: 'lastName', label: 'Last Name', category: 'basic' },
  { key: 'cohortYear', label: 'Cohort Year', category: 'basic' },
  { key: 'trackingStatus', label: 'Tracking Status', category: 'basic' },
  { key: 'currentStage', label: 'Current Stage', category: 'academic' },
  { key: 'supportCategory', label: 'Support Category', category: 'basic' },
  { key: 'employed', label: 'Employment Status', category: 'employment' },
  { key: 'currentlyEnrolled', label: 'Currently Enrolled', category: 'academic' },
  { key: 'collegeAttending', label: 'College Attending', category: 'academic' },
  { key: 'latestAnnualIncome', label: 'Latest Annual Income', category: 'employment' },
  { key: 'currentSalary', label: 'Current Salary', category: 'employment' },
  { key: 'lastContactDate', label: 'Last Contact Date', category: 'contact' },
  { key: 'personalEmail', label: 'Personal Email', category: 'contact' },
  { key: 'phoneNumber', label: 'Phone Number', category: 'contact' },
  { key: 'dateOfBirth', label: 'Date of Birth', category: 'basic' },
  { key: 'gpa', label: 'GPA', category: 'academic' },
  { key: 'scholarships', label: 'Scholarships', category: 'academic' },
  { key: 'enrollmentStatus', label: 'Enrollment Status', category: 'academic' },
];

const REPORT_TEMPLATES = [
  {
    id: 'employment',
    name: 'Employment Report',
    description: 'Track employment status and salaries',
    icon: Briefcase,
    columns: ['firstName', 'lastName', 'cohortYear', 'employed', 'currentSalary', 'latestAnnualIncome'],
    filters: [], // Removed restrictive employed=true filter to show all alumni
    sortRules: [{ field: 'cohortYear', direction: 'desc' }],
  },
  {
    id: 'outreach',
    name: 'Outreach Queue',
    description: 'Alumni needing follow-up contact',
    icon: Users,
    columns: ['firstName', 'lastName', 'personalEmail', 'phoneNumber', 'lastContactDate', 'supportCategory'],
    filters: [{ field: 'lastContactDate', operator: 'less_than', value: '2024-05-01' }],
    sortRules: [{ field: 'lastContactDate', direction: 'asc' }],
  },
  {
    id: 'graduates',
    name: 'Recent Graduates',
    description: 'Latest cohort graduation status',
    icon: GraduationCap,
    columns: ['firstName', 'lastName', 'cohortYear', 'currentStage', 'collegeAttending', 'currentlyEnrolled'],
    filters: [{ field: 'cohortYear', operator: 'greater_than', value: '2022' }],
    sortRules: [{ field: 'cohortYear', direction: 'desc' }],
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Build from scratch',
    icon: Target,
    columns: ['firstName', 'lastName', 'cohortYear', 'trackingStatus'],
    filters: [],
    sortRules: [{ field: 'lastName', direction: 'asc' }],
  },
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

interface ReportBuilderProps {
  onSaveReport: (config: ReportConfig) => void;
  initialConfig?: ReportConfig;
  mode?: 'create' | 'edit';
}

export function ReportBuilder({ onSaveReport, initialConfig, mode = 'create' }: ReportBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || {
      name: '',
      description: '',
      columns: ['firstName', 'lastName', 'cohortYear', 'trackingStatus'],
      filters: [],
      sortRules: [{ id: '1', field: 'lastName', direction: 'asc' }],
      groupBy: undefined,
      showTotals: false,
    }
  );

  const [previewData, setPreviewData] = useState<Alumni[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Fetch all alumni for preview
  const { data: allAlumni = [] } = useQuery<Alumni[]>({
    queryKey: ["all-alumni-for-reports"],
    queryFn: async () => {
      const response = await fetch("/api/alumni");
      if (!response.ok) throw new Error("Failed to fetch alumni");
      return response.json();
    },
  });

  // Auto-generate preview when config changes
  useEffect(() => {
    if (allAlumni.length > 0) {
      generatePreview();
    }
  }, [config, allAlumni]);

  const applyTemplate = (template: typeof REPORT_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setConfig(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      columns: template.columns,
      filters: template.filters.map((f, i) => ({ ...f, id: (i + 1).toString() })),
      sortRules: template.sortRules.map((s, i) => ({ ...s, id: (i + 1).toString(), direction: s.direction as 'asc' | 'desc' })),
    }));
  };

  // Generate preview data based on current config
  const generatePreview = () => {
    let filtered = [...allAlumni];

    // Apply filters
    config.filters.forEach(filter => {
      if (!filter.field || !filter.operator) return;

      filtered = filtered.filter(alumni => {
        const fieldValue = alumni[filter.field as keyof Alumni];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return String(fieldValue).toLowerCase() === filterValue.toLowerCase();
          case 'not_equals':
            return String(fieldValue).toLowerCase() !== filterValue.toLowerCase();
          case 'contains':
            return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase());
          case 'not_contains':
            return !String(fieldValue).toLowerCase().includes(filterValue.toLowerCase());
          case 'greater_than':
            return Number(fieldValue) > Number(filterValue);
          case 'less_than':
            return Number(fieldValue) < Number(filterValue);
          case 'is_empty':
            return !fieldValue || fieldValue === '' || fieldValue === null;
          case 'is_not_empty':
            return fieldValue && fieldValue !== '' && fieldValue !== null;
          default:
            return true;
        }
      });
    });

    // Apply sorting
    config.sortRules.forEach(sort => {
      if (!sort.field) return;
      
      filtered.sort((a, b) => {
        const aVal = a[sort.field as keyof Alumni] ?? '';
        const bVal = b[sort.field as keyof Alumni] ?? '';
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    });

    // Limit preview to first 50 rows
    setPreviewData(filtered.slice(0, 50));
  };

  const addFilter = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, {
        id: Date.now().toString(),
        field: '',
        operator: 'equals',
        value: ''
      }]
    }));
  };

  const removeFilter = (id: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id)
    }));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const addSortRule = () => {
    setConfig(prev => ({
      ...prev,
      sortRules: [...prev.sortRules, {
        id: Date.now().toString(),
        field: '',
        direction: 'asc'
      }]
    }));
  };

  const removeSortRule = (id: string) => {
    setConfig(prev => ({
      ...prev,
      sortRules: prev.sortRules.filter(s => s.id !== id)
    }));
  };

  const updateSortRule = (id: string, updates: Partial<SortRule>) => {
    setConfig(prev => ({
      ...prev,
      sortRules: prev.sortRules.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const toggleColumn = (columnKey: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.includes(columnKey)
        ? prev.columns.filter(c => c !== columnKey)
        : [...prev.columns, columnKey]
    }));
  };

  const handleSave = () => {
    if (!config.name.trim()) {
      alert('Please enter a report name');
      return;
    }
    
    onSaveReport(config);
  };

  return (
    <div className="space-y-6">
      {/* Template Selection - Always show */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-8">Choose a Report Type</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-4 max-w-6xl mx-auto">
          {REPORT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;
            return (
              <Card
                key={template.id}
                className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-blue-200'
                }`}
                onClick={() => applyTemplate(template)}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`h-12 w-12 mx-auto mb-4 ${
                    isSelected ? 'text-blue-700' : 'text-blue-600'
                  }`} />
                  <h3 className={`text-lg font-semibold ${
                    isSelected ? 'text-blue-900' : ''
                  }`}>{template.name}</h3>
                  {isSelected && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Selected
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Report Builder - Show when template is selected */}
      {selectedTemplate && (
        <div className="grid grid-cols-12 gap-6 min-h-[70vh]">
          {/* Left Panel - Configuration */}
          <div className="col-span-5 space-y-4 overflow-y-auto">
            {/* Report Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Report Name"
              className="font-medium"
            />
            <Input
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* Columns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Columns ({config.columns.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {AVAILABLE_COLUMNS.map(column => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={config.columns.includes(column.key)}
                    onCheckedChange={() => toggleColumn(column.key)}
                  />
                  <Label htmlFor={column.key} className="text-sm flex-1">{column.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filters ({config.filters.length})</CardTitle>
              <Button onClick={addFilter} size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.filters.length === 0 ? (
              <p className="text-gray-500 text-sm">No filters applied</p>
            ) : (
              config.filters.map(filter => (
                <div key={filter.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={filter.field}
                      onValueChange={(value) => updateFilter(filter.id, { field: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.columns.map(columnKey => {
                          const column = AVAILABLE_COLUMNS.find(c => c.key === columnKey);
                          return column ? (
                            <SelectItem key={column.key} value={column.key}>
                              {column.label}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Value"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-1" />
                {mode === 'edit' ? 'Update' : 'Save'} Report
              </Button>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="col-span-7 flex flex-col">
            <div className="bg-white border rounded-lg flex-1 flex flex-col">
          <div className="border-b p-4">
            <div>
              <h3 className="font-medium">Live Preview</h3>
              <p className="text-sm text-gray-500">{previewData.length} records shown</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {previewData.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {config.columns.map(columnKey => {
                      const column = AVAILABLE_COLUMNS.find(c => c.key === columnKey);
                      return column ? (
                        <th key={columnKey} className="px-3 py-2 text-left font-medium border-r">
                          {column.label}
                        </th>
                      ) : null;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 100).map((alumni, index) => (
                    <tr key={`${alumni.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {config.columns.map(columnKey => (
                        <td key={`${alumni.id}-${columnKey}`} className="px-3 py-2 border-r">
                          {String(alumni[columnKey as keyof Alumni] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No data matches your filters</p>
                  <p className="text-sm">Try adjusting your filter conditions</p>
                </div>
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}