import React, { useState, useEffect } from "react";
import { Plus, X, Briefcase, Award, Calendar, DollarSign, Edit, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EmploymentEntry = {
  id: string;
  type: 'job' | 'training';
  
  // Job fields
  employerName?: string;
  position?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'temporary';
  annualSalary?: string;
  
  // Training fields
  programName?: string;
  programType?: 'coding-bootcamp' | 'trade-school' | 'certification' | 'apprenticeship' | 'vocational' | 'professional-development' | 'other';
  certification?: string;
  location?: string;
  
  // Common fields
  startDate: string;
  endDate?: string;
  description?: string;
  isCurrent: boolean;
};

interface EmploymentHistorySectionProps {
  employmentHistory: EmploymentEntry[];
  isEditing: boolean;
  onEmploymentHistoryChange: (history: EmploymentEntry[]) => void;
}

export function EmploymentHistorySection({ 
  employmentHistory, 
  isEditing, 
  onEmploymentHistoryChange 
}: EmploymentHistorySectionProps) {
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<EmploymentEntry[]>(employmentHistory);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Sync local state when props change and normalize legacy entries
  useEffect(() => {
    // Normalize legacy entries that might not have a type field
    const normalized = employmentHistory.map(entry => ({
      ...entry,
      type: entry.type || 'job', // Default to job if type is missing
      startDate: entry.startDate || new Date().toISOString().split('T')[0] // Fallback to today if missing
    }));
    setLocalHistory(normalized);
  }, [employmentHistory]);

  const addNewEntry = () => {
    const newEntry: EmploymentEntry = {
      id: Date.now().toString(),
      type: 'job', // Default to job
      employerName: '',
      position: '',
      employmentType: 'full-time',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      annualSalary: '',
      description: '',
      isCurrent: true
    };
    const newHistory = [newEntry, ...localHistory];
    setLocalHistory(newHistory);
    setEditingEntry(newEntry.id);
  };

  const updateLocalEntry = (id: string, updates: Partial<EmploymentEntry>) => {
    const updatedHistory = localHistory.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    );
    
    // If marking as current, unmark all others
    if (updates.isCurrent) {
      updatedHistory.forEach(entry => {
        if (entry.id !== id) entry.isCurrent = false;
      });
    }
    
    setLocalHistory(updatedHistory);
  };

  const saveChanges = () => {
    onEmploymentHistoryChange(localHistory);
    setEditingEntry(null);
  };

  const promptDeleteEntry = (id: string) => {
    setEntryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      const updatedHistory = localHistory.filter(entry => entry.id !== entryToDelete);
      setLocalHistory(updatedHistory);
      onEmploymentHistoryChange(updatedHistory);
    }
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const formatSalary = (salary: string) => {
    if (!salary) return '';
    const num = parseInt(salary.replace(/\D/g, ''));
    return isNaN(num) ? salary : `$${num.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const renderEditForm = (entry: EmploymentEntry) => {
    const isJob = entry.type === 'job';
    
    return (
      <div className="space-y-3">
        {/* Toggle for Job/Training */}
        <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => updateLocalEntry(entry.id, { type: 'job' })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              isJob 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-testid="toggle-job"
          >
            <Briefcase className="h-3.5 w-3.5 inline mr-1.5" />
            Job
          </button>
          <button
            onClick={() => updateLocalEntry(entry.id, { type: 'training' })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              !isJob 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-testid="toggle-training"
          >
            <Award className="h-3.5 w-3.5 inline mr-1.5" />
            Training
          </button>
        </div>

        {isJob ? (
          // Job Fields
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Company name"
                value={entry.employerName || ''}
                onChange={(e) => updateLocalEntry(entry.id, { employerName: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                data-testid="input-employer-name"
              />
              <input
                type="text"
                placeholder="Position/title"
                value={entry.position || ''}
                onChange={(e) => updateLocalEntry(entry.id, { position: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                data-testid="input-position"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={entry.employmentType || 'full-time'}
                onChange={(e) => updateLocalEntry(entry.id, { employmentType: e.target.value as any })}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                data-testid="select-employment-type"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <input
                    type="text"
                    placeholder="Annual salary"
                    value={entry.annualSalary || ''}
                    onChange={(e) => updateLocalEntry(entry.id, { annualSalary: e.target.value })}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    data-testid="input-annual-salary"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Annual salary (e.g., 50000)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <input
                  type="text"
                  placeholder="Location"
                  value={entry.location || ''}
                  onChange={(e) => updateLocalEntry(entry.id, { location: e.target.value })}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  data-testid="input-location"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>City, state, or remote location of job</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          // Training Fields
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Program name"
                value={entry.programName || ''}
                onChange={(e) => updateLocalEntry(entry.id, { programName: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                data-testid="input-program-name"
              />
              <select
                value={entry.programType || 'certification'}
                onChange={(e) => updateLocalEntry(entry.id, { programType: e.target.value as any })}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                data-testid="select-program-type"
              >
                <option value="coding-bootcamp">Coding Bootcamp</option>
                <option value="trade-school">Trade School</option>
                <option value="certification">Certification Program</option>
                <option value="apprenticeship">Apprenticeship</option>
                <option value="vocational">Vocational Training</option>
                <option value="professional-development">Professional Development</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <input
                  type="text"
                  placeholder="Certification"
                  value={entry.certification || ''}
                  onChange={(e) => updateLocalEntry(entry.id, { certification: e.target.value })}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  data-testid="input-certification"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Certificate or credential earned</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <input
                  type="text"
                  placeholder="Location"
                  value={entry.location || ''}
                  onChange={(e) => updateLocalEntry(entry.id, { location: e.target.value })}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  data-testid="input-training-location"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>City, state, or remote location of training</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Common fields: Dates and Description */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
            <input
              type="date"
              placeholder="Start date"
              value={entry.startDate}
              onChange={(e) => updateLocalEntry(entry.id, { startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              data-testid="input-start-date"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
            <input
              type="date"
              placeholder="End date"
              value={entry.endDate || ''}
              onChange={(e) => updateLocalEntry(entry.id, { endDate: e.target.value })}
              disabled={entry.isCurrent}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              data-testid="input-end-date"
            />
          </div>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`current-${entry.id}`}
                checked={entry.isCurrent}
                onChange={(e) => updateLocalEntry(entry.id, { isCurrent: e.target.checked, endDate: e.target.checked ? '' : entry.endDate })}
                className="rounded"
                data-testid="checkbox-is-current"
              />
              <label htmlFor={`current-${entry.id}`} className="text-sm text-gray-600">
                Currently active
              </label>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Check this if still working here or enrolled in this program</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <textarea
              placeholder="Description or notes"
              value={entry.description || ''}
              onChange={(e) => updateLocalEntry(entry.id, { description: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
              data-testid="textarea-description"
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Add any additional details, responsibilities, or achievements</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={() => promptDeleteEntry(entry.id)}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            data-testid="button-delete"
          >
            Delete
          </button>
          <button
            onClick={saveChanges}
            className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
            data-testid="button-done"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  const renderViewMode = (entry: EmploymentEntry) => {
    const isJob = entry.type === 'job';
    const title = isJob ? entry.employerName : entry.programName;
    const subtitle = isJob ? entry.position : entry.programType?.replace('-', ' ');
    
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 text-sm space-y-1">
          {/* Title line */}
          <div className="font-semibold text-gray-900 break-words">
            {title || 'Untitled'}
            {subtitle && <span className="text-gray-600 font-normal"> • {subtitle}</span>}
            {entry.isCurrent && (
              <span className="ml-2 text-xs font-medium text-green-700">Current</span>
            )}
          </div>
          
          {/* Details line */}
          <div className="text-gray-600 space-y-0.5 break-words">
            {isJob && (entry.employmentType || entry.location) && (
              <div className="capitalize">
                {entry.employmentType && entry.employmentType.replace('-', ' ')}
                {entry.employmentType && entry.location && ' • '}
                {entry.location}
              </div>
            )}
            
            {!isJob && entry.location && <div>{entry.location}</div>}
            
            {entry.annualSalary && (
              <div className="text-green-700 font-medium">{formatSalary(entry.annualSalary)}</div>
            )}
            
            {!isJob && entry.certification && (
              <div>Certificate: {entry.certification}</div>
            )}
            
            <div className="text-gray-500 text-xs">
              {formatDate(entry.startDate)} - {entry.isCurrent ? 'Present' : formatDate(entry.endDate || '')}
            </div>
            
            {entry.description && (
              <div className="pt-2">
                <div className="text-xs font-medium text-gray-500 mb-1">Notes</div>
                <div className="text-gray-700">{entry.description}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Edit buttons */}
        {isEditing && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => setEditingEntry(entry.id)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              data-testid={`button-edit-${entry.id}`}
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => promptDeleteEntry(entry.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              data-testid={`button-remove-${entry.id}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* List of entries */}
      <div className="flex-1 overflow-y-auto">
        {localHistory.length > 0 && (
          <div className="space-y-3">
            {localHistory
              .sort((a, b) => {
                // Defensive sort to handle invalid dates
                const dateA = new Date(a.startDate || '').getTime();
                const dateB = new Date(b.startDate || '').getTime();
                // Push invalid dates to the end
                if (isNaN(dateA) && isNaN(dateB)) return 0;
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
              })
              .map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 group relative overflow-hidden"
                  data-testid={`entry-${entry.id}`}
                >
                  {editingEntry === entry.id && isEditing ? (
                    renderEditForm(entry)
                  ) : (
                    renderViewMode(entry)
                  )}
                </div>
              ))}
          </div>
        )}
        
        {/* Empty state - show "Not Currently Employed" badge */}
        {localHistory.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <Badge 
              variant="secondary" 
              className="bg-gray-100 text-gray-600 hover:bg-gray-100 px-4 py-1.5 text-sm"
              data-testid="badge-not-employed"
            >
              Not Currently Employed
            </Badge>
          </div>
        )}
      </div>

      {/* Add button - always at bottom */}
      {isEditing && (
        <div className="flex justify-center mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={addNewEntry}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-all duration-200 border border-violet-200 hover:border-violet-300 shadow-sm hover:shadow-md"
            data-testid="button-add-entry"
          >
            <Plus className="h-4 w-4" />
            <span>Job / Training</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {entryToDelete && localHistory.find(e => e.id === entryToDelete)?.type === 'job' ? 'job' : 'training'} entry? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
