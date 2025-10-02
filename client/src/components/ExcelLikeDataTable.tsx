import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { Users, Check, X, ChevronDown, ChevronRight, Folder, FolderOpen, List, Pin, PinOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Alumni } from "@shared/schema";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExcelLikeDataTableProps {
  alumni: Alumni[];
  page: number;
  searchTerm: string;
  filterState: any;
}

interface EditingCell {
  rowId: number;
  columnKey: string;
}

type GroupState = 'hidden' | 'essential' | 'expanded';

interface ColumnGroup {
  id: string;
  label: string;
  icon: typeof Folder;
  columns: {
    key: string;
    label: string;
    minWidth: number;
    editable: boolean;
    type: string;
    priority: 'essential' | 'expanded';
  }[];
}

// Define column groups matching alumni detail structure with ALL fields
const COLUMN_GROUPS: ColumnGroup[] = [
  {
    id: 'name',
    label: 'NAME',
    icon: Users,
    columns: [
      { key: 'firstName', label: 'First Name', minWidth: 100, editable: true, type: 'text', priority: 'essential' },
      { key: 'lastName', label: 'Last Name', minWidth: 100, editable: true, type: 'text', priority: 'essential' },
    ]
  },
  {
    id: 'overview',
    label: 'Overview',
    icon: List,
    columns: [
      // Essential: Core status and demographic info (removed firstName/lastName)
      { key: 'trackingStatus', label: 'Status', minWidth: 120, editable: true, type: 'select', priority: 'essential' },
      // Expanded: Add contact & demographics
      { key: 'cohortYear', label: 'Cohort', minWidth: 80, editable: true, type: 'number', priority: 'expanded' },
      { key: 'phone', label: 'Phone', minWidth: 130, editable: true, type: 'tel', priority: 'expanded' },
      { key: 'personalEmail', label: 'Personal Email', minWidth: 180, editable: true, type: 'email', priority: 'expanded' },
      { key: 'dateOfBirth', label: 'Birth Date', minWidth: 110, editable: true, type: 'date', priority: 'expanded' },
      { key: 'compSciHighEmail', label: 'School Email', minWidth: 150, editable: true, type: 'email', priority: 'expanded' },
      { key: 'collegeEmail', label: 'College Email', minWidth: 150, editable: true, type: 'email', priority: 'expanded' },
      { key: 'preferredEmail', label: 'Preferred Email', minWidth: 160, editable: true, type: 'email', priority: 'expanded' },
      { key: 'instagramHandle', label: 'Instagram', minWidth: 100, editable: true, type: 'text', priority: 'expanded' },
      { key: 'linkedinHandle', label: 'LinkedIn', minWidth: 100, editable: true, type: 'text', priority: 'expanded' },
      { key: 'twitterHandle', label: 'Twitter', minWidth: 80, editable: true, type: 'text', priority: 'expanded' },
      { key: 'tiktokHandle', label: 'TikTok', minWidth: 80, editable: true, type: 'text', priority: 'expanded' },
      { key: 'householdSize', label: 'Household Size', minWidth: 120, editable: true, type: 'number', priority: 'expanded' },
      { key: 'householdIncome', label: 'Household Income', minWidth: 140, editable: true, type: 'text', priority: 'expanded' },
      { key: 'pathType', label: 'Path Type', minWidth: 100, editable: true, type: 'select', priority: 'expanded' },
      { key: 'currentStage', label: 'Current Stage', minWidth: 120, editable: true, type: 'text', priority: 'expanded' },
      { key: 'militaryService', label: 'Military Service', minWidth: 120, editable: true, type: 'boolean', priority: 'expanded' },
    ]
  },
  {
    id: 'education',
    label: 'Education',
    icon: FolderOpen,
    columns: [
      // Essential: Core education info
      { key: 'collegeAttending', label: 'College', minWidth: 180, editable: true, type: 'text', priority: 'essential' },
      { key: 'collegeMajor', label: 'Major', minWidth: 120, editable: true, type: 'text', priority: 'essential' },
      { key: 'collegeGpa', label: 'College GPA', minWidth: 100, editable: true, type: 'text', priority: 'essential' },
      // Expanded: All education fields
      { key: 'collegeMinor', label: 'Minor', minWidth: 100, editable: true, type: 'text', priority: 'expanded' },
      { key: 'degreeTrack', label: 'Degree Track', minWidth: 120, editable: true, type: 'text', priority: 'expanded' },
      { key: 'intendedCareerPath', label: 'Career Path', minWidth: 140, editable: true, type: 'text', priority: 'expanded' },
      { key: 'currentlyEnrolled', label: 'Enrolled', minWidth: 80, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'enrollmentStatus', label: 'Enrollment Status', minWidth: 140, editable: true, type: 'text', priority: 'expanded' },
      { key: 'expectedGraduationDate', label: 'Grad Date', minWidth: 110, editable: true, type: 'date', priority: 'expanded' },
      { key: 'receivedScholarships', label: 'Has Scholarships', minWidth: 120, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'scholarshipsRequiringRenewal', label: 'Renewal Needed', minWidth: 130, editable: true, type: 'text', priority: 'expanded' },
      { key: 'enrolledInOpportunityProgram', label: 'Opportunity Program', minWidth: 150, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'transferStudentStatus', label: 'Transfer Status', minWidth: 130, editable: true, type: 'text', priority: 'expanded' },
      { key: 'highSchoolGpa', label: 'HS GPA', minWidth: 80, editable: true, type: 'text', priority: 'expanded' },
      { key: 'matriculation', label: 'Matriculation', minWidth: 120, editable: true, type: 'text', priority: 'expanded' },
      { key: 'collegeOrWorkforce', label: 'College/Workforce', minWidth: 140, editable: true, type: 'text', priority: 'expanded' },
      { key: 'track', label: 'Track', minWidth: 80, editable: true, type: 'text', priority: 'expanded' },
      { key: 'transcriptCollected', label: 'Transcript', minWidth: 100, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'needsTutor', label: 'Needs Tutor', minWidth: 100, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'subjectSupport', label: 'Subject Support', minWidth: 130, editable: true, type: 'text', priority: 'expanded' },
    ]
  },
  {
    id: 'career',
    label: 'Career',
    icon: Folder,
    columns: [
      // Essential: Employment basics
      { key: 'employed', label: 'Employed', minWidth: 90, editable: true, type: 'boolean', priority: 'essential' },
      { key: 'employerName', label: 'Employer', minWidth: 140, editable: true, type: 'text', priority: 'essential' },
      { key: 'latestAnnualIncome', label: 'Annual Income', minWidth: 120, editable: true, type: 'text', priority: 'essential' },
      // Expanded: All career fields
      { key: 'employmentType', label: 'Employment Type', minWidth: 130, editable: true, type: 'text', priority: 'expanded' },
      { key: 'latestIncomeDate', label: 'Income Date', minWidth: 110, editable: true, type: 'date', priority: 'expanded' },
      { key: 'currentSalary', label: 'Current Salary', minWidth: 120, editable: true, type: 'number', priority: 'expanded' },
      { key: 'salaryLastUpdated', label: 'Salary Updated', minWidth: 130, editable: true, type: 'date', priority: 'expanded' },
      { key: 'salaryDataConsent', label: 'Salary Consent', minWidth: 120, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'onCourseEconomicLiberation', label: 'Economic Liberation', minWidth: 150, editable: true, type: 'boolean', priority: 'expanded' },
      // Training Programs
      { key: 'trainingProgramName', label: 'Training Program', minWidth: 150, editable: true, type: 'text', priority: 'expanded' },
      { key: 'trainingProgramType', label: 'Training Type', minWidth: 130, editable: true, type: 'text', priority: 'expanded' },
      { key: 'trainingProgramLocation', label: 'Training Location', minWidth: 140, editable: true, type: 'text', priority: 'expanded' },
      { key: 'trainingProgramPay', label: 'Training Pay', minWidth: 110, editable: true, type: 'text', priority: 'expanded' },
      { key: 'trainingStartDate', label: 'Training Start', minWidth: 120, editable: true, type: 'date', priority: 'expanded' },
      { key: 'trainingEndDate', label: 'Training End', minWidth: 110, editable: true, type: 'date', priority: 'expanded' },
      { key: 'trainingDegreeCertification', label: 'Training Cert', minWidth: 120, editable: true, type: 'text', priority: 'expanded' },
    ]
  },
  {
    id: 'notes',
    label: 'Notes & Tracking',
    icon: List,
    columns: [
      // Essential: Communication basics
      { key: 'lastContactDate', label: 'Last Contact', minWidth: 120, editable: true, type: 'date', priority: 'essential' },
      { key: 'notes', label: 'Notes', minWidth: 180, editable: true, type: 'text', priority: 'essential' },
      { key: 'supportCategory', label: 'Support Category', minWidth: 140, editable: true, type: 'text', priority: 'essential' },
      // Expanded: All tracking fields
      { key: 'dropoutDate', label: 'Dropout Date', minWidth: 110, editable: true, type: 'date', priority: 'expanded' },
      { key: 'connectedAsOf', label: 'Connected As Of', minWidth: 130, editable: true, type: 'date', priority: 'expanded' },
      { key: 'attemptedOutreach', label: 'Attempted Outreach', minWidth: 140, editable: true, type: 'date', priority: 'expanded' },
      { key: 'circleBack', label: 'Circle Back', minWidth: 100, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'grouping', label: 'Grouping', minWidth: 90, editable: true, type: 'text', priority: 'expanded' },
      { key: 'needsFollowUp', label: 'Needs Follow Up', minWidth: 130, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'flaggedForOutreach', label: 'Flagged Outreach', minWidth: 130, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'reminderDate', label: 'Reminder Date', minWidth: 120, editable: true, type: 'date', priority: 'expanded' },
      { key: 'contactId', label: 'Contact ID', minWidth: 100, editable: true, type: 'text', priority: 'expanded' },
      { key: 'isArchived', label: 'Archived', minWidth: 80, editable: true, type: 'boolean', priority: 'expanded' },
      { key: 'createdAt', label: 'Created', minWidth: 110, editable: false, type: 'date', priority: 'expanded' },
      { key: 'updatedAt', label: 'Updated', minWidth: 110, editable: false, type: 'date', priority: 'expanded' },
    ]
  }
];

