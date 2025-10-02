import { useState, useEffect, useRef, useMemo } from "react";
import logoImage from "@assets/comp-sci-high-logo.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, GraduationCap, Building2, DollarSign, Search, Grid3X3, List, Table2, Upload, Filter, ChevronDown, X, ArrowUpDown, ChevronRight, Download, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import ImportWizard from "@/components/ImportWizard/ImportWizard";

import SupportNeedsIcon from "@/components/SupportNeedsIcon";
import { useLastViewedAlumni } from "@/hooks/useLastViewedAlumni";
import type { Alumni } from "@shared/schema";
import { calculateLastContactDate, getContactRecencyRingClass, getContactRecencyTooltip, getDaysSinceLastContact } from "@/utils/contactRecency";
import { calculateAttritionFilter, getAttritionTypeLabel, ATTRITION_TYPES, AttritionType } from "@/utils/attritionCalculations";
import { getContactRecencyCategory, getSupportCategoryColor, getActiveFilterCount, sortOptions, getVisibleColumnsForExport, escapeCsv, getAvatarRingClassForAlumni, parseUrlParamsToFilterState, buildUrlSearchParams, buildApiQueryParams, buildExportQueryParams, formatFiltersForExport, createArrayFilterUpdater, createAllFiltersClearer, createFilterClearer, filterAlumniByLocation, filterAlumniByIds, filterAlumniByState, calculateDistance, normalizeStateCode } from "@/utils/alumniHelpers";
import { getStateFromCoordinates, US_STATE_CENTROIDS } from "@/utils/geo";
import AlumniSheetsView from "@/components/AlumniSheetsView";

// Import types from utils
import type { FilterState, SortField, SortDirection } from "@/utils/alumniHelpers";
import { APP_CONSTANTS } from "@/constants/app";

