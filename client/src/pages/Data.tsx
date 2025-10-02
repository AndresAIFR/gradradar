import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Download, Search, Filter, Eye, EyeOff, CheckSquare, Square, Users, Archive, Flag, Edit3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, ColumnManager, ExportButton } from "@/components/DataTable";
import { FilterPresets, FilterPreset } from "@/components/DataTable/FilterPresets";
import { BulkOperations } from "@/components/DataTable/BulkOperations";
import { DataInsights } from "@/components/DataTable/DataInsights";

// Type definition for alumni data
interface AlumniData {
  id: number;
  firstName: string;
  lastName: string;
  cohortYear: number;
  trackingStatus?: string;
  collegeAttending?: string;
  collegeLatitude?: string | null;
  collegeLongitude?: string | null;
  collegeStandardName?: string | null;
  phone?: string;
  personalEmail?: string;
  latestAnnualIncome?: string;
  employed?: boolean;
  lastContactDate?: string;
  currentSalary?: number;
  [key: string]: any; // For the additional 60+ fields
}

export default function Data() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "firstName", "lastName", "cohortYear", "trackingStatus", "collegeAttending", 
    "collegeLatitude", "collegeLongitude", "phone", "personalEmail", "latestAnnualIncome", "employed", "lastContactDate"
  ]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<Set<number>>(new Set());
  const [trackingStatusFilter, setTrackingStatusFilter] = useState<string>("all");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilterPresets, setShowFilterPresets] = useState(false);
  const [customFilterFn, setCustomFilterFn] = useState<((alumni: any[]) => any[]) | null>(null);

  // Fetch full alumni data
  const { data: alumni = [], isLoading, error } = useQuery<AlumniData[]>({
    queryKey: ['/api/alumni?fields=all'],
  });

  // Get cohort years for filtering
  const { data: cohortYears = [] } = useQuery<number[]>({
    queryKey: ['/api/alumni/cohort-years'],
  });

  // Filter alumni based on search, cohort, tracking status, and custom filters
  const filteredAlumni = (() => {
    let result = alumni;
    
    // Apply custom filter function first if exists
    if (customFilterFn) {
      result = customFilterFn(result);
    }
    
    // Apply standard filters
    return result.filter((alumnus: AlumniData) => {
      const matchesSearch = searchTerm === "" || 
        `${alumnus.firstName} ${alumnus.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumnus.collegeAttending?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumnus.phone?.includes(searchTerm) ||
        alumnus.personalEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCohort = selectedCohort === "all" || alumnus.cohortYear.toString() === selectedCohort;
      const matchesStatus = trackingStatusFilter === "all" || alumnus.trackingStatus === trackingStatusFilter;
      
      return matchesSearch && matchesCohort && matchesStatus;
    });
  })();

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedAlumni.size === filteredAlumni.length) {
      setSelectedAlumni(new Set());
    } else {
      setSelectedAlumni(new Set(filteredAlumni.map(a => a.id)));
    }
  };

  const handleSelectAlumni = (id: number) => {
    const newSelected = new Set(selectedAlumni);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAlumni(newSelected);
  };

  // Filter preset handler
  const handleApplyPreset = (preset: FilterPreset) => {
    if (preset.id === "clear") {
      setSearchTerm("");
      setSelectedCohort("all");
      setTrackingStatusFilter("all");
      setCustomFilterFn(null);
    } else {
      // Apply preset filters
      if (preset.filters.searchTerm !== undefined) setSearchTerm(preset.filters.searchTerm);
      if (preset.filters.selectedCohort !== undefined) setSelectedCohort(preset.filters.selectedCohort);
      if (preset.filters.trackingStatusFilter !== undefined) setTrackingStatusFilter(preset.filters.trackingStatusFilter);
      if (preset.filters.customFilter) setCustomFilterFn(() => preset.filters.customFilter!);
    }
    setSelectedAlumni(new Set()); // Clear selection when filters change
  };

  // Calculate data quality metrics
  const dataQualityMetrics = {
    totalRecords: alumni.length,
    missingColleges: alumni.filter(a => !a.collegeAttending || a.collegeAttending === "College").length,
    missingContacts: alumni.filter(a => !a.phone && !a.personalEmail).length,
    missingIncomes: alumni.filter(a => !a.latestAnnualIncome && !a.currentSalary).length,
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
          <p className="text-gray-600">Failed to load alumni data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-gray-600">Comprehensive view of all alumni data</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedAlumni.size > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200"
            >
              <Users className="h-4 w-4" />
              Bulk Actions ({selectedAlumni.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowColumnManager(!showColumnManager)}
            className="flex items-center gap-2"
          >
            {showColumnManager ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showColumnManager ? "Hide Columns" : "Manage Columns"}
          </Button>
          <ExportButton data={filteredAlumni} visibleColumns={visibleColumns} />
        </div>
      </div>

      {/* Data Insights Dashboard */}
      <DataInsights 
        data={alumni} 
        filteredData={filteredAlumni} 
        selectedCount={selectedAlumni.size}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search alumni by name, college, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">All Cohorts</option>
                {cohortYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={trackingStatusFilter}
                onChange={(e) => setTrackingStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="on-track">On Track</option>
                <option value="near-track">Near Track</option>
                <option value="off-track">Off Track</option>
              </select>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilterPresets(!showFilterPresets)}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Quick Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedAlumni.size > 0 && (
        <BulkOperations
          selectedAlumni={selectedAlumni}
          onClearSelection={() => setSelectedAlumni(new Set())}
          onClose={() => setShowBulkActions(false)}
        />
      )}

      {/* Filter Presets */}
      {showFilterPresets && (
        <FilterPresets
          onApplyPreset={handleApplyPreset}
          currentFilters={{
            searchTerm,
            selectedCohort,
            trackingStatusFilter
          }}
        />
      )}

      {/* Column Manager */}
      {showColumnManager && (
        <ColumnManager
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
        />
      )}

      {/* Data Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <DataTable 
            data={filteredAlumni} 
            visibleColumns={visibleColumns}
            selectedAlumni={selectedAlumni}
            onSelectAlumni={handleSelectAlumni}
            onSelectAll={handleSelectAll}
          />
        )}
      </Card>
    </div>
  );
}