const TRACKING_STATUS_OPTIONS = [
  { value: 'on-track', label: 'On Track' },
  { value: 'near-track', label: 'Near Track' },
  { value: 'off-track', label: 'Off Track' },
  { value: 'unknown', label: 'Unknown' },
];

const PATH_TYPE_OPTIONS = [
  { value: 'college', label: 'College' },
  { value: 'vocation', label: 'Vocation' },
  { value: 'employment', label: 'Employment' },
];

export type VisibleColumnDef = {
  key: string;
  label: string;
  getValue: (alum: Alumni) => string | number | boolean | null | undefined;
};

export type ExcelLikeDataTableHandle = {
  getVisibleColumns: () => VisibleColumnDef[];
  getGroupStates: () => Record<string, GroupState>;
};

const ExcelLikeDataTable = forwardRef<ExcelLikeDataTableHandle, ExcelLikeDataTableProps>(
function ExcelLikeDataTable({ alumni, page, searchTerm, filterState }: ExcelLikeDataTableProps, ref) {
  const [, setLocation] = useLocation();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<Map<number, Map<string, any>>>(new Map());
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  
  // Group state management - default: NAME (essential), Overview (essential), Education (essential)
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({
    name: 'essential',      // Always visible - contains first/last name
    overview: 'essential',  // Never 0 - always status and core info
    education: 'essential', 
    career: 'hidden',
    notes: 'hidden'
  });

  // Frozen columns state - default to name columns
  const [frozenGroups, setFrozenGroups] = useState<string[]>(['name']);
  const MAX_FROZEN_COLUMNS = 4;

  // Column widths state - auto-calculated from content
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  
  // Resizing state
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Memoize visible columns
  const visibleColumns = useMemo(() => {
    const cols: any[] = [];
    COLUMN_GROUPS.forEach(group => {
      const state = groupStates[group.id];
      if (state === 'hidden') return;
      group.columns.forEach(col => {
        if (state === 'expanded' || col.priority === 'essential') {
          cols.push({ ...col, groupId: group.id, groupLabel: group.label });
        }
      });
    });
    return cols;
  }, [groupStates]);

  useImperativeHandle(ref, () => ({
    getVisibleColumns: () =>
      visibleColumns.map((c) => ({
        key: c.key,
        label: c.label,
        getValue: (alum: any) => {
          const v = alum?.[c.key];
          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
          return v ?? '';
        }
      })),
    getGroupStates: () => ({ ...groupStates })
  }), [visibleColumns, groupStates]);

  // Baseline computed widths (no state updates here)
  const computedWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    const count = visibleColumns.length;
    visibleColumns.forEach(column => {
      const headerLength = column.label?.length ?? 0;
      const base = Math.max(column.minWidth ?? 80, headerLength * 8 + 40);

      // Keep scaling gentle so expanded mode isn't microscopic
      let finalW = base;
      if (count > 20) finalW = Math.max(column.minWidth ?? 80, Math.round(base * 0.9));
      else if (count > 12) finalW = Math.max(column.minWidth ?? 80, Math.round(base * 0.95));

      widths[column.key] = finalW;
    });
    return widths;
  }, [visibleColumns]);

  // Helper to get the active width (manual resize overrides computed)
  const widthFor = (colKey: string) => columnWidths[colKey] ?? computedWidths[colKey] ?? 100;

  // Helper functions for frozen groups
  const isColumnFrozen = (columnKey: string): boolean => {
    const column = visibleColumns.find(col => col.key === columnKey);
    return column ? frozenGroups.includes(column.groupId) : false;
  };
  
  const getFrozenColumnLeftPosition = (columnKey: string): number => {
    const column = visibleColumns.find(col => col.key === columnKey);
    if (!column || !frozenGroups.includes(column.groupId)) return 0;
    
    let leftPosition = 0;
    
    // Calculate position by iterating through all frozen groups and their columns
    for (const groupId of frozenGroups) {
      const groupColumns = visibleColumns.filter(col => col.groupId === groupId);
      
      for (const col of groupColumns) {
        if (col.key === columnKey) {
          return leftPosition;
        }
        leftPosition += widthFor(col.key);
      }
    }
    
    return leftPosition;
  };

  const getTotalFrozenWidth = (): number => {
    let total = 0;
    for (const groupId of frozenGroups) {
      const groupColumns = visibleColumns.filter(col => col.groupId === groupId);
      total += groupColumns.reduce((sum, col) => sum + widthFor(col.key), 0);
    }
    return total;
  };

  const getTotalFrozenColumnCount = (): number => {
    return frozenGroups.reduce((count, groupId) => {
      return count + visibleColumns.filter(col => col.groupId === groupId).length;
    }, 0);
  };

  const toggleGroupFreeze = (groupId: string) => {
    setFrozenGroups(prev => {
      const isCurrentlyFrozen = prev.includes(groupId);
      
      if (isCurrentlyFrozen) {
        // Unfreeze: remove from frozen groups
        return prev.filter(id => id !== groupId);
      } else {
        // Freeze: add to frozen groups (respect max limit by checking total columns)
        const groupColumns = visibleColumns.filter(col => col.groupId === groupId);
        const currentFrozenColumnCount = prev.reduce((count, gId) => {
          return count + visibleColumns.filter(col => col.groupId === gId).length;
        }, 0);
        
        if (currentFrozenColumnCount + groupColumns.length > MAX_FROZEN_COLUMNS) {
          return prev; // Don't add if it would exceed max limit
        }
        return [...prev, groupId];
      }
    });
  };

  // Total width so the table can expand beyond the container
  const totalWidth = useMemo(
    () => visibleColumns.reduce((sum, c) => sum + widthFor(c.key), 0),
    [visibleColumns, columnWidths, computedWidths]
  );

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setIsResizing(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(widthFor(columnKey));
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(80, resizeStartWidth + deltaX);
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
  };

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

  // Reset column widths when group states change to force recalculation
  useEffect(() => {
    setColumnWidths({});
  }, [groupStates]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editingCell && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editingCell]);

  // Mutation for updating alumni data
  const updateAlumniMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Alumni> }) => {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update alumni');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate paginated list (current behavior preserved)
      queryClient.invalidateQueries({ queryKey: ['alumni', 'paginated', page, searchTerm, filterState] });
      // Also invalidate detail view to keep them in sync (following pattern from GeneralNoteModal.tsx)
      queryClient.invalidateQueries({ queryKey: [`/api/alumni/${data.id}`] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update alumni data",
        variant: "destructive",
      });
    }
  });

  // Toggle group state: Overview never hidden (essential -> expanded -> essential)
  // Other groups: hidden -> essential -> expanded -> hidden
  const toggleGroupState = (groupId: string) => {
    setGroupStates(prev => {
      const currentState = prev[groupId];
      let newState: GroupState;
      
      if (groupId === 'overview') {
        // Overview: essential (3) -> expanded (6+) -> essential (3)
        newState = currentState === 'essential' ? 'expanded' : 'essential';
      } else {
        // Other groups: hidden -> essential -> expanded -> hidden
        switch (currentState) {
          case 'hidden':
            newState = 'essential';
            break;
          case 'essential':
            newState = 'expanded';
            break;
          case 'expanded':
          default:
            newState = 'hidden';
            break;
        }
      }
      
      return { ...prev, [groupId]: newState };
    });
  };

  const handleCellClick = (alumnus: Alumni, columnKey: string, event: React.MouseEvent) => {
    const column = visibleColumns.find(col => col.key === columnKey);
    
    if (!column?.editable) {
      // If not editable, navigate to detail page
      handleAlumniClick(alumnus);
      return;
    }

    // Prevent row navigation when clicking on editable cell
    event.stopPropagation();
    
    // Start editing this cell
    setEditingCell({ rowId: alumnus.id, columnKey });
    const currentValue = (alumnus as any)[columnKey];
    setEditValue(String(currentValue || ''));
  };

  const handleAlumniClick = (alumnus: Alumni) => {
    setLocation(`/alumni/${alumnus.id}`);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const cellKey = `${editingCell.rowId}:${editingCell.columnKey}`;
    setSavingCells(prev => new Set([...Array.from(prev), cellKey]));

    try {
      const alumnus = alumni.find(a => a.id === editingCell.rowId);
      if (!alumnus) return;

      const column = visibleColumns.find((col: any) => col.key === editingCell.columnKey);
      if (!column) return;

      // Prepare the update data
      let updateValue: any = editValue;
      
      // Type conversion based on column type
      if (column.type === 'number') {
        updateValue = editValue === '' ? null : Number(editValue);
      } else if (column.type === 'boolean') {
        updateValue = editValue === 'true';
      }

      // Update pending changes
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(editingCell.rowId)) {
          newMap.set(editingCell.rowId, new Map());
        }
        newMap.get(editingCell.rowId)!.set(editingCell.columnKey, updateValue);
        return newMap;
      });

      // Save to database
      await updateAlumniMutation.mutateAsync({
        id: editingCell.rowId,
        data: { [editingCell.columnKey]: updateValue }
      });

      // Clear pending change after successful save
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        const rowChanges = newMap.get(editingCell.rowId);
        if (rowChanges) {
          rowChanges.delete(editingCell.columnKey);
          if (rowChanges.size === 0) {
            newMap.delete(editingCell.rowId);
          }
        }
        return newMap;
      });

      toast({
        title: "Updated successfully",
        description: `${column.label} has been updated.`,
      });

    } catch (error) {
      // Remove pending change on error
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        const rowChanges = newMap.get(editingCell.rowId);
        if (rowChanges) {
          rowChanges.delete(editingCell.columnKey);
          if (rowChanges.size === 0) {
            newMap.delete(editingCell.rowId);
          }
        }
        return newMap;
      });
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  const getCellValue = (alumnus: Alumni, columnKey: string): any => {
    // Check for pending changes first
    const pendingRowChanges = pendingChanges.get(alumnus.id);
    if (pendingRowChanges && pendingRowChanges.has(columnKey)) {
      return pendingRowChanges.get(columnKey);
    }
    // Return original value
    return (alumnus as any)[columnKey];
  };

  const isCellPending = (alumnus: Alumni, columnKey: string): boolean => {
    const pendingRowChanges = pendingChanges.get(alumnus.id);
    return pendingRowChanges ? pendingRowChanges.has(columnKey) : false;
  };

  const isCellSaving = (alumnus: Alumni, columnKey: string): boolean => {
    const cellKey = `${alumnus.id}:${columnKey}`;
    return savingCells.has(cellKey);
  };

  const renderCell = (alumnus: Alumni, column: any) => {
    const isEditing = editingCell?.rowId === alumnus.id && editingCell?.columnKey === column.key;
    const isPending = isCellPending(alumnus, column.key);
    const isSaving = isCellSaving(alumnus, column.key);
    const value = getCellValue(alumnus, column.key);

    if (isEditing) {
      // Render edit controls
      return (
        <div className="flex items-center space-x-1 w-full">
          {column.type === 'select' ? (
            <select
              ref={selectRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-1 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {column.key === 'trackingStatus' && TRACKING_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {column.key === 'pathType' && PATH_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : column.type === 'boolean' ? (
            <select
              ref={selectRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-1 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              type={column.type === 'email' ? 'email' : column.type === 'tel' ? 'tel' : column.type === 'number' ? 'number' : 'text'}
              className="w-full px-1 py-1 text-sm border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-green-100"
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              <Check className="w-3 h-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-red-100"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        </div>
      );
    }

    // Render display value with edit interaction
    return (
      <div
        className={`w-full h-full flex items-center px-2 py-1 rounded transition-colors ${
          column.editable ? 'hover:bg-blue-50 cursor-text' : 'cursor-pointer'
        } ${isPending ? 'bg-yellow-50 border border-yellow-200' : ''} ${
          isSaving ? 'bg-blue-50 opacity-50' : ''
        }`}
        onClick={(e) => handleCellClick(alumnus, column.key, e)}
      >
        {isSaving && (
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2 flex-shrink-0" />
        )}
        {column.key === 'employed' ? (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        ) : column.key === 'trackingStatus' ? (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'on-track' ? 'bg-green-100 text-green-800' :
            value === 'near-track' ? 'bg-yellow-100 text-yellow-800' :
            value === 'off-track' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {value || 'N/A'}
          </span>
        ) : column.key === 'latestAnnualIncome' && value ? (
          <span className="font-medium text-green-600">
            ${typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        ) : (
          <span className="truncate" title={String(value || '')}>
            {value || '-'}
          </span>
        )}
      </div>
    );
  };



  const getGroupIcon = (groupId: string, groupState: GroupState) => {
    const group = COLUMN_GROUPS.find(g => g.id === groupId);
    if (!group) return Folder;
    
    // Use the group's defined icon instead of generic folder icons
    if (groupState === 'hidden') return group.icon;
    return group.icon;
  };

  // Calculate group spans for merged headers, handling frozen columns
  const getGroupSpans = () => {
    const groupSpans: Array<{ 
      groupId: string, 
      label: string, 
      span: number, 
      state: GroupState,
      isFrozen?: boolean,
      leftPosition?: number,
      width?: number
    }> = [];
    
    
    let currentGroup = '';
    let currentSpan = 0;
    let currentFrozenCount = 0;
    let currentScrollableCount = 0;
    let currentFrozenWidth = 0;
    let currentScrollableWidth = 0;
    let currentLeftPosition = 0;
    
    visibleColumns.forEach((column) => {
      const isFrozen = isColumnFrozen(column.key);
      const columnWidth = widthFor(column.key);
      
      if (column.groupId !== currentGroup) {
        // Process previous group
        if (currentGroup && currentSpan > 0) {
          const groupState = groupStates[currentGroup];
          const groupLabel = COLUMN_GROUPS.find(g => g.id === currentGroup)?.label || currentGroup;
          
          // Add frozen portion if exists
          if (currentFrozenCount > 0) {
            groupSpans.push({ 
              groupId: currentGroup + '_frozen', 
              label: groupLabel, 
              span: currentFrozenCount, 
              state: groupState,
              isFrozen: true,
              leftPosition: currentLeftPosition - currentFrozenWidth,
              width: currentFrozenWidth
            });
          }
          
          // Add scrollable portion if exists
          if (currentScrollableCount > 0) {
            groupSpans.push({ 
              groupId: currentGroup + '_scrollable', 
              label: groupLabel, 
              span: currentScrollableCount, 
              state: groupState,
              isFrozen: false
            });
          }
        }
        
        // Reset for new group
        currentGroup = column.groupId;
        currentSpan = 1;
        currentFrozenCount = isFrozen ? 1 : 0;
        currentScrollableCount = isFrozen ? 0 : 1;
        currentFrozenWidth = isFrozen ? columnWidth : 0;
        currentScrollableWidth = isFrozen ? 0 : columnWidth;
        currentLeftPosition = isFrozen ? getFrozenColumnLeftPosition(column.key) + columnWidth : 0;
      } else {
        currentSpan++;
        if (isFrozen) {
          currentFrozenCount++;
          currentFrozenWidth += columnWidth;
          currentLeftPosition = getFrozenColumnLeftPosition(column.key) + columnWidth;
        } else {
          currentScrollableCount++;
          currentScrollableWidth += columnWidth;
        }
      }
    });
    
    // Process last group
    if (currentGroup && currentSpan > 0) {
      const groupState = groupStates[currentGroup];
      const groupLabel = COLUMN_GROUPS.find(g => g.id === currentGroup)?.label || currentGroup;
      
      if (currentFrozenCount > 0) {
        groupSpans.push({ 
          groupId: currentGroup + '_frozen', 
          label: groupLabel, 
          span: currentFrozenCount, 
          state: groupState,
          isFrozen: true,
          leftPosition: currentLeftPosition - currentFrozenWidth,
          width: currentFrozenWidth
        });
      }
      
      if (currentScrollableCount > 0) {
        groupSpans.push({ 
          groupId: currentGroup + '_scrollable', 
          label: groupLabel, 
          span: currentScrollableCount, 
          state: groupState,
          isFrozen: false
        });
      }
    }
    
    return groupSpans;
  };

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      {/* Group Toggle Controls */}
      <div className="border-b bg-gradient-to-r from-gray-50 to-gray-100 p-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            {COLUMN_GROUPS.map(group => {
              const groupState = groupStates[group.id];
              const IconComponent = getGroupIcon(group.id, groupState);
              const columnCount = groupState === 'hidden' ? '0' : 
                                groupState === 'essential' ? group.columns.filter(c => c.priority === 'essential').length.toString() : 
                                group.columns.length.toString();
              return (
                <button
                  key={group.id}
                  onClick={() => toggleGroupState(group.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    groupState === 'hidden' 
                      ? 'text-gray-500 bg-white border-gray-200 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm' 
                      : groupState === 'essential'
                      ? 'text-blue-800 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-md'
                      : 'text-green-800 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 shadow-md'
                  } ${group.id === 'overview' ? 'ring-1 ring-blue-200' : ''}`}
                  title={group.id === 'overview' ? 'Overview always visible (toggles between 3 and 16+ columns)' : 
                         `${group.label}: ${groupState === 'hidden' ? 'Hidden' : groupState === 'essential' ? 'Essential columns' : 'All columns'}`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{group.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    groupState === 'hidden' 
                      ? 'bg-gray-100 text-gray-600'
                      : groupState === 'essential'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {columnCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="table-auto min-w-max bg-white" style={{ width: totalWidth }}>
          <thead>
            {/* Group Header Row */}
            <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
              {getGroupSpans().map((groupSpan, index) => (
                <th
                  key={groupSpan.groupId}
                  colSpan={groupSpan.span}
                  className={`text-center py-3 px-4 font-bold text-sm border-r-2 border-gray-300 last:border-r-0 ${
                    groupSpan.state === 'essential' 
                      ? 'bg-gradient-to-b from-blue-100 to-blue-50 text-blue-900 border-blue-200' 
                      : 'bg-gradient-to-b from-green-100 to-green-50 text-green-900 border-green-200'
                  } ${index === 0 ? 'rounded-tl-lg' : ''} ${index === getGroupSpans().length - 1 ? 'rounded-tr-lg' : ''} ${
                    groupSpan.isFrozen ? 'sticky z-30 shadow-lg' : ''
                  }`}
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                    ...(groupSpan.isFrozen && groupSpan.leftPosition !== undefined && { 
                      left: groupSpan.leftPosition,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 2px 0 4px rgba(0, 0, 0, 0.15)'
                    })
                  }}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {(() => {
                      const baseGroupId = groupSpan.groupId.replace('_frozen', '').replace('_scrollable', '');
                      const IconComponent = getGroupIcon(baseGroupId, groupSpan.state);
                      return <IconComponent className="w-4 h-4" />;
                    })()}
                    <span className="font-bold tracking-wide">{groupSpan.label}</span>
                    <span className="text-xs bg-white bg-opacity-60 px-1.5 py-0.5 rounded-full font-medium">
                      {groupSpan.span}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
            
            {/* Column Header Row */}
            <tr className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-300">
              {visibleColumns.map((column, index) => {
                const columnWidth = widthFor(column.key);
                return (
                  <th
                    key={column.key}
                    className={`text-left px-4 py-3 font-semibold text-gray-800 text-sm border-r border-gray-200 last:border-r-0 whitespace-nowrap relative ${
                      isColumnFrozen(column.key) 
                        ? 'sticky bg-gray-50 shadow-lg border-r-2 border-blue-200 z-20' 
                        : ''
                    }`}
                    style={{ 
                      width: columnWidth,
                      minWidth: columnWidth,
                      ...(isColumnFrozen(column.key) && { 
                        left: getFrozenColumnLeftPosition(column.key),
                        boxShadow: 'inset -1px 0 0 rgba(59, 130, 246, 0.3), 2px 0 4px rgba(0, 0, 0, 0.1)'
                      })
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{column.label}</span>
                      <div className="flex items-center">
                        {/* Pin/Unpin button */}
                        <button
                          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                            frozenGroups.includes(column.groupId) ? 'text-blue-600' : 'text-gray-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupFreeze(column.groupId);
                          }}
                          title={frozenGroups.includes(column.groupId) ? `Unfreeze ${column.groupLabel}` : `Freeze ${column.groupLabel}`}
                          disabled={!frozenGroups.includes(column.groupId) && getTotalFrozenColumnCount() >= MAX_FROZEN_COLUMNS}
                        >
                          {frozenGroups.includes(column.groupId) ? (
                            <Pin className="w-3 h-3" />
                          ) : (
                            <PinOff className="w-3 h-3" />
                          )}
                        </button>
                        {/* Resize handle */}
                        <div
                          className="w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors ml-1"
                          onMouseDown={(e) => handleResizeStart(e, column.key)}
                          title="Drag to resize column"
                        />
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alumni.map((alumnus: Alumni, index) => (
              <tr
                key={alumnus.id}
                className={`transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                } hover:bg-blue-50/30`}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 border-r border-gray-100 last:border-r-0 text-sm text-gray-700 relative ${
                      isColumnFrozen(column.key) 
                        ? 'sticky bg-white shadow-lg border-r-2 border-blue-100 z-10' 
                        : ''
                    }`}
                    style={{ 
                      width: widthFor(column.key),
                      minWidth: widthFor(column.key),
                      ...(isColumnFrozen(column.key) && { 
                        left: getFrozenColumnLeftPosition(column.key),
                        boxShadow: 'inset -1px 0 0 rgba(59, 130, 246, 0.2), 2px 0 4px rgba(0, 0, 0, 0.05)'
                      })
                    }}
                  >
                    {renderCell(alumnus, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {alumni.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No alumni found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex items-center justify-between">
        <span>💡 Click any cell to edit • Enter to save • Escape to cancel</span>
        {(pendingChanges.size > 0 || savingCells.size > 0) && (
          <span className="flex items-center space-x-2">
            {savingCells.size > 0 && (
              <span className="text-blue-600">Saving {savingCells.size} changes...</span>
            )}
            {pendingChanges.size > 0 && savingCells.size === 0 && (
              <span className="text-yellow-600">{Array.from(pendingChanges.values()).reduce((total, map) => total + map.size, 0)} unsaved changes</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
});

export default ExcelLikeDataTable;