export default function Alumni() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "sheets">("grid");
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(() => {
    // Load from localStorage, default to true (collapsed)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.FILTER_PANEL_COLLAPSED);
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [activeFilterTab, setActiveFilterTab] = useState<'basic' | 'advanced'>(() => {
    // Load from localStorage, default to 'basic'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.ACTIVE_FILTER_TAB);
      return saved === 'advanced' ? 'advanced' : 'basic';
    }
    return 'basic';
  });
  const [isClosing, setIsClosing] = useState(false);
  const [showMobileFilterModal, setShowMobileFilterModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sheetViewMode, setSheetViewMode] = useState<'basic' | 'expanded' | 'all'>('basic');
  const { setLastViewedAlumni } = useLastViewedAlumni();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  // If we landed here with deep-link filters (ids or lat/lng), don't overwrite URL on first render
  const initialSearch =
    typeof window !== 'undefined' ? window.location.search : searchParams;
  const skipFirstUrlSyncRef = useRef<boolean>(
    new URLSearchParams(initialSearch).has('ids') ||
    new URLSearchParams(initialSearch).has('lat') ||
    new URLSearchParams(initialSearch).has('state') ||
    new URLSearchParams(initialSearch).has('cohortYear') ||
    new URLSearchParams(initialSearch).has('contactRecency')
  );
  
  // Parse URL parameters for pagination and filters
  const urlParams = new URLSearchParams(searchParams);
  const currentPage = parseInt(urlParams.get('page') || '1');
  const limit = APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT;
  
  // Filter state - initialize from URL params to prevent state/URL mismatch
  const [filterState, setFilterState] = useState<FilterState>(() => {
    // Parse initial URL to get the correct initial state
    const initialParams = typeof window !== 'undefined' ? window.location.search.replace('?', '') : '';
    return parseUrlParamsToFilterState(initialParams, { field: 'lastName', direction: 'asc' });
  });

  // Initialize filters from URL parameters on page load
  useEffect(() => {
    
    const newFilterState = parseUrlParamsToFilterState(searchParams.replace('?', ''), filterState.sort);
    
    
    // Only update if filters actually changed
    const hasAdvancedFilterChanges = JSON.stringify(newFilterState.filters) !== JSON.stringify(filterState.filters);
    
    if (hasAdvancedFilterChanges) {
      setFilterState(newFilterState);
    }
  }, [searchParams]);
  
  // State for pagination and filters
  const [page, setPage] = useState(currentPage);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Expandable sections state for filter drawer (alphabetized)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    attrition: false,
    cohort: false,
    college: false,
    economicLiberation: false,
    employment: false,
    location: false,
    scholarships: false,
    state: false,
    support: false,
    trackStatus: false,
  });

  // Handle clicking on alumni card
  const handleAlumniClick = (alumnus: Alumni) => {
    setLastViewedAlumni({
      id: alumnus.id,
      name: `${alumnus.firstName} ${alumnus.lastName}`,
      cohortYear: alumnus.cohortYear
    });
    setLocation(`/alumni/${alumnus.id}`);
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update URL when filters change
  useEffect(() => {
    // On first render, if we already have deep-link filters, don't blow them away
    if (skipFirstUrlSyncRef.current) {
      skipFirstUrlSyncRef.current = false; // only skip once
      return;
    }
    
    const params = buildUrlSearchParams(page, debouncedSearchTerm, filterState);
    const newSearch = params.toString();
    const newUrl = `/alumni${newSearch ? `?${newSearch}` : ''}`;
    
    // Prevent infinite loop: only update URL if it's actually different
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== newUrl) {
      setLocation(newUrl);
    }
  }, [page, debouncedSearchTerm, filterState.filters, filterState.sort, setLocation]);

  // Check if location filter is active
  const hasLocationFilter = !!filterState.filters.location;
  
  // Check if IDs filter is active
  const hasIdsFilter = !!(filterState.filters.ids && filterState.filters.ids.length > 0);
  
  // Check if state filter is active
  const hasStateFilter = !!(filterState.filters.state && filterState.filters.state.length > 0);
  
  


  // 🔥 PERFORMANCE FIX: Shared base query with stable cache key  
  const { data: baseAlumniData, isLoading: isBaseLoading, error: baseError } = useQuery({
    queryKey: ['alumni-locations'], // Simplified stable key
    queryFn: async () => {
          const response = await fetch('/api/alumni-locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch alumni locations: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: true, // Always enabled so state options can load
    staleTime: 10 * 60 * 1000, // Longer cache: 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in memory longer
  });

  // 📚 FULL ALUMNI QUERY: For computing filter options from ALL alumni
  const { data: allAlumniData, isLoading: isAllAlumniLoading } = useQuery<Alumni[]>({
    queryKey: ['alumni', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/alumni?fields=all', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch all alumni: ${response.status}`);
      }
      return await response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // 🏫 COLLEGE OPTIONS: Compute from ALL alumni (not filtered) - Show only base university names
  const collegeOptions = useMemo(() => {
    if (!allAlumniData) return [];
    
    const baseUniversities = Array.from(
      new Set(
        allAlumniData
          .filter(a => a.collegeAttending?.trim()) // Only alumni with colleges
          .map(a => {
            const college = a.collegeAttending!.trim();
            // Extract base university name (everything before first parenthesis)
            const baseMatch = college.match(/^([^(]+)/);
            return baseMatch ? baseMatch[1].trim() : college;
          })
      )
    ).sort();
    
    return baseUniversities;
  }, [allAlumniData]);

  // 🗺️ STATE OPTIONS: Compute from geocoded dataset to match map - Show states with alumni counts
  const stateOptions = useMemo(() => {
    // Prefer the geocoded map dataset; fallback to all alumni
    const source = (Array.isArray(baseAlumniData) && baseAlumniData.length > 0)
      ? baseAlumniData
      : (allAlumniData || []);
    if (!source) return [];

    const stateCounts: Record<string, number> = {};
    source.forEach((alum: any) => {
      let code = normalizeStateCode(alum.state || alum.addressState);
      if (!code && alum.latitude && alum.longitude) {
        const lat = typeof alum.latitude === "string" ? parseFloat(alum.latitude) : alum.latitude;
        const lng = typeof alum.longitude === "string" ? parseFloat(alum.longitude) : alum.longitude;
        if (!isNaN(lat) && !isNaN(lng)) code = getStateFromCoordinates(lat, lng);
      }
      if (code) stateCounts[code] = (stateCounts[code] || 0) + 1;
    });

    return Object.entries(stateCounts)
      .map(([code, count]) => {
        const stateName = US_STATE_CENTROIDS[code as keyof typeof US_STATE_CENTROIDS]?.name || code;
        return { code, label: `${stateName} (${count})`, count, stateName };
      })
      .sort((a, b) => a.stateName.localeCompare(b.stateName));
  }, [baseAlumniData, allAlumniData]);

  // 🔍 LOCATION FILTER: Create locationAlumni from base data
  const locationAlumni = useMemo(() => {
    console.log('🗺️ LOCATION ALUMNI DERIVATION:', {
      hasLocationFilter,
      baseAlumniData: baseAlumniData ? 'EXISTS' : 'NULL',
      baseDataLength: baseAlumniData?.length || 0
    });
    
    if (!hasLocationFilter || !baseAlumniData) {
      console.log('🚫 LOCATION ALUMNI: Returning null (no filter or no base data)');
      return null;
    }
    
    console.log('✅ LOCATION ALUMNI: Returning base data for location filtering');
    return baseAlumniData;
  }, [hasLocationFilter, baseAlumniData]);
  
  // Process the returned alumni data for location filtering
  const processedLocationAlumni = useMemo(() => {
    console.log('🔄 LOCATION PROCESSING:', {
      locationAlumni: locationAlumni ? 'EXISTS' : 'NULL',
      locationAlumniLength: locationAlumni?.length || 0,
      hasLocationFilter
    });
    
    if (!locationAlumni) {
      console.log('🚫 PROCESSED LOCATION: Returning empty array (no location data)');
      return [];
    }
    
    // Client-side filtering by location
    if (filterState.filters.location && filterState.filters.location.latitude !== null && filterState.filters.location.longitude !== null) {
      console.log('🗺️ BEFORE FILTERING:', {
        totalAlumni: locationAlumni.length,
        filterCenter: {
          lat: filterState.filters.location.latitude,
          lng: filterState.filters.location.longitude,
          radius: filterState.filters.location.radius
        },
        sampleAlumni: locationAlumni.slice(0, 3).map((a: Alumni) => ({
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          hasLocation: !!a.latitude && !!a.longitude,
          lat: a.latitude,
          lng: a.longitude,
          locationSource: a.locationSource
        }))
      });
      
      const filtered = filterAlumniByLocation(
        locationAlumni,
        filterState.filters.location.latitude!,
        filterState.filters.location.longitude!,
        filterState.filters.location.radius
      );
      
      console.log('🎯 LOCATION FILTER APPLIED:', {
        beforeCount: locationAlumni.length,
        afterCount: filtered.length,
        radiusMiles: filterState.filters.location.radius,
        filteredSample: filtered.slice(0, 5).map(a => ({
          name: `${a.firstName} ${a.lastName}`,
          distance: `~${Math.round(calculateDistance(
            filterState.filters.location!.latitude!,
            filterState.filters.location!.longitude!,
            parseFloat(a.latitude),
            parseFloat(a.longitude)
          ) * 10) / 10} miles`
        }))
      });
      
      return filtered;
    }
    console.log('✅ PROCESSED LOCATION: Returning base location data unchanged');
    return locationAlumni;
  }, [locationAlumni, filterState.filters.location]);
  const isLocationLoading = hasLocationFilter ? isBaseLoading : false;
  
  // IDs-filtered alumni (derived from ALL alumni data for complete information)
  const idsAlumni = useMemo(() => {
    if (!hasIdsFilter || !allAlumniData || !filterState.filters.ids?.length) return null;
    console.log('🔢 IDS FILTER APPLIED (client-side):', {
      targetIds: filterState.filters.ids,
      idCount: filterState.filters.ids?.length || 0
    });
    const filtered = filterAlumniByIds(allAlumniData, filterState.filters.ids);
    console.log('✅ IDS FILTER COMPLETE:', {
      beforeFilter: allAlumniData.length,
      afterFilter: filtered.length,
      targetIds: filterState.filters.ids
    });
    return filtered;
  }, [hasIdsFilter, allAlumniData, filterState.filters.ids]);
  const isIdsLoading = hasIdsFilter ? isAllAlumniLoading : false;

  // Paginated alumni query (standard endpoint)
  

  const { data: paginatedData, isLoading: isPaginatedLoading, error: paginatedError } = useQuery({
    queryKey: ['alumni', 'paginated', page, debouncedSearchTerm, filterState],
    queryFn: async () => {
      const params = buildApiQueryParams(page, limit, debouncedSearchTerm, filterState);
      
      const response = await fetch(`/api/alumni/paginated?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch alumni');
      
      const data = await response.json();
      
      return data;
    },
    enabled: !hasLocationFilter && !hasIdsFilter && !hasStateFilter,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // State-filtered alumni (use baseAlumniData which has coordinates)
  const stateAlumni = useMemo(() => {
    if (!hasStateFilter || !baseAlumniData || !filterState.filters.state?.length) return null;
    console.log('🌎 STATE FILTER APPLIED (client-side):', {
      targetStates: filterState.filters.state,
      stateCount: filterState.filters.state?.length || 0
    });
    const filtered = filterAlumniByState(baseAlumniData, filterState.filters.state);
    console.log('✅ STATE FILTER COMPLETE:', {
      beforeFilter: baseAlumniData.length,
      afterFilter: filtered.length,
      targetStates: filterState.filters.state
    });
    return filtered;
  }, [hasStateFilter, baseAlumniData, filterState.filters.state]);
  const isStateLoading = hasStateFilter ? isAllAlumniLoading : false;

  // Fallback to old API for now (will be removed)
  const { data: fallbackAlumni } = useQuery({
    queryKey: ['/api/alumni'],
    enabled: !paginatedData && !isPaginatedLoading && !hasLocationFilter && !hasIdsFilter && !hasStateFilter,
  });


  // Use the appropriate data source based on active filters
  // Precedence: ids > state > location > all
  let alumni: Alumni[] = [];
  let totalCount = 0;
  let isLoading = false;
  
  if (hasIdsFilter) {
    alumni = idsAlumni || [];
    totalCount = idsAlumni?.length || 0;
    isLoading = isIdsLoading;
  } else if (hasStateFilter) {
    alumni = stateAlumni || [];
    totalCount = stateAlumni?.length || 0;
    isLoading = isStateLoading;
  } else if (hasLocationFilter) {
    alumni = processedLocationAlumni || [];
    totalCount = processedLocationAlumni?.length || 0;
    isLoading = isLocationLoading;
  } else {
    alumni = paginatedData?.alumni || (Array.isArray(fallbackAlumni) ? fallbackAlumni : []);
    totalCount = paginatedData?.totalCount || (Array.isArray(fallbackAlumni) ? fallbackAlumni.length : 0);
    isLoading = isPaginatedLoading;
  }
  
  const totalPages = Math.ceil(totalCount / limit);
  

  // No need to fetch interactions anymore - we use populated lastContactDate from database

  // Export functions
  const exportToCSV = async () => {
    setIsExporting(true);
    
    try {
      // Build query parameters for export (same as current filters)
      const params = buildExportQueryParams(debouncedSearchTerm, filterState);
      
      // Fetch ALL alumni matching current filters
      const response = await fetch(`/api/alumni/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch export data');
      }
      
      const { alumni: exportAlumni } = await response.json();
      
      // Get visible columns based on current view mode and sheet view mode
      const visibleColumns = getVisibleColumnsForExport(viewMode, undefined, viewMode === 'sheets' ? sheetViewMode : undefined);
      const headers = visibleColumns.map(col => col.label);

      const csvData = exportAlumni.map((alum: any) => 
        visibleColumns.map(col => col.getValue(alum))
      );

      // Generate filter information for CSV header
      const filterInfo = formatFiltersForExport(debouncedSearchTerm, filterState);
      const exportMetadata = [
        `# Alumni Export Report - Generated ${new Date().toLocaleDateString()}`,
        `# Total Records: ${exportAlumni.length}`,
        `# View Mode: ${viewMode}`,
        `# Filters Applied: ${filterInfo}`,
        `# `,
        `# Data starts below:`
      ];

      const csvContent = [
        ...exportMetadata,
        headers.join(','),
        ...csvData.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `alumni-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Complete",
        description: `Successfully exported report with ${exportAlumni.length} alumni records.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export alumni data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      // Build query parameters for export (same as CSV export)
      const params = buildExportQueryParams(debouncedSearchTerm, filterState);
      
      // Fetch ALL alumni matching current filters
      const response = await fetch(`/api/alumni/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch export data');
      }
      
      const { alumni: exportAlumni } = await response.json();
      
      // Get visible columns based on current view mode and sheet view mode  
      const visibleColumns = getVisibleColumnsForExport(viewMode, undefined, viewMode === 'sheets' ? sheetViewMode : undefined);
      
      // Create a simple HTML table for PDF export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Alumni Export Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #059669; margin-bottom: 20px; }
            .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            .status-on-track { color: #059669; font-weight: bold; }
            .status-off-track { color: #dc2626; font-weight: bold; }
            .status-near-track { color: #d97706; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Alumni Export Report</h1>
          <div class="meta">
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Alumni:</strong> ${exportAlumni.length}</p>
            <p><strong>View Mode:</strong> ${viewMode} view</p>
            <p><strong>Filters Applied:</strong></p>
            <div style="margin-left: 20px; font-size: 12px; color: #666; background: #f5f5f5; padding: 8px; border-radius: 4px;">
              ${formatFiltersForExport(debouncedSearchTerm, filterState)}
            </div>
            <p><strong>Columns:</strong> ${visibleColumns.length} visible columns</p>
          </div>
          <table>
            <thead>
              <tr>
                ${visibleColumns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${exportAlumni.map((alum: any) => `
                <tr>
                  ${visibleColumns.map(col => {
                    const value = col.getValue(alum);
                    const cellClass = col.key === 'trackingStatus' ? `class="status-${value?.toLowerCase()?.replace(' ', '-')}"` : '';
                    return `<td ${cellClass}>${value || '-'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `alumni-report-${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Complete",
        description: `Successfully exported report with ${exportAlumni.length} alumni records.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // All filtering is now handled server-side for consistency
  let filteredAndSortedAlumni: Alumni[] = alumni;


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Header with Brand Green Gradient */}
        <div 
          className="text-white shadow-lg transition-all duration-400 hover:bg-[position:20px_center]"
          style={{
            background: 'linear-gradient(90deg, var(--csh-green-900) 0%, var(--csh-green-700) 60%, var(--csh-green-500) 100%)',
            height: '96px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '0 32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center space-x-6">
              <img 
                src={logoImage} 
                alt="Comp Sci High Logo" 
                className="w-12 h-12 rounded-lg object-cover"
                style={{ objectPosition: 'center' }}
              />
              <div>
                <h1 className="text-3xl font-bold">GradRadar</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowImportWizard(true)}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button 
                onClick={() => setLocation("/alumni/add")}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Alumni
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Layout with Sidebar */}
        <div className="flex min-h-[calc(100vh-96px)] bg-slate-50">
          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Combined Search and Controls Row */}
          <div className="flex items-center gap-4 mb-6">
            {/* Search Bar - takes most space */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              {isLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                </div>
              )}
              <Input
                placeholder="Search alumni by name, college, major, employer, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-white"
              />
            </div>

            {/* Controls - takes remaining space */}
            <div className="flex items-center space-x-3">
              {/* Sort Dropdown */}
              <Select
                value={`${filterState.sort.field}-${filterState.sort.direction}`}
                onValueChange={(value) => {
                  const option = sortOptions.find(opt => opt.value === value);
                  if (option) {
                    setFilterState(prev => ({
                      ...prev,
                      sort: { field: option.field, direction: option.direction }
                    }));
                    setPage(1); // Reset to page 1 when sort changes
                  }
                }}
              >
                <SelectTrigger className="w-48 h-10 bg-white">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="h-10 w-10 p-0 bg-white"
                    disabled={isExporting || totalCount === 0}
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                    <span className="ml-auto text-xs text-gray-500">Data file</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as HTML
                    <span className="ml-auto text-xs text-gray-500">Report</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="p-2 transition-all duration-0 hover:bg-green-50 hover:text-green-700 hover:scale-105 hover:shadow-sm"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Grid View
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="p-2 transition-all duration-0 hover:bg-green-50 hover:text-green-700 hover:scale-105 hover:shadow-sm"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    List View
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "sheets" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("sheets")}
                      className="p-2 transition-all duration-0 hover:bg-green-50 hover:text-green-700 hover:scale-105 hover:shadow-sm"
                    >
                      <Table2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Sheets View
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Filter Pills - Advanced Filters Only */}
          {getActiveFilterCount(filterState) > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Advanced Filter Pills */}
              {filterState.filters.cohortYear.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Graduation: {filterState.filters.cohortYear.join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, cohortYear: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.trackingStatus.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filterState.filters.trackingStatus.join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, trackingStatus: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.state.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  State: {filterState.filters.state.join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, state: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.contactRecency.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Contact: {filterState.filters.contactRecency.map(level => {
                    switch (level) {
                      case 'recent': return 'Recent';
                      case 'moderate': return 'Moderate';
                      case 'stale': return 'Stale';
                      case 'none': return 'No Recent Contact';
                      default: return level;
                    }
                  }).join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, contactRecency: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.supportCategory.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Needs: {filterState.filters.supportCategory.join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, supportCategory: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.collegeAttending.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  College: {filterState.filters.collegeAttending.join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, collegeAttending: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.employed !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Employment: {filterState.filters.employed ? 'Employed' : 'Unemployed'}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, employed: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.receivedScholarships !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Scholarships: {filterState.filters.receivedScholarships ? 'Received' : 'None'}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, receivedScholarships: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.currentStage.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Stage: {filterState.filters.currentStage.join(', ')}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, currentStage: [], ids: null } }))}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterState.filters.attritionType !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700">
                  Attrition: {getAttritionTypeLabel(filterState.filters.attritionType)}
                  <button 
                    onClick={() => setFilterState(prev => ({ ...prev, filters: { ...prev.filters, attritionType: 'all' } }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Alumni Count */}
          <div className="mb-6 text-sm text-slate-600">
            {totalCount} alumni
          </div>

          {/* Content based on view mode */}
          {viewMode === "grid" && (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isLoading ? 'opacity-50' : ''}`}>
              {filteredAndSortedAlumni.map((alumnus: Alumni) => (
                <Card key={alumnus.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleAlumniClick(alumnus)}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="relative">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className={`w-12 h-12 ${getAvatarRingClassForAlumni(alumnus, getContactRecencyRingClass, (a, _) => calculateLastContactDate(a, []))}`}>
                              <AvatarImage src={alumnus.profileImageUrl || undefined} alt={`${alumnus.firstName} ${alumnus.lastName}`} />
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                                {alumnus.firstName.charAt(0)}{alumnus.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getContactRecencyTooltip(calculateLastContactDate(alumnus, []))}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* Tracking Status Indicator */}
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              alumnus.trackingStatus === 'on-track' ? 'bg-green-500' :
                              alumnus.trackingStatus === 'near-track' ? 'bg-yellow-500' :
                              alumnus.trackingStatus === 'off-track' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}></div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className={
                              alumnus.trackingStatus === 'on-track' ? 'text-green-600' :
                              alumnus.trackingStatus === 'near-track' ? 'text-yellow-600' :
                              alumnus.trackingStatus === 'off-track' ? 'text-red-600' :
                              'text-gray-600'
                            }>
                              {alumnus.trackingStatus === 'on-track' ? 'On Track' :
                               alumnus.trackingStatus === 'near-track' ? 'Near Track' :
                               alumnus.trackingStatus === 'off-track' ? 'Off Track' :
                               alumnus.trackingStatus || 'Unknown Status'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg text-slate-900">
                            {alumnus.firstName} {alumnus.lastName}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <SupportNeedsIcon supportNeeds={alumnus.grouping || alumnus.supportCategory || ""} />
                          </div>
                        </div>
                        <p className="text-sm text-slate-500">{alumnus.cohortYear}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* College/Employment Info */}
                      <div className="space-y-2 text-sm">
                        {alumnus.collegeAttending && (
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{alumnus.collegeAttending}</span>
                          </div>
                        )}
                        {alumnus.collegeMajor && (
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>{alumnus.collegeMajor}</span>
                          </div>
                        )}
                        {alumnus.collegeGpa && (
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 font-medium">GPA:</span>
                            <span className="font-semibold text-emerald-600">{alumnus.collegeGpa}</span>
                          </div>
                        )}
                        {alumnus.employed && alumnus.latestAnnualIncome && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-emerald-600">
                              ${alumnus.latestAnnualIncome?.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-3">
              {filteredAndSortedAlumni.map((alumnus: Alumni) => (
                <div key={alumnus.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 border border-slate-200" onClick={() => handleAlumniClick(alumnus)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className={`w-10 h-10 ${getAvatarRingClassForAlumni(alumnus, getContactRecencyRingClass, (a, _) => calculateLastContactDate(a, []))}`}>
                            <AvatarImage src={alumnus.profileImageUrl || undefined} alt={`${alumnus.firstName} ${alumnus.lastName}`} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold text-sm">
                              {alumnus.firstName.charAt(0)}{alumnus.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getContactRecencyTooltip(calculateLastContactDate(alumnus, []))}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-slate-900">{alumnus.firstName} {alumnus.lastName}</h3>
                            <span className="text-sm text-slate-500">{alumnus.cohortYear}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <SupportNeedsIcon supportNeeds={alumnus.grouping || alumnus.supportCategory || ""} />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-slate-600">
                          {alumnus.collegeAttending && (
                            <div className="flex items-center space-x-1">
                              <GraduationCap className="w-4 h-4" />
                              <span>{alumnus.collegeAttending}</span>
                            </div>
                          )}
                          {alumnus.collegeMajor && (
                            <div className="flex items-center space-x-1">
                              <Building2 className="w-4 h-4" />
                              <span>{alumnus.collegeMajor}</span>
                            </div>
                          )}
                          {alumnus.collegeGpa && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">GPA: {alumnus.collegeGpa}</span>
                            </div>
                          )}
                          {alumnus.employed && alumnus.latestAnnualIncome && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-semibold text-emerald-600">${alumnus.latestAnnualIncome?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "sheets" && (
            <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : ''}`}>
              <AlumniSheetsView 
                alumni={filteredAndSortedAlumni}
                searchTerm={debouncedSearchTerm}
                filterState={filterState}
                page={page}
                limit={limit}
                onAlumniClick={handleAlumniClick}
                onSortChange={(field, direction) => {
                  setFilterState(prev => ({
                    ...prev,
                    sort: { field, direction }
                  }));
                }}
                onFilterChange={(filters) => {
                  setFilterState(prev => ({
                    ...prev,
                    filters
                  }));
                }}
                onColumnViewModeChange={setSheetViewMode}
              />
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <div className="text-sm text-slate-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} alumni
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}


          {/* Mobile Filter Modal */}
          <Sheet open={showMobileFilterModal} onOpenChange={setShowMobileFilterModal}>
            <SheetContent className="w-96 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" style={{ color: 'var(--csh-green-700)' }} />
                  <span>Filter Alumni</span>
                </SheetTitle>
              </SheetHeader>
              
              {/* Filter Tabs - Mobile */}
              <div className="mt-6 px-1">
                <div className="flex bg-slate-50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setActiveFilterTab('basic');
                      localStorage.setItem('activeFilterTab', 'basic');
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeFilterTab === 'basic' 
                        ? 'bg-white text-green-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => {
                      setActiveFilterTab('advanced');
                      localStorage.setItem('activeFilterTab', 'advanced');
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeFilterTab === 'advanced' 
                        ? 'bg-white text-green-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {/* Clear All Filters */}
                {getActiveFilterCount(filterState) > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setFilterState(createAllFiltersClearer())}
                    className="w-full"
                  >
                    Clear All Filters ({getActiveFilterCount(filterState)})
                  </Button>
                )}

                {/* Attrition Filter */}
                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, attrition: !prev.attrition }))}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <span className="font-medium">Attrition</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.attrition ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSections.attrition && (
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {Object.entries(ATTRITION_TYPES).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-attrition-${key}`}
                            checked={filterState.filters.attritionType === key}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterState(prev => ({
                                  ...prev,
                                  filters: {
                                    ...prev.filters,
                                    attritionType: key as keyof typeof ATTRITION_TYPES
                                  }
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`mobile-attrition-${key}`} className="text-sm">{label}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, college: !prev.college }))}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <span className="font-medium">College/Institution</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.college ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSections.college && (
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {collegeOptions.map((college: string) => (
                          <div key={college} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-college-${college}`}
                              checked={filterState.filters.collegeAttending.includes(college)}
                              onCheckedChange={(checked) => {
                                setFilterState(prev => ({
                                  ...prev,
                                  filters: {
                                    ...prev.filters,
                                    ids: null, // Clear transient ids filter on manual change
                                    collegeAttending: checked
                                      ? [...prev.filters.collegeAttending, college]
                                      : prev.filters.collegeAttending.filter(c => c !== college)
                                  }
                                }));
                              }}
                            />
                            <Label htmlFor={`mobile-college-${college}`} className="text-sm">{college}</Label>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Graduation Year Filter */}
                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, cohort: !prev.cohort }))}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <span className="font-medium">Graduation Year</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.cohort ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSections.cohort && (
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {[2025, 2024, 2023, 2022].map(year => (
                        <div key={year} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-cohort-${year}`}
                            checked={filterState.filters.cohortYear.includes(year)}
                            onCheckedChange={(checked) => {
                              setFilterState(createArrayFilterUpdater('cohortYear', year, !!checked));
                            }}
                          />
                          <Label htmlFor={`mobile-cohort-${year}`} className="text-sm">{year}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* State Filter */}
                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, state: !prev.state }))}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <span className="font-medium">State</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.state ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSections.state && (
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {stateOptions.map((stateOption) => (
                          <div key={stateOption.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-state-${stateOption.code}`}
                              checked={filterState.filters.state.includes(stateOption.code)}
                              onCheckedChange={(checked) => {
                                setFilterState(prev => ({
                                  ...prev,
                                  filters: {
                                    ...prev.filters,
                                    ids: null, // Clear transient ids filter on manual change
                                    state: checked
                                      ? [...prev.filters.state, stateOption.code]
                                      : prev.filters.state.filter(s => s !== stateOption.code)
                                  }
                                }));
                              }}
                            />
                            <Label htmlFor={`mobile-state-${stateOption.code}`} className="text-sm">{stateOption.label}</Label>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Support Filter */}
                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, support: !prev.support }))}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <span className="font-medium">Support</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.support ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSections.support && (
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {['High Needs', 'Medium Needs', 'Low Needs', 'Unknown'].map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-support-${category}`}
                            checked={filterState.filters.supportCategory.includes(category)}
                            onCheckedChange={(checked) => {
                              setFilterState(prev => ({
                                ...prev,
                                filters: {
                                  ...prev.filters,
                                  supportCategory: checked
                                    ? [...prev.filters.supportCategory, category]
                                    : prev.filters.supportCategory.filter(c => c !== category)
                                }
                              }));
                            }}
                          />
                          <Label htmlFor={`mobile-support-${category}`} className="text-sm">{category}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Track Status Filter */}
                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, trackStatus: !prev.trackStatus }))}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <span className="font-medium">Track Status</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.trackStatus ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSections.trackStatus && (
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {['on-track', 'near-track', 'off-track', 'unknown'].map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-track-${status}`}
                            checked={filterState.filters.trackingStatus.includes(status)}
                            onCheckedChange={(checked) => {
                              setFilterState(prev => ({
                                ...prev,
                                filters: {
                                  ...prev.filters,
                                  trackingStatus: checked
                                    ? [...prev.filters.trackingStatus, status]
                                    : prev.filters.trackingStatus.filter(s => s !== status)
                                }
                              }));
                            }}
                          />
                          <Label htmlFor={`mobile-track-${status}`} className="text-sm">
                            {status === 'on-track' ? 'On Track' : status === 'near-track' ? 'Near Track' : status === 'off-track' ? 'Off Track' : 'Unknown'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location Filter - DEPRECATED: Hidden UI but keeping URL/logic support for backward compatibility */}
              </div>
            </SheetContent>
          </Sheet>

          {/* Import Wizard Dialog */}
          {showImportWizard && (
            <ImportWizard 
              open={showImportWizard}
              onOpenChange={(open) => {
                setShowImportWizard(open);
              }}
              onImportSuccess={() => {
                setShowImportWizard(false);
                queryClient.invalidateQueries({ queryKey: ["/api/alumni"] });
                toast({
                  title: "Import successful",
                  description: "Alumni data has been imported successfully.",
                });
              }}
            />
          )}
            </div> {/* Close max-w-7xl container */}
          </div> {/* Close flex-1 main content */}

          {/* Filter Sidebar - Hidden on mobile */}
          {isFilterPanelCollapsed ? (
            // Collapsed state - folder tab positioned at edge
            <div className="hidden md:block fixed top-64 -right-3 z-50">
              <div 
                className="bg-white border-l border-t border-b border-gray-300 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-x-1 rounded-l-lg shadow-sm"
                style={{
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
                  width: '65px',
                  height: '80px'
                }}
                onClick={() => {
                  setIsFilterPanelCollapsed(false);
                  localStorage.setItem('filterPanelCollapsed', 'false');
                }}
              >
                <div className="p-3 flex items-center justify-center h-full">
                  <Filter className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </div>
          ) : (
            // Expanded state - full sidebar
            <div className="hidden md:block w-80 bg-white border-l border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out overflow-y-auto shadow-lg">
              <div className={`h-full ${isClosing ? 'animate-out slide-out-to-right duration-300' : 'animate-in slide-in-from-right duration-300'}`}>
                <div 
                  className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 transition-all duration-200"
                  onClick={() => {
                    setIsClosing(true);
                    setTimeout(() => {
                      setIsFilterPanelCollapsed(true);
                      setIsClosing(false);
                      localStorage.setItem('filterPanelCollapsed', 'true');
                    }, 300); // Match animation duration
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-5 w-5" style={{ color: 'var(--csh-green-700)' }} />
                      <span className="font-semibold">Filter Alumni</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
                
                {/* Filter Tabs */}
                <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                  <div className="flex bg-slate-50 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setActiveFilterTab('basic');
                        localStorage.setItem('activeFilterTab', 'basic');
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeFilterTab === 'basic' 
                          ? 'bg-white text-green-700 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Basic Filters
                    </button>
                    <button
                      onClick={() => {
                        setActiveFilterTab('advanced');
                        localStorage.setItem('activeFilterTab', 'advanced');
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeFilterTab === 'advanced' 
                          ? 'bg-white text-green-700 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Advanced
                    </button>
                  </div>
                </div>

                {/* Only render filter content when expanded - Performance optimization */}
                <div className="p-4 space-y-4 bg-gradient-to-b from-white to-slate-50/30">
                  {/* Clear All Filters */}
                  {getActiveFilterCount(filterState) > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setFilterState(createAllFiltersClearer())}
                      className="w-full"
                    >
                      Clear All Filters ({getActiveFilterCount(filterState)})
                    </Button>
                  )}

                  {/* Basic Filters Tab */}
                  {activeFilterTab === 'basic' && (
                    <>
                      {/* Academic Section */}
                      <div className="mb-6">
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, academicSection: !prev.academicSection }))}
                          className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-md mb-3 hover:from-slate-200 hover:to-slate-100 transition-all duration-200"
                        >
                          <h4 className="text-sm font-semibold text-slate-700">Academic</h4>
                          <ChevronRight className={`h-4 w-4 transition-transform text-slate-600 ${expandedSections.academicSection ? 'rotate-90' : ''}`} />
                        </button>
                        
                        {expandedSections.academicSection && (
                          <>
                            {/* College/Institution Filter */}
                            <div className="mb-4 ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, college: !prev.college }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">College/Institution</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.college ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.college && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {collegeOptions.map((college: string) => (
                                      <div key={college} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`sidebar-college-${college}`}
                                          checked={filterState.filters.collegeAttending.includes(college)}
                                          onCheckedChange={(checked) => {
                                            setFilterState(prev => ({
                                              ...prev,
                                              filters: {
                                                ...prev.filters,
                                                ids: null, // Clear transient ids filter on manual change  
                                                collegeAttending: checked
                                                  ? [...prev.filters.collegeAttending, college]
                                                  : prev.filters.collegeAttending.filter(c => c !== college)
                                              }
                                            }));
                                          }}
                                        />
                                        <Label htmlFor={`sidebar-college-${college}`} className="text-sm">{college}</Label>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Graduation Year Filter */}
                            <div className="mb-4 ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, cohort: !prev.cohort }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">Graduation Year</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.cohort ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.cohort && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {[2025, 2024, 2023, 2022].map(year => (
                                    <div key={year} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`sidebar-cohort-${year}`}
                                        checked={filterState.filters.cohortYear.includes(year)}
                                        onCheckedChange={(checked) => {
                                          setFilterState(createArrayFilterUpdater('cohortYear', year, !!checked));
                                        }}
                                      />
                                      <Label htmlFor={`sidebar-cohort-${year}`} className="text-sm">{year}</Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* State Filter */}
                            <div className="ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, state: !prev.state }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">State</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.state ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.state && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {stateOptions.map((stateOption) => (
                                      <div key={stateOption.code} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`sidebar-state-${stateOption.code}`}
                                          checked={filterState.filters.state.includes(stateOption.code)}
                                          onCheckedChange={(checked) => {
                                            setFilterState(prev => ({
                                              ...prev,
                                              filters: {
                                                ...prev.filters,
                                                ids: null, // Clear transient ids filter on manual change  
                                                state: checked
                                                  ? [...prev.filters.state, stateOption.code]
                                                  : prev.filters.state.filter(s => s !== stateOption.code)
                                              }
                                            }));
                                          }}
                                        />
                                        <Label htmlFor={`sidebar-state-${stateOption.code}`} className="text-sm">{stateOption.label}</Label>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Support & Progress Section */}
                      <div className="mb-6">
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, supportSection: !prev.supportSection }))}
                          className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-md mb-3 hover:from-slate-200 hover:to-slate-100 transition-all duration-200"
                        >
                          <h4 className="text-sm font-semibold text-slate-700">Support & Progress</h4>
                          <ChevronRight className={`h-4 w-4 transition-transform text-slate-600 ${expandedSections.supportSection ? 'rotate-90' : ''}`} />
                        </button>

                        {expandedSections.supportSection && (
                          <>
                            {/* Support Filter */}
                            <div className="mb-4 ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, support: !prev.support }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">Support</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.support ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.support && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {['High Needs', 'Medium Needs', 'Low Needs', 'Unknown'].map(category => (
                                    <div key={category} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`sidebar-support-${category}`}
                                        checked={filterState.filters.supportCategory.includes(category)}
                                        onCheckedChange={(checked) => {
                                          setFilterState(prev => ({
                                            ...prev,
                                            filters: {
                                              ...prev.filters,
                                              supportCategory: checked
                                                ? [...prev.filters.supportCategory, category]
                                                : prev.filters.supportCategory.filter(c => c !== category)
                                            }
                                          }));
                                        }}
                                      />
                                      <Label htmlFor={`sidebar-support-${category}`} className="text-sm">{category}</Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Track Status Filter */}
                            <div className="ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, trackStatus: !prev.trackStatus }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">Track Status</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.trackStatus ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.trackStatus && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {['on-track', 'near-track', 'off-track', 'unknown'].map(status => (
                                    <div key={status} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`sidebar-track-${status}`}
                                        checked={filterState.filters.trackingStatus.includes(status)}
                                        onCheckedChange={(checked) => {
                                          setFilterState(prev => ({
                                            ...prev,
                                            filters: {
                                              ...prev.filters,
                                              trackingStatus: checked
                                                ? [...prev.filters.trackingStatus, status]
                                                : prev.filters.trackingStatus.filter(s => s !== status)
                                            }
                                          }));
                                        }}
                                      />
                                      <Label htmlFor={`sidebar-track-${status}`} className="text-sm">
                                        {status === 'on-track' ? 'On Track' : status === 'near-track' ? 'Near Track' : status === 'off-track' ? 'Off Track' : 'Unknown'}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Career & Financial Section */}
                      <div>
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, careerSection: !prev.careerSection }))}
                          className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-md mb-3 hover:from-slate-200 hover:to-slate-100 transition-all duration-200"
                        >
                          <h4 className="text-sm font-semibold text-slate-700">Career & Financial</h4>
                          <ChevronRight className={`h-4 w-4 transition-transform text-slate-600 ${expandedSections.careerSection ? 'rotate-90' : ''}`} />
                        </button>

                        {expandedSections.careerSection && (
                          <>
                            {/* Employment Status Filter */}
                            <div className="mb-4 ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, employment: !prev.employment }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">Employment Status</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.employment ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.employment && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {['Employed', 'Unemployed', 'Student', 'Unknown'].map(status => (
                                    <div key={status} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`sidebar-employment-${status}`}
                                        checked={filterState.filters.employmentStatus?.includes(status) || false}
                                        onCheckedChange={(checked) => {
                                          setFilterState(prev => ({
                                            ...prev,
                                            filters: {
                                              ...prev.filters,
                                              employmentStatus: checked
                                                ? [...(prev.filters.employmentStatus || []), status]
                                                : (prev.filters.employmentStatus || []).filter((s: string) => s !== status)
                                            }
                                          }));
                                        }}
                                      />
                                      <Label htmlFor={`sidebar-employment-${status}`} className="text-sm">{status}</Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Scholarships Filter */}
                            <div className="ml-4">
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, scholarships: !prev.scholarships }))}
                                className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                              >
                                <span className="font-medium text-sm">Scholarships</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.scholarships ? 'rotate-90' : ''}`} />
                              </button>
                              {expandedSections.scholarships && (
                                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                                  {['Has Scholarships', 'No Scholarships', 'Unknown'].map(status => (
                                    <div key={status} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`sidebar-scholarships-${status}`}
                                        checked={filterState.filters.scholarships?.includes(status) || false}
                                        onCheckedChange={(checked) => {
                                          setFilterState(prev => ({
                                            ...prev,
                                            filters: {
                                              ...prev.filters,
                                              scholarships: checked
                                                ? [...(prev.filters.scholarships || []), status]
                                                : (prev.filters.scholarships || []).filter((s: string) => s !== status)
                                            }
                                          }));
                                        }}
                                      />
                                      <Label htmlFor={`sidebar-scholarships-${status}`} className="text-sm">{status}</Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {/* Advanced Filters Tab */}
                  {activeFilterTab === 'advanced' && (
                    <>
                      {/* Attrition Filter */}
                      <div className="ml-4">
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, attrition: !prev.attrition }))}
                          className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                        >
                          <span className="font-medium text-sm">Attrition</span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.attrition ? 'rotate-90' : ''}`} />
                        </button>
                        {expandedSections.attrition && (
                          <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                            {Object.entries(ATTRITION_TYPES).map(([key, label]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`sidebar-attrition-${key}`}
                                  checked={filterState.filters.attritionType === key}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilterState(prev => ({
                                        ...prev,
                                        filters: {
                                          ...prev.filters,
                                          attritionType: key as keyof typeof ATTRITION_TYPES
                                        }
                                      }));
                                    }
                                  }}
                                />
                                <Label htmlFor={`sidebar-attrition-${key}`} className="text-sm">{label}</Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Contact Recency Filter */}
                      <div className="ml-4">
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, contactRecency: !prev.contactRecency }))}
                          className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
                        >
                          <span className="font-medium text-sm">Contact Recency</span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.contactRecency ? 'rotate-90' : ''}`} />
                        </button>
                        {expandedSections.contactRecency && (
                          <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                            {[
                              { key: 'recent', label: 'Recent (0-30 days)', color: 'green' },
                              { key: 'moderate', label: 'Moderate (31-90 days)', color: 'yellow' },
                              { key: 'stale', label: 'Stale (91-180 days)', color: 'orange' },
                              { key: 'none', label: 'No Recent Contact (180+ days)', color: 'red' }
                            ].map(({ key, label, color }) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`sidebar-contact-${key}`}
                                  checked={filterState.filters.contactRecency?.includes(key) || false}
                                  onCheckedChange={(checked) => {
                                    setFilterState(prev => ({
                                      ...prev,
                                      filters: {
                                        ...prev.filters,
                                        contactRecency: checked
                                          ? [...(prev.filters.contactRecency || []), key]
                                          : (prev.filters.contactRecency || []).filter(r => r !== key)
                                      }
                                    }));
                                  }}
                                />
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    color === 'green' ? 'bg-green-500' :
                                    color === 'yellow' ? 'bg-yellow-500' :
                                    color === 'orange' ? 'bg-orange-500' :
                                    color === 'red' ? 'bg-red-500' : 'bg-gray-400'
                                  }`} />
                                  <Label htmlFor={`sidebar-contact-${key}`} className="text-sm">{label}</Label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}