import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, X, Filter, ArrowUp, ArrowDown, Pin, PinOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Alumni } from '@shared/schema';
import { CollegePicker } from '@/components/CollegePicker';
import type { FilterState, SortField, SortDirection } from '@/utils/alumniHelpers';

interface AlumniSheetsViewProps {
  alumni: Alumni[];
  searchTerm: string;
  filterState: FilterState;
  page: number;
  limit: number;
  onAlumniClick: (alumnus: Alumni) => void;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  onFilterChange?: (filters: FilterState['filters']) => void;
  onColumnViewModeChange?: (viewMode: ColumnViewMode) => void;
}

type ColumnViewMode = 'basic' | 'expanded' | 'all';

interface ColumnGroup {
  label: string;
  columns: string[];
}

interface EditingCell {
  alumniId: number;
  column: string;
}

interface EditableInputProps {
  value: string;
  column: string;
  alumni: Alumni;
  onSave: (value: string) => void;
  onCancel: () => void;
}

// SortField imported from alumniHelpers

const EditableInput: React.FC<EditableInputProps> = ({ value, column, alumni, onSave, onCancel }) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(inputValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave(inputValue);
  };

  // Dropdown options for certain fields
  const getOptions = () => {
    switch (column) {
      case 'trackingStatus':
        return ['on-track', 'near-track', 'at-risk', 'off-track', 'unknown'];
      case 'supportCategory':
        return ['high', 'medium', 'low', ''];
      case 'pathType':
        return ['', 'college', 'work', 'training', 'military', 'other'];
      // Removed matriculation dropdown - now derived/read-only
      case 'connected':
      case 'currentlyEnrolled':
      case 'receivedScholarships':
      case 'employed':
      case 'needsFollowUp':
        return ['Yes', 'No'];
      case 'enrollmentStatus':
        return ['enrolled', 'graduated', 'dropped-out', 'transferred', 'on-leave', ''];
      case 'employmentType':
        return ['full-time', 'part-time', 'contract', 'internship', 'freelance', ''];
      default:
        return null;
    }
  };

  const options = getOptions();

  // Special handling for college selection
  if (column === 'collegeAttending') {
    return (
      <CollegePicker
        value={inputValue}
        onChange={(college) => {
          setInputValue(college);
          onSave(college);
        }}
        placeholder="Search colleges..."
      />
    );
  }

  if (options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full px-1 py-0 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || '(empty)'}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={column === 'cohortYear' ? 'number' : 'text'}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-full px-1 py-0 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
};

