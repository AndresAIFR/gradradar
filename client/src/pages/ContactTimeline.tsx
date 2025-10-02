import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, Clock, Users, Filter, FileText, Printer, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlumniPicker } from '@/components/AlumniPicker';
import { format, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';

// Types
interface TimelineInteraction {
  id: number;
  date: string;
  createdAt: string;
  type: string;
  overview?: string;
  internalSummary?: string;
  studentResponded: boolean;
  needsFollowUp: boolean;
  followUpPriority?: string;
  followUpDate?: string;
  // Alumni info
  alumniId: number;
  alumniFirstName: string;
  alumniLastName: string;
  alumniCohortYear: number;
  // Creator info
  createdBy?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
}

interface GroupedInteractions {
  [date: string]: TimelineInteraction[];
}

// Filter state interface
interface TimelineFilterState {
  cohortYear: number[];
  trackingStatus: string[];
  contactType: string[];
  needsFollowUp: string[];
  supportCategory: string[];
  employed: string[];
  currentlyEnrolled: string[];
}

export default function ContactTimeline() {
  // Basic filter state
  const [dateRange, setDateRange] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState(() => {
    const date = new Date('2018-01-01'); // Start from program beginning
    return format(date, 'yyyy-MM-dd');
  });
  const [customDateTo, setCustomDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [staffFilter, setStaffFilter] = useState<string>('');
  const [alumniFilter, setAlumniFilter] = useState<string>('');

  // Multi-select filter state (similar to Alumni page)
  const [filterState, setFilterState] = useState<TimelineFilterState>({
    cohortYear: [],
    trackingStatus: [],
    contactType: [],
    needsFollowUp: [],
    supportCategory: [],
    employed: [],
    currentlyEnrolled: [],
  });

  // Advanced filters visibility state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Helper function to toggle filter values
  const toggleFilter = (filterKey: keyof TimelineFilterState, value: string | number) => {
    setFilterState(prev => {
      const currentValues = prev[filterKey] as (string | number)[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  };

  // Calculate date range based on selected preset
  const getDateRange = () => {
    const today = new Date();
    const endDate = format(today, 'yyyy-MM-dd');
    
    let startDate: string;
    
    switch (dateRange) {
      case 'last-week': {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        startDate = format(date, 'yyyy-MM-dd');
        break;
      }
      case '30-days': {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        startDate = format(date, 'yyyy-MM-dd');
        break;
      }
      case '60-days': {
        const date = new Date();
        date.setDate(date.getDate() - 60);
        startDate = format(date, 'yyyy-MM-dd');
        break;
      }
      case '6-months': {
        const date = new Date();
        date.setMonth(date.getMonth() - 6);
        startDate = format(date, 'yyyy-MM-dd');
        break;
      }
      case '1-year': {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 1);
        startDate = format(date, 'yyyy-MM-dd');
        break;
      }
      case 'all': {
        const date = new Date('2018-01-01'); // Start from the beginning of the program
        startDate = format(date, 'yyyy-MM-dd');
        break;
      }
      case 'custom':
        startDate = customDateFrom;
        return { dateFrom: startDate, dateTo: customDateTo };
      default:
        // Default to 30 days
        const date = new Date();
        date.setDate(date.getDate() - 30);
        startDate = format(date, 'yyyy-MM-dd');
    }
    
    return { dateFrom: startDate, dateTo: endDate };
  };

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setDateRange('all');
    setStaffFilter('');
    setAlumniFilter('');
    setFilterState({
      cohortYear: [],
      trackingStatus: [],
      contactType: [],
      needsFollowUp: [],
      supportCategory: [],
      employed: [],
      currentlyEnrolled: [],
    });
  };

  // Helper function to get active filter pills
  const getActiveFilterPills = () => {
    const pills: Array<{label: string, onRemove: () => void}> = [];

    // Date range pill (only if not showing all time)
    if (dateRange !== 'all') {
      const dateLabel = dateRange === 'custom' 
        ? `Custom: ${format(parseISO(customDateFrom), 'MMM d')} - ${format(parseISO(customDateTo), 'MMM d')}`
        : dateRange === 'last-week' ? 'Last Week'
        : dateRange === '60-days' ? 'Last 60 Days'
        : dateRange === '6-months' ? 'Last 6 Months'
        : dateRange === '1-year' ? 'Last Year'
        : dateRange === 'all' ? 'All Time'
        : dateRange;
      
      pills.push({
        label: `Date: ${dateLabel}`,
        onRemove: () => setDateRange('all')
      });
    }

    // Alumni search pill
    if (alumniFilter) {
      pills.push({
        label: `Alumni: ${alumniFilter}`,
        onRemove: () => setAlumniFilter('')
      });
    }

    // Contact type pills
    filterState.contactType.forEach(type => {
      pills.push({
        label: `Contact Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        onRemove: () => toggleFilter('contactType', type)
      });
    });

    // Tracking status pills
    filterState.trackingStatus.forEach(status => {
      pills.push({
        label: `Tracking: ${status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        onRemove: () => toggleFilter('trackingStatus', status)
      });
    });

    // Needs follow up pills
    filterState.needsFollowUp.forEach(value => {
      pills.push({
        label: `Follow Up: ${value === 'true' ? 'Yes' : 'No'}`,
        onRemove: () => toggleFilter('needsFollowUp', value)
      });
    });

    // Support category pills
    filterState.supportCategory.forEach(category => {
      pills.push({
        label: `Support: ${category}`,
        onRemove: () => toggleFilter('supportCategory', category)
      });
    });

    // Cohort year pills
    filterState.cohortYear.forEach(year => {
      pills.push({
        label: `Class: ${year}`,
        onRemove: () => toggleFilter('cohortYear', year)
      });
    });

    // Currently enrolled pills
    filterState.currentlyEnrolled.forEach(value => {
      pills.push({
        label: `Enrolled: ${value === 'true' ? 'Yes' : 'No'}`,
        onRemove: () => toggleFilter('currentlyEnrolled', value)
      });
    });

    // Employment status pills
    filterState.employed.forEach(value => {
      pills.push({
        label: `Employment: ${value === 'true' ? 'Employed' : 'Unemployed'}`,
        onRemove: () => toggleFilter('employed', value)
      });
    });

    return pills;
  };


  // Fetch timeline data
  const { data: timelineData = [], isLoading, error } = useQuery({
    queryKey: ['timeline', dateRange, customDateFrom, customDateTo, staffFilter, alumniFilter, filterState],
    queryFn: async () => {
      const { dateFrom, dateTo } = getDateRange();
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        ...(staffFilter && { staffId: staffFilter }),
        ...(alumniFilter && { alumniId: alumniFilter }),
      });

      // Add array-based filters
      if (filterState.cohortYear.length > 0) {
        filterState.cohortYear.forEach(year => params.append('cohortYear', year.toString()));
      }
      if (filterState.trackingStatus.length > 0) {
        filterState.trackingStatus.forEach(status => params.append('trackingStatus', status));
      }
      if (filterState.contactType.length > 0) {
        filterState.contactType.forEach(type => params.append('contactType', type));
      }
      if (filterState.needsFollowUp.length > 0) {
        filterState.needsFollowUp.forEach(value => params.append('needsFollowUp', value));
      }
      if (filterState.supportCategory.length > 0) {
        filterState.supportCategory.forEach(category => params.append('supportCategory', category));
      }
      if (filterState.employed.length > 0) {
        filterState.employed.forEach(value => params.append('employed', value));
      }
      if (filterState.currentlyEnrolled.length > 0) {
        filterState.currentlyEnrolled.forEach(value => params.append('currentlyEnrolled', value));
      }
      
      const response = await fetch(`/api/contacts/timeline?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch timeline data');
      }
      
      return response.json();
    },
  });

  // Group interactions by date
  const groupedInteractions: GroupedInteractions = timelineData.reduce((groups: GroupedInteractions, interaction: TimelineInteraction) => {
    const date = interaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(interaction);
    return groups;
  }, {} as GroupedInteractions);

  // Sort dates (newest first)
  const sortedDates = Object.keys(groupedInteractions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Print function
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Timeline</h2>
          <p className="text-gray-600">Unable to load contact timeline. Please try again.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex p-6 gap-6">
        {/* Main Content Card */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Unified Header */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Contact Timeline</h1>
              <Button onClick={handlePrint} variant="outline" className="print:hidden">
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
            <p className="text-gray-600 mt-1">View contact activities across alumni</p>
          </div>

          {/* Main Filter Bar */}
          <div className="px-6 pb-4 print:hidden">
            <div className="border border-gray-200 rounded-lg p-4">
              {/* Always Visible Filter Bar */}
              <div className="space-y-3">
                {/* Top row: All 3 filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Search alumni</label>
                    <AlumniPicker
                      placeholder="Search alumni by name"
                      value={alumniFilter}
                      onChange={setAlumniFilter}
                    />
                  </div>
                  
                  <div className="min-w-48">
                    <label className="block text-sm font-medium mb-1">Date Range</label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="last-week">Last Week</SelectItem>
                        <SelectItem value="30-days">Last 30 Days</SelectItem>
                        <SelectItem value="60-days">Last 60 Days</SelectItem>
                        <SelectItem value="6-months">Last 6 Months</SelectItem>
                        <SelectItem value="1-year">Last Year</SelectItem>
                        <div className="p-2 border-t">
                          <div className="text-xs font-medium text-gray-700 mb-2">Custom Range:</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500">From</label>
                              <Input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="text-xs h-8"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">To</label>
                              <Input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="text-xs h-8"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDateRange('custom');
                            }}
                          >
                            Apply Custom Range
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-48">
                    <label className="block text-sm font-medium mb-1">Contact Type</label>
                    <Select value={filterState.contactType.length === 0 ? 'all' : 'selected'} onValueChange={() => {}}>
                      <SelectTrigger>
                        <SelectValue>
                          {filterState.contactType.length === 0 
                            ? "All Types" 
                            : filterState.contactType.length === 1 
                              ? filterState.contactType[0].charAt(0).toUpperCase() + filterState.contactType[0].slice(1)
                              : `${filterState.contactType.length} types selected`
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-700 mb-2">Select Contact Types:</div>
                          <div className="space-y-2">
                            {['phone', 'email', 'text', 'in-person', 'general'].map(type => (
                              <div key={type} className="flex items-center gap-2">
                                <Checkbox
                                  checked={filterState.contactType.includes(type)}
                                  onCheckedChange={() => toggleFilter('contactType', type)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <label 
                                  className="text-sm capitalize cursor-pointer flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFilter('contactType', type);
                                  }}
                                >
                                  {type}
                                </label>
                              </div>
                            ))}
                          </div>
                          {filterState.contactType.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilterState(prev => ({ ...prev, contactType: [] }));
                              }}
                            >
                              Clear Selection
                            </Button>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bottom row: Action Buttons on right */}
                <div className="flex justify-end">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                      {showAdvancedFilters ? 'Hide filters' : 'Show filters'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Filter Pills */}
              {(() => {
                const activePills = getActiveFilterPills();
                return activePills.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {activePills.map((pill, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200"
                        >
                          <span>{pill.label}</span>
                          <button
                            onClick={pill.onRemove}
                            className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {activePills.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Advanced Filters - Hidden/Shown by toggle */}
              {showAdvancedFilters && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  {/* Alumni Status Section */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Alumni Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Tracking Status</label>
                        <Select 
                          value={filterState.trackingStatus.length === 0 ? 'all' : 
                                 filterState.trackingStatus.length === 1 ? filterState.trackingStatus[0] : 'multiple'} 
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setFilterState(prev => ({ ...prev, trackingStatus: [] }));
                            } else {
                              setFilterState(prev => ({ ...prev, trackingStatus: [value] }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {filterState.trackingStatus.length === 0 
                                ? "All Status" 
                                : filterState.trackingStatus.length === 1 
                                  ? filterState.trackingStatus[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                                  : `${filterState.trackingStatus.length} selected`
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="on-track">On Track</SelectItem>
                            <SelectItem value="near-track">Near Track</SelectItem>
                            <SelectItem value="off-track">Off Track</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Needs Follow Up</label>
                        <Select 
                          value={filterState.needsFollowUp.length === 0 ? 'all' : filterState.needsFollowUp[0]} 
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setFilterState(prev => ({ ...prev, needsFollowUp: [] }));
                            } else {
                              setFilterState(prev => ({ ...prev, needsFollowUp: [value] }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {filterState.needsFollowUp.length === 0 
                                ? "All" 
                                : filterState.needsFollowUp[0] === 'true' ? 'Yes' : 'No'
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Support Category</label>
                        <Select 
                          value={filterState.supportCategory.length === 0 ? 'all' : 
                                 filterState.supportCategory.length === 1 ? filterState.supportCategory[0] : 'multiple'} 
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setFilterState(prev => ({ ...prev, supportCategory: [] }));
                            } else {
                              setFilterState(prev => ({ ...prev, supportCategory: [value] }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {filterState.supportCategory.length === 0 
                                ? "All Categories" 
                                : filterState.supportCategory.length === 1 
                                  ? filterState.supportCategory[0]
                                  : `${filterState.supportCategory.length} selected`
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="High Needs">High Needs</SelectItem>
                            <SelectItem value="Medium Needs">Medium Needs</SelectItem>
                            <SelectItem value="Low Needs">Low Needs</SelectItem>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Academic Section */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Academic</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Cohort Year</label>
                        <Select 
                          value={filterState.cohortYear.length === 0 ? 'all' : 
                                 filterState.cohortYear.length === 1 ? filterState.cohortYear[0].toString() : 'multiple'} 
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setFilterState(prev => ({ ...prev, cohortYear: [] }));
                            } else {
                              setFilterState(prev => ({ ...prev, cohortYear: [parseInt(value)] }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {filterState.cohortYear.length === 0 
                                ? "All Years" 
                                : filterState.cohortYear.length === 1 
                                  ? `Class of ${filterState.cohortYear[0]}`
                                  : `${filterState.cohortYear.length} years selected`
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {[2024, 2023, 2022, 2021, 2020, 2019, 2018].map(year => (
                              <SelectItem key={year} value={year.toString()}>Class of {year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Currently Enrolled</label>
                        <Select 
                          value={filterState.currentlyEnrolled.length === 0 ? 'all' : filterState.currentlyEnrolled[0]} 
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setFilterState(prev => ({ ...prev, currentlyEnrolled: [] }));
                            } else {
                              setFilterState(prev => ({ ...prev, currentlyEnrolled: [value] }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {filterState.currentlyEnrolled.length === 0 
                                ? "All" 
                                : filterState.currentlyEnrolled[0] === 'true' ? 'Yes' : 'No'
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Employment Section */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Employment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Employment Status</label>
                        <Select 
                          value={filterState.employed.length === 0 ? 'all' : filterState.employed[0]} 
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setFilterState(prev => ({ ...prev, employed: [] }));
                            } else {
                              setFilterState(prev => ({ ...prev, employed: [value] }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {filterState.employed.length === 0 
                                ? "All" 
                                : filterState.employed[0] === 'true' ? 'Employed' : 'Unemployed'
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="true">Employed</SelectItem>
                            <SelectItem value="false">Unemployed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 pb-4 print:pb-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {timelineData.length} contacts from {(() => {
                  const { dateFrom, dateTo } = getDateRange();
                  return `${format(parseISO(dateFrom), 'MMM d, yyyy')} to ${format(parseISO(dateTo), 'MMM d, yyyy')}`;
                })()}
              </div>
              <div className="text-sm text-gray-600 print:hidden">
                {sortedDates.length} days with activity
              </div>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="px-6 pb-6">
            {sortedDates.length === 0 ? (
              <div className="p-8 text-center border border-gray-200 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-600">
                  No contact activities found for the selected date range and filters.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map((date, dayIndex) => (
                  <div key={date} className="print:break-inside-avoid">
                    {/* Day Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 pb-2 print:static print:bg-white">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                        </h2>
                        <Badge variant="secondary">
                          {groupedInteractions[date].length} contact{groupedInteractions[date].length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {dayIndex < sortedDates.length - 1 && (
                        <div className="h-px bg-gray-200 mt-2 print:hidden" />
                      )}
                    </div>

                    {/* Day's Interactions */}
                    <div className="ml-4 space-y-3 print:ml-0">
                      {groupedInteractions[date].map((interaction, index) => (
                        <div key={interaction.id} className="relative print:break-inside-avoid">
                          {/* Timeline dot and line */}
                          <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 print:hidden">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            {index < groupedInteractions[date].length - 1 && (
                              <div className="absolute left-1/2 top-full w-px h-6 bg-gray-300 -translate-x-1/2"></div>
                            )}
                          </div>

                          {/* Interaction Card */}
                          <Card className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {format(parseISO(interaction.createdAt), 'h:mm a')}
                                </div>
                                <Badge variant="outline">
                                  {interaction.type}
                                </Badge>
                                {interaction.needsFollowUp && (
                                  <Badge variant="destructive">
                                    Follow-up needed
                                  </Badge>
                                )}
                                {interaction.studentResponded && (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    Connected
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  {interaction.creatorFirstName && interaction.creatorLastName 
                                    ? `${interaction.creatorFirstName} ${interaction.creatorLastName}` 
                                    : 'Unknown Staff'
                                  }
                                </span>
                                <span className="text-gray-500 mx-2">contacted</span>
                                <Link 
                                  href={`/alumni/${interaction.alumniId}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {interaction.alumniFirstName} {interaction.alumniLastName}
                                </Link>
                                <span className="text-xs text-gray-500 ml-2">
                                  (Class of {interaction.alumniCohortYear})
                                </span>
                              </div>

                              {(interaction.overview || interaction.internalSummary) && (
                                <div className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-md">
                                  {interaction.internalSummary || interaction.overview}
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}