const AlumniSheetsView: React.FC<AlumniSheetsViewProps> = ({ 
  alumni, 
  searchTerm, 
  filterState, 
  page,
  limit,
  onAlumniClick,
  onSortChange,
  onFilterChange,
  onColumnViewModeChange
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set(['firstName', 'lastName'])); // Default pin first and last name
  const rowNumRef = useRef<HTMLTableCellElement>(null);
  const [actualRowWidth, setActualRowWidth] = useState(49);
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Google Sheets-style initial column widths (mostly 100px with slight variations)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    contactId: 80,
    firstName: 100,
    lastName: 100,
    cohortYear: 100,
    phone: 100,
    collegeAttending: 100,
    employerName: 100,
    trainingProgramName: 100,
    trainingProgramType: 100,
    trainingProgramLocation: 100,
    trainingStartDate: 100,
    trainingEndDate: 100,
    collegeMajor: 100,
    collegeMinor: 100,
    degreeTrack: 100,
    intendedCareerPath: 100,
    dateOfBirth: 100,
    highSchoolGpa: 100,
    currentSalary: 100,
    latestIncomeDate: 100,
    instagramHandle: 100,
    twitterHandle: 100,
    tiktokHandle: 100,
    linkedinHandle: 100,
    dropoutDate: 100,
    currentStage: 100,
    scholarshipsRequiringRenewal: 100,
    transferStudentStatus: 100,
    trackingStatus: 100,
    email: 140,  // Slightly wider for emails
    connected: 90,
    lastContactDate: 100,
    supportCategory: 100,
    notes: 160,  // Slightly wider for reading notes
    matriculation: 100,
    transcriptCollected: 100,
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [columnViewMode, setColumnViewMode] = useState<ColumnViewMode>('basic');
  const queryClient = useQueryClient();

  // Define filterable columns (columns that should show filter checkboxes)
  const filterableColumns = new Set([
    'cohortYear',
    'trackingStatus',
    'connected',
    'supportCategory',
    'currentlyEnrolled',
    'employed',
    'receivedScholarships',
    'needsFollowUp',
    'enrollmentStatus',
    'employmentType',
    'collegeAttending'
  ]);

  // Get unique values for a filterable column
  const getUniqueColumnValues = (columnKey: string): string[] => {
    const values = new Set<string>();
    alumni.forEach(alumnus => {
      const value = getCellValue(alumnus, columnKey);
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  };

  // Mutation for updating alumni data
  const updateAlumniMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Alumni> }) => {
      return await apiRequest('PATCH', `/api/alumni/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate all alumni-related queries to ensure immediate UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni-paginated'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        Boolean(query.queryKey[0] && String(query.queryKey[0]).includes('alumni'))
      });
    },
  });

  // All available columns organized to match detail page flow (Overview → Education → Employment)
  const allColumnDefs = {
    // Present (Overview Tab - all current info)
    contactId: { key: 'contactId', label: 'Contact ID', group: 'Present' },
    firstName: { key: 'firstName', label: 'First Name', group: 'Present' },
    lastName: { key: 'lastName', label: 'Last Name', group: 'Present' },
    cohortYear: { key: 'cohortYear', label: 'Cohort Year', group: 'Present' },
    
    // Contact (Overview Tab - Contact Section)
    phone: { key: 'phone', label: 'Mobile Number', group: 'Present' },
    compSciHighEmail: { key: 'compSciHighEmail', label: 'CSH Email', group: 'Present' },
    personalEmail: { key: 'personalEmail', label: 'Personal Email', group: 'Present' },
    email: { key: 'email', label: 'Preferred Email', group: 'Present' },
    connected: { key: 'connected', label: 'Connected', group: 'Present' },
    
    // Social Media (Overview Tab - Social Media Section)
    instagramHandle: { key: 'instagramHandle', label: 'Instagram', group: 'Present' },
    twitterHandle: { key: 'twitterHandle', label: 'Twitter', group: 'Present' },
    linkedinHandle: { key: 'linkedinHandle', label: 'LinkedIn', group: 'Present' },
    tiktokHandle: { key: 'tiktokHandle', label: 'TikTok', group: 'Present' },
    
    // Personal (Overview Tab - Personal Section)
    dateOfBirth: { key: 'dateOfBirth', label: 'Date of Birth', group: 'Present' },
    highSchoolGpa: { key: 'highSchoolGpa', label: 'HS GPA', group: 'Present' },
    supportCategory: { key: 'supportCategory', label: 'Grouping', group: 'Present' },
    pathType: { key: 'pathType', label: 'Path', group: 'Present' },
    currentStage: { key: 'currentStage', label: 'Current Stage', group: 'Present' },
    
    // Recent Activity (Overview Tab - Recent Activity Section)
    lastContactDate: { key: 'lastContactDate', label: 'Last Attempted Outreach', group: 'Present' },
    needsFollowUp: { key: 'needsFollowUp', label: 'Needs Follow Up', group: 'Present' },
    
    // Education (Education Tab - all education-related fields)
    collegeAttending: { key: 'collegeAttending', label: 'College Attending', group: 'Education' },
    collegeProgram: { key: 'collegeProgram', label: 'Program', group: 'Education' },
    collegeMajor: { key: 'collegeMajor', label: 'Major', group: 'Education' },
    collegeMinor: { key: 'collegeMinor', label: 'Minor', group: 'Education' },
    degreeTrack: { key: 'degreeTrack', label: 'Degree Track', group: 'Education' },
    intendedCareerPath: { key: 'intendedCareerPath', label: 'Intended Career', group: 'Education' },
    collegeGpa: { key: 'collegeGpa', label: 'College GPA', group: 'Education' },
    
    // Education Status (Education Tab - Status Section)
    enrollmentStatus: { key: 'enrollmentStatus', label: 'Enrollment Status', group: 'Education' },
    expectedGraduationDate: { key: 'expectedGraduationDate', label: 'Expected Graduation', group: 'Education' },
    transferStudentStatus: { key: 'transferStudentStatus', label: 'Transfer Status', group: 'Education' },
    currentlyEnrolled: { key: 'currentlyEnrolled', label: 'Currently Enrolled', group: 'Education' },
    
    // Support (Education Tab - Support Section)
    receivedScholarships: { key: 'receivedScholarships', label: 'Received Scholarships', group: 'Education' },
    scholarshipsRequiringRenewal: { key: 'scholarshipsRequiringRenewal', label: 'Scholarship Renewals', group: 'Education' },
    
    // Career (Employment Tab - all career-related fields)
    employed: { key: 'employed', label: 'Employed', group: 'Career' },
    employerName: { key: 'employerName', label: 'Employer Name', group: 'Career' },
    employmentType: { key: 'employmentType', label: 'Employment Type', group: 'Career' },
    currentSalary: { key: 'currentSalary', label: 'Current Salary', group: 'Career' },
    latestAnnualIncome: { key: 'latestAnnualIncome', label: 'Latest Annual Income', group: 'Career' },
    latestIncomeDate: { key: 'latestIncomeDate', label: 'Income Date', group: 'Career' },
    
    // Training (Employment Tab - Job Training Section)
    trainingProgramName: { key: 'trainingProgramName', label: 'Training Program', group: 'Career' },
    trainingProgramType: { key: 'trainingProgramType', label: 'Training Type', group: 'Career' },
    trainingProgramLocation: { key: 'trainingProgramLocation', label: 'Training Location', group: 'Career' },
    trainingStartDate: { key: 'trainingStartDate', label: 'Training Start', group: 'Career' },
    trainingEndDate: { key: 'trainingEndDate', label: 'Training End', group: 'Career' },
    
    // Tracking (System tracking - part of Present status)
    trackingStatus: { key: 'trackingStatus', label: 'Track', group: 'Present' },
    dropoutDate: { key: 'dropoutDate', label: 'Dropout Date', group: 'Present' },
    
    // Legacy/Client Import Fields (part of Present status)
    matriculation: { key: 'matriculation', label: 'Matriculation', group: 'Present' },
    transcriptCollected: { key: 'transcriptCollected', label: 'Transcript', group: 'Present' },
    
    // 12. Notes (Final section - always at the end)
    notes: { key: 'notes', label: 'Notes', group: 'Notes' },
  };

  // Column sets for different view modes
  const columnSets = {
    basic: [
      // Present (core identity & tracking)
      'firstName', 'lastName', 'cohortYear', 'pathType', 'currentStage', 'trackingStatus', 'supportCategory', 'lastContactDate', 'phone', 'email',
      // Education 
      'collegeAttending', 'currentlyEnrolled',
      // Career
      'employed', 'employerName'
    ],
    expanded: [
      // Present (core identity, contact, tracking, sensitive/admin)
      'firstName', 'lastName', 'cohortYear', 'contactId', 'pathType', 'currentStage', 'trackingStatus', 'supportCategory', 'lastContactDate', 
      'phone', 'personalEmail', 'compSciHighEmail', 'instagramHandle', 'linkedinHandle',
      'dateOfBirth', 'highSchoolGpa',
      
      // Education (comprehensive + support/scholarships)
      'collegeAttending', 'collegeProgram', 'collegeMajor', 'collegeGpa', 'collegeMinor', 'currentlyEnrolled', 'enrollmentStatus', 'expectedGraduationDate', 'transferStudentStatus',
      'receivedScholarships', 'scholarshipsRequiringRenewal',
      
      // Career (employment + job training)
      'employed', 'employerName', 'employmentType', 'currentSalary', 'latestAnnualIncome',
      'trainingProgramName', 'trainingProgramType', 'trainingProgramLocation', 'trainingStartDate', 'trainingEndDate',
      
      // Notes
      'notes'
    ],
    all: [
      // Present (all Present group fields)
      'contactId', 'firstName', 'lastName', 'cohortYear', 'phone', 'compSciHighEmail', 'personalEmail', 'email', 'connected', 'instagramHandle', 'twitterHandle', 'linkedinHandle', 'tiktokHandle', 'dateOfBirth', 'highSchoolGpa', 'supportCategory', 'pathType', 'currentStage', 'lastContactDate', 'needsFollowUp', 'trackingStatus', 'dropoutDate', 'matriculation', 'transcriptCollected',
      
      // Education (all Education group fields)
      'collegeAttending', 'collegeProgram', 'collegeMajor', 'collegeMinor', 'degreeTrack', 'intendedCareerPath', 'collegeGpa', 'enrollmentStatus', 'expectedGraduationDate', 'transferStudentStatus', 'currentlyEnrolled', 'receivedScholarships', 'scholarshipsRequiringRenewal',
      
      // Career (all Career group fields)
      'employed', 'employerName', 'employmentType', 'currentSalary', 'latestAnnualIncome', 'latestIncomeDate', 'trainingProgramName', 'trainingProgramType', 'trainingProgramLocation', 'trainingStartDate', 'trainingEndDate',
      
      // Notes
      'notes'
    ]
  };

  // Get current columns based on view mode
  const allColumns = columnSets[columnViewMode].map(key => allColumnDefs[key as keyof typeof allColumnDefs]);
  
  // Separate pinned and unpinned columns, preserving original order for each group
  const pinnedColumnsArray = allColumns.filter(col => pinnedColumns.has(col.key));
  const unpinnedColumnsArray = allColumns.filter(col => !pinnedColumns.has(col.key));
  const columns = [...pinnedColumnsArray, ...unpinnedColumnsArray];
  

  // Create column groups for headers
  const columnGroups = useMemo(() => {
    const groups: ColumnGroup[] = [];
    let currentGroup = '';
    let currentColumns: string[] = [];

    columns.forEach(col => {
      if (col.group !== currentGroup) {
        // Save previous group if it exists
        if (currentGroup && currentColumns.length > 0) {
          groups.push({ label: currentGroup, columns: [...currentColumns] });
        }
        // Start new group
        currentGroup = col.group;
        currentColumns = [col.key];
      } else {
        // Add to current group
        currentColumns.push(col.key);
      }
    });

    // Add the last group
    if (currentGroup && currentColumns.length > 0) {
      groups.push({ label: currentGroup, columns: [...currentColumns] });
    }

    return groups;
  }, [columns]);

  // Pin/Unpin functionality
  const isPinnable = (columnKey: string) => {
    // Name columns are now pinned as a group, so no individual pinning
    return false;
  };

  const handleTogglePin = (columnKey: string) => {
    if (!isPinnable(columnKey)) return;
    
    const newPinnedColumns = new Set(pinnedColumns);
    if (pinnedColumns.has(columnKey)) {
      newPinnedColumns.delete(columnKey);
    } else {
      newPinnedColumns.add(columnKey);
    }
    setPinnedColumns(newPinnedColumns);
  };

  // Handle group-level pin toggle for NAME group
  const handleToggleNameGroup = () => {
    const isNameGroupPinned = pinnedColumns.has('firstName') && pinnedColumns.has('lastName');
    const newPinnedColumns = new Set(pinnedColumns);
    
    if (isNameGroupPinned) {
      // Unpin both name columns
      newPinnedColumns.delete('firstName');
      newPinnedColumns.delete('lastName');
    } else {
      // Pin both name columns
      newPinnedColumns.add('firstName');
      newPinnedColumns.add('lastName');
    }
    
    setPinnedColumns(newPinnedColumns);
  };



  // Column header dropdown component
  const ColumnHeaderDropdown = ({ column, onClose }: { column: any; onClose: () => void }) => {
    const isFilterable = filterableColumns.has(column.key);
    const uniqueValues = isFilterable ? getUniqueColumnValues(column.key) : [];
    const currentFilters = filterState?.filters?.[column.key as keyof FilterState['filters']] || [];
    const columnIsPinnable = isPinnable(column.key);
    const columnIsPinned = pinnedColumns.has(column.key);
    
    const handleSortClick = (direction: SortDirection) => {
      if (onSortChange) {
        onSortChange(column.key as SortField, direction);
      }
      onClose();
    };

    const handlePinToggle = () => {
      handleTogglePin(column.key);
      onClose();
    };

    const handleFilterChange = (value: string, checked: boolean) => {
      if (!onFilterChange || !isFilterable) return;
      
      const currentValues = Array.isArray(currentFilters) ? currentFilters as string[] : [];
      const newValues = checked 
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);
      
      onFilterChange({
        ...filterState.filters,
        [column.key]: newValues
      });
    };

    const handleSelectAll = () => {
      if (!onFilterChange || !isFilterable) return;
      const currentArray = Array.isArray(currentFilters) ? currentFilters as string[] : [];
      const allSelected = uniqueValues.every(value => currentArray.includes(value));
      
      onFilterChange({
        ...filterState.filters,
        [column.key]: allSelected ? [] : uniqueValues
      });
    };

    return (
      <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg min-w-[200px] max-w-[300px]">
        {/* Pin Option (only for firstName and lastName) */}
        {columnIsPinnable && (
          <div className="p-2 border-b border-gray-200">
            <button
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
              onClick={handlePinToggle}
            >
              {columnIsPinned ? (
                <>
                  <PinOff className="w-3 h-3" />
                  Unpin Column
                </>
              ) : (
                <>
                  <Pin className="w-3 h-3" />
                  Pin Column
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Sort Options */}
        <div className="p-2 border-b border-gray-200">
          <button
            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            onClick={() => handleSortClick('asc')}
          >
            <ArrowUp className="w-3 h-3" />
            Sort A → Z
          </button>
          <button
            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            onClick={() => handleSortClick('desc')}
          >
            <ArrowDown className="w-3 h-3" />
            Sort Z → A
          </button>
        </div>

        {/* Filter Options */}
        {isFilterable && uniqueValues.length > 0 && (
          <div className="p-2 max-h-64 overflow-y-auto">
            <div className="mb-2 pb-2 border-b border-gray-200">
              <button
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={handleSelectAll}
              >
                {uniqueValues.every(value => 
                  Array.isArray(currentFilters) && (currentFilters as string[]).includes(value)
                ) ? 'Clear All' : 'Select All'}
              </button>
            </div>
            {uniqueValues.map(value => (
              <label key={value} className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(currentFilters) && (currentFilters as string[]).includes(value)}
                  onChange={(e) => handleFilterChange(value, e.target.checked)}
                  className="w-3 h-3"
                />
                <span className="truncate">{value || '(empty)'}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };


  const handleColumnHeaderClick = (column: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If clicking the chevron area, open dropdown
    const target = e.target as HTMLElement;
    if (target.closest('[data-dropdown-trigger]')) {
      setOpenDropdown(openDropdown === column.key ? null : column.key);
      return;
    }
    
    // Otherwise, cycle through sort states: none -> asc -> desc -> none
    if (!onSortChange) return;
    
    const currentField = filterState?.sort?.field;
    const currentDirection = filterState?.sort?.direction;
    
    if (currentField === column.key) {
      if (currentDirection === 'asc') {
        onSortChange(column.key as SortField, 'desc');
      } else {
        // Currently desc or no sort, clear sort
        onSortChange(null as any, 'asc'); // Clear sort by passing null
      }
    } else {
      // Different column, start with asc
      onSortChange(column.key as SortField, 'asc');
    }
  };

  // Measure row number width once
  useEffect(() => {
    if (rowNumRef.current) {
      const width = rowNumRef.current.offsetWidth;
      if (width !== actualRowWidth) {
        setActualRowWidth(width);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnKey]);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartX;
    // Google Sheets-style minimum widths (very low, allowing extreme truncation)
    const getMinWidthForColumn = (columnKey: string) => {
      switch (columnKey) {
        case 'firstName': return 25;
        case 'lastName': return 25;
        case 'email': return 30;
        case 'notes': return 30;
        default: return 25;
      }
    };
    
    const newWidth = Math.max(getMinWidthForColumn(isResizing!), resizeStartWidth + deltaX);
    
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Add event listeners for mouse move and mouse up when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStartX, resizeStartWidth]);


  // Update column widths when view mode changes
  useEffect(() => {
    const newWidths: Record<string, number> = {};
    columns.forEach(col => {
      if (!columnWidths[col.key]) {
        // Set Google Sheets-style default widths for new columns
        switch (col.key) {
          case 'contactId': newWidths[col.key] = 80; break;
          case 'email': case 'personalEmail': case 'compSciHighEmail': newWidths[col.key] = 140; break;
          case 'notes': newWidths[col.key] = 160; break;
          default: newWidths[col.key] = 100; // Google Sheets standard
        }
      }
    });
    
    if (Object.keys(newWidths).length > 0) {
      setColumnWidths(prev => ({ ...prev, ...newWidths }));
    }
  }, [columnViewMode, columns]);

  const getMatriculationDisplay = (a: Alumni) => {
    // Derived view for unified "destination" display
    switch (a.pathType) {
      case 'college':
        // Show college name (with legacy fallback)
        if (a.collegeAttending === 'College' && a.matriculation) return a.matriculation;
        return a.collegeAttending || a.matriculation || '';
      case 'training':
        // Show training program with location
        const loc = a.trainingProgramLocation ? ` — ${a.trainingProgramLocation}` : '';
        return (a.trainingProgramName || '') + loc;
      case 'work':
        // Show employer
        return a.employerName || '';
      case 'military':
        // Show military service
        return a.employerName || '';
      case 'other':
        // Show other info
        return a.employerName || '';
      default:
        // Legacy rows - fallback to old matriculation field
        return a.matriculation || a.collegeAttending || '';
    }
  };

  const getCellValue = (alumni: Alumni, columnKey: string) => {
    switch (columnKey) {
      case 'contactId':
        return alumni.contactId || `A-${alumni.id.toString().padStart(4, '0')}`;
      case 'firstName':
        return alumni.firstName || '';
      case 'lastName':
        return alumni.lastName || '';
      case 'cohortYear':
        return alumni.cohortYear?.toString() || '';
      case 'phone':
        return alumni.phone || '';
      case 'collegeAttending':
        // Show college name with legacy fallback for old data
        if (alumni.collegeAttending === 'College' && alumni.matriculation) {
          return alumni.matriculation;
        }
        return alumni.collegeAttending || ''; // not a college path → leave blank
      case 'collegeMajor':
        return alumni.collegeMajor || '';
      case 'collegeProgram':
        return alumni.collegeProgram || '';
      case 'trackingStatus':
        return alumni.trackingStatus || 'unknown';
      case 'pathType':
        return alumni.pathType === 'college' ? 'College'
             : alumni.pathType === 'work' ? 'Work' 
             : alumni.pathType === 'training' ? 'Training'
             : alumni.pathType === 'military' ? 'Military'
             : alumni.pathType === 'other' ? 'Other'
             : '';
      case 'email':
        return alumni.preferredEmail === 'personalEmail' 
          ? alumni.personalEmail || ''
          : alumni.compSciHighEmail || '';
      case 'personalEmail':
        return alumni.personalEmail || '';
      case 'compSciHighEmail':
        return alumni.compSciHighEmail || '';
      case 'collegeGpa':
        return alumni.collegeGpa || '';
      case 'currentlyEnrolled':
        return alumni.currentlyEnrolled ? 'Yes' : 'No';
      case 'enrollmentStatus':
        return alumni.enrollmentStatus || '';
      case 'expectedGraduationDate':
        return alumni.expectedGraduationDate || '';
      case 'receivedScholarships':
        return alumni.receivedScholarships ? 'Yes' : 'No';
      case 'employed':
        return alumni.employed ? 'Yes' : 'No';
      case 'employerName':
        return alumni.employerName || '';
      case 'trainingProgramName':
        // For display: show program name with location if available
        // For editing: only edit the program name field itself
        return alumni.trainingProgramName || '';
      case 'latestAnnualIncome':
        return alumni.latestAnnualIncome || '';
      case 'employmentType':
        return alumni.employmentType || '';
      case 'dateOfBirth':
        return alumni.dateOfBirth || '';
      case 'highSchoolGpa':
        return alumni.highSchoolGpa || '';
      case 'collegeMinor':
        return alumni.collegeMinor || '';
      case 'degreeTrack':
        return alumni.degreeTrack || '';
      case 'intendedCareerPath':
        return alumni.intendedCareerPath || '';
      case 'scholarshipsRequiringRenewal':
        return alumni.scholarshipsRequiringRenewal || '';
      case 'transferStudentStatus':
        return alumni.transferStudentStatus || '';
      case 'trainingProgramType':
        return alumni.trainingProgramType || '';
      case 'trainingProgramLocation':
        return alumni.trainingProgramLocation || '';
      case 'trainingStartDate':
        return alumni.trainingStartDate || '';
      case 'trainingEndDate':
        return alumni.trainingEndDate || '';
      case 'currentSalary':
        return alumni.currentSalary ? `$${alumni.currentSalary.toLocaleString()}` : '';
      case 'latestIncomeDate':
        return alumni.latestIncomeDate || '';
      case 'instagramHandle':
        return alumni.instagramHandle || '';
      case 'twitterHandle':
        return alumni.twitterHandle || '';
      case 'tiktokHandle':
        return alumni.tiktokHandle || '';
      case 'linkedinHandle':
        return alumni.linkedinHandle || '';
      case 'dropoutDate':
        return alumni.dropoutDate || '';
      case 'currentStage':
        return alumni.currentStage || '';
      case 'notes':
        return alumni.notes || '';
      case 'needsFollowUp':
        return alumni.needsFollowUp ? 'Yes' : 'No';
      case 'connected':
        return (alumni.personalEmail || alumni.compSciHighEmail) ? 'Yes' : 'No';
      case 'lastContactDate':
        return alumni.lastContactDate || '';
      case 'supportCategory':
        return alumni.supportCategory || '';
      default:
        return '';
    }
  };

  // Local sorting for Sheets view (keeps server results unchanged elsewhere)
  const sortedAlumni = useMemo(() => {
    const sort = filterState?.sort;
    if (!sort?.field) return alumni;

    const field = sort.field as string;
    const dir = sort.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

    const toVal = (a: Alumni) => {
      const v = getCellValue(a, field);
      // normalize undefined/null to empty string for stable compare
      return v == null ? '' : v;
    };

    const numOrNull = (v: any) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const dateOrNull = (v: any) => {
      if (!v) return null;
      const t = Date.parse(String(v));
      return Number.isFinite(t) ? t : null;
    };

    return [...alumni].sort((a, b) => {
      const av = toVal(a), bv = toVal(b);

      // numeric compare if both look numeric
      const an = numOrNull(av), bn = numOrNull(bv);
      if (an !== null && bn !== null) return (an - bn) * dir;

      // date compare if both parse as dates
      const ad = dateOrNull(av), bd = dateOrNull(bv);
      if (ad !== null && bd !== null) return (ad - bd) * dir;

      // string/natural compare (case-insensitive, "A2" < "A10")
      return collator.compare(String(av), String(bv)) * dir;
    });
  }, [alumni, filterState?.sort]);

  const isEditable = (columnKey: string) => {
    return !['contactId', 'connected'].includes(columnKey);
  };

  const handleCellClick = (alumni: Alumni, columnKey: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (isEditable(columnKey)) {
      setEditingCell({ alumniId: alumni.id, column: columnKey });
    }
  };

  const handleCellSave = (alumni: Alumni, columnKey: string, value: string) => {
    // Map column keys to actual database fields
    const fieldMapping: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      cohortYear: 'cohortYear',
      phone: 'phone',
      pathType: 'pathType',
      collegeAttending: 'collegeAttending',
      collegeProgram: 'collegeProgram',
      collegeMajor: 'collegeMajor',
      trackingStatus: 'trackingStatus',
      email: alumni.preferredEmail === 'personalEmail' ? 'personalEmail' : 'compSciHighEmail',
      personalEmail: 'personalEmail',
      compSciHighEmail: 'compSciHighEmail',
      lastContactDate: 'lastContactDate',
      supportCategory: 'supportCategory',
      collegeGpa: 'collegeGpa',
      enrollmentStatus: 'enrollmentStatus',
      expectedGraduationDate: 'expectedGraduationDate',
      employerName: 'employerName',
      trainingProgramName: 'trainingProgramName',
      latestAnnualIncome: 'latestAnnualIncome',
      employmentType: 'employmentType',
      notes: 'notes',
      currentlyEnrolled: 'currentlyEnrolled',
      receivedScholarships: 'receivedScholarships',
      employed: 'employed',
      needsFollowUp: 'needsFollowUp',
      dateOfBirth: 'dateOfBirth',
      highSchoolGpa: 'highSchoolGpa',
      collegeMinor: 'collegeMinor',
      degreeTrack: 'degreeTrack',
      intendedCareerPath: 'intendedCareerPath',
      scholarshipsRequiringRenewal: 'scholarshipsRequiringRenewal',
      transferStudentStatus: 'transferStudentStatus',
      trainingProgramType: 'trainingProgramType',
      trainingProgramLocation: 'trainingProgramLocation',
      trainingStartDate: 'trainingStartDate',
      trainingEndDate: 'trainingEndDate',
      currentSalary: 'currentSalary',
      latestIncomeDate: 'latestIncomeDate',
      instagramHandle: 'instagramHandle',
      twitterHandle: 'twitterHandle',
      tiktokHandle: 'tiktokHandle',
      linkedinHandle: 'linkedinHandle',
      dropoutDate: 'dropoutDate',
      currentStage: 'currentStage',
    };

    const dbField = fieldMapping[columnKey];
    if (!dbField) return;

    let updateData: any = {};
    
    // Handle special field transformations
    if (['cohortYear', 'highSchoolGpa'].includes(columnKey)) {
      updateData[dbField] = value ? parseFloat(value) : null;
    } else if (columnKey === 'currentSalary') {
      // Remove dollar sign and commas for storage
      const cleanValue = value.replace(/[$,]/g, '');
      updateData[dbField] = cleanValue ? parseFloat(cleanValue) : null;
    } else if (['currentlyEnrolled', 'receivedScholarships', 'employed', 'needsFollowUp'].includes(columnKey)) {
      updateData[dbField] = value === 'Yes';
    } else {
      // Handle empty string as null for proper deletion
      updateData[dbField] = value.trim() === '' ? null : value;
    }

    updateAlumniMutation.mutate({ id: alumni.id, data: updateData });
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const formatTrackingStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'on-track': return 'On-Track';
      case 'near-track': return 'Near-Track';
      case 'off-track': return 'Off-Track';
      case 'unknown': return 'Unknown';
      default: return status || 'Unknown';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'on-track':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'near-track':
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'off-track':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-sm overflow-hidden">
      {/* Column View Selector */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {(['basic', 'expanded', 'all'] as ColumnViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setColumnViewMode(mode);
                  onColumnViewModeChange?.(mode);
                }}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  columnViewMode === mode
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table Header */}
      <div className="overflow-x-auto relative" style={{ cursor: isResizing ? 'col-resize' : 'default' }}>
        <table className="table-fixed border-collapse" style={{ width: '100%' }}>
          <colgroup>
            {/* Row number column */}
            <col style={{ width: `${actualRowWidth}px` }} />
            {/* Data columns */}
            {columns.map((column) => (
              <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />
            ))}
          </colgroup>
          <thead>
            {/* Group Headers */}
            <tr className="bg-gray-100 border-b border-gray-300">
              {/* Row number header - spans both rows */}
              <th ref={rowNumRef} rowSpan={2} className="px-2 py-2 text-xs font-medium text-gray-500 border-r border-b border-gray-300 text-center sticky left-0 z-[110] bg-gray-100" style={{ width: `${actualRowWidth}px`, minWidth: 0 }}>
                #
              </th>
              {columnGroups.map((group, groupIndex) => {
                const isNameGroup = group.label === 'Name';
                const isNameGroupPinned = isNameGroup && pinnedColumns.has('firstName') && pinnedColumns.has('lastName');
                
                return (
                  <th
                    key={`${group.label}-${groupIndex}`}
                    colSpan={group.columns.length}
                    className={`px-3 py-1 text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center ${
                      isNameGroupPinned ? 'bg-blue-100 sticky z-[105]' : 'bg-gray-100'
                    } ${isNameGroup ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
                    style={isNameGroupPinned ? { left: `${actualRowWidth}px`, width: `${columnWidths['firstName'] + columnWidths['lastName']}px` } : {}}
                    onClick={isNameGroup ? handleToggleNameGroup : undefined}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{group.label}</span>
                      {isNameGroup && (
                        isNameGroupPinned ? (
                          <PinOff className="w-3 h-3 text-blue-600" />
                        ) : (
                          <Pin className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100" />
                        )
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
            
            {/* Column Headers */}
            <tr className="bg-gray-50 border-b border-gray-300">
              {columns.map((column, index) => {
                const hasFilter = filterableColumns.has(column.key);
                const isFilterActive = Array.isArray(filterState?.filters?.[column.key as keyof FilterState['filters']]) && 
                  (filterState.filters[column.key as keyof FilterState['filters']] as any[])?.length > 0;
                const isDropdownOpen = openDropdown === column.key;
                
                return (
                  <th
                    key={column.key}
                    className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300 hover:bg-gray-100 relative ${
                      pinnedColumns.has(column.key) ? 
                        (column.key === 'firstName' ? 'sticky z-[100] bg-blue-50' : 
                         column.key === 'lastName' ? 'sticky z-[90] bg-blue-50' : '') : ''
                    }`}
                    style={{
                      minWidth: 0,
                      ...(column.key === 'firstName' && pinnedColumns.has(column.key) ? { left: `${actualRowWidth}px` } : 
                          column.key === 'lastName' && pinnedColumns.has(column.key) ? { left: `${actualRowWidth + columnWidths['firstName']}px` } : {})
                    }}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer min-w-0 w-full"
                      onClick={(e) => handleColumnHeaderClick(column, e)}
                    >
                      <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                        <span className="truncate">{column.label}</span>
                        {filterState?.sort?.field === column.key && (
                          <span className="text-gray-400 flex-shrink-0">
                            {filterState.sort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0" data-dropdown-trigger>
                        {isFilterActive && (
                          <Filter className="w-3 h-3 text-blue-600" />
                        )}
                        <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    
                    {/* Dropdown */}
                    {isDropdownOpen && (
                      <ColumnHeaderDropdown 
                        column={column} 
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    {/* Resize Handle */}
                    {index < columns.length - 1 && (
                      <div
                        className={`absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-200 bg-transparent flex items-center justify-center group ${
                          pinnedColumns.has(column.key) ? 'z-10' : 'z-40'
                        }`}
                        onMouseDown={(e) => handleResizeStart(column.key, e)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginRight: '-4px' }}
                      >
                        <div className="w-0.5 h-4 bg-gray-300 group-hover:bg-blue-400 transition-colors" />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {sortedAlumni.map((alumnus, index) => (
              <tr
                key={alumnus.id}
                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer text-sm"
                onClick={() => onAlumniClick(alumnus)}
              >
                {/* Row number */}
                <td className="px-2 py-1 text-xs text-gray-500 border-r border-b border-gray-200 text-center sticky left-0 z-[110] bg-white">
                  {((page - 1) * limit) + index + 1}
                </td>
                {columns.map((column) => {
                  const isCurrentlyEditing = editingCell?.alumniId === alumnus.id && editingCell?.column === column.key;
                  const cellValue = getCellValue(alumnus, column.key);
                  // Special handling for notes - show actual content, even if empty
                  const displayValue = column.key === 'notes' ? cellValue : (cellValue || '-');
                  
                  return (
                    <td
                      key={column.key}
                      className={`px-3 py-1 border-r border-b border-gray-200 text-xs ${
                        isEditable(column.key) ? 'cursor-text hover:bg-blue-50' : ''
                      } ${isCurrentlyEditing ? 'bg-blue-50' : ''} ${
                        pinnedColumns.has(column.key) ? 
                          (column.key === 'firstName' ? 'sticky z-[100] bg-blue-50' : 
                           column.key === 'lastName' ? 'sticky z-[90] bg-blue-50' : '') : ''
                      }`}
                      style={{
                        minWidth: 0,
                        ...(column.key === 'firstName' && pinnedColumns.has(column.key) ? { left: `${actualRowWidth}px` } : 
                            column.key === 'lastName' && pinnedColumns.has(column.key) ? { left: `${actualRowWidth + columnWidths['firstName']}px` } : {})
                      }}
                      onClick={(e) => handleCellClick(alumnus, column.key, e)}
                    >
                      {isCurrentlyEditing ? (
                        <EditableInput
                          value={cellValue}
                          column={column.key}
                          alumni={alumnus}
                          onSave={(value) => handleCellSave(alumnus, column.key, value)}
                          onCancel={handleCellCancel}
                        />
                      ) : column.key === 'trackingStatus' ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(cellValue)}`}>
                          {formatTrackingStatus(cellValue)}
                        </span>
                      ) : (
                        <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
                          {displayValue}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlumniSheetsView;