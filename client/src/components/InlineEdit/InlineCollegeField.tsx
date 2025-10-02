import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { cleanCollegeName } from "@shared/collegeName";

interface InlineCollegeFieldProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  fieldLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function InlineCollegeField({
  value,
  onSave,
  fieldLabel = "College",
  placeholder = "Search for college...",
  className = "",
  disabled = false
}: InlineCollegeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [colleges, setColleges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    isEditing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown: originalHandleKeyDown,
    isSaving
  } = useInlineEdit({
    initialValue: value,
    onSave,
    fieldLabel,
    fieldType: 'text'
  });

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Fetch colleges when search term changes
  useEffect(() => {
    if (!isEditing || editValue.length < 2) {
      setColleges([]);
      setShowDropdown(false);
      return;
    }

    const fetchColleges = async () => {
      setIsLoading(true);
      try {
        const { searchColleges } = await import('@/utils/collegeServiceAdapter');
        const results = await searchColleges(editValue);
        setColleges(results.slice(0, 10));
        setShowDropdown(true);
      } catch (error) {
        console.error('Error searching colleges:', error);
        setColleges([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchColleges, 300);
    return () => clearTimeout(debounceTimer);
  }, [editValue, isEditing]);

  // Enhanced key handling for dropdown navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && colleges.length > 0) {
      e.preventDefault();
      setShowDropdown(true);
      return;
    }
    
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
    
    originalHandleKeyDown(e);
  };

  const selectCollege = (college: string) => {
    const cleanName = cleanCollegeName(college);
    setEditValue(cleanName);
    setShowDropdown(false);
    setColleges([]);
  };

  if (isEditing) {
    return (
      <div className="relative -mx-0.5 -my-0.5" ref={dropdownRef}>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              disabled={isSaving}
              placeholder={placeholder}
            />
            
            {/* Dropdown */}
            {showDropdown && isEditing && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-3 text-sm text-gray-500">Searching...</div>
                ) : colleges.length > 0 ? (
                  <>
                    {colleges.map((college) => (
                      <div
                        key={college}
                        className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => selectCollege(college)}
                      >
                        {college}
                      </div>
                    ))}
                    {editValue.length >= 2 && !colleges.some(c => c.toLowerCase() === editValue.toLowerCase()) && (
                      <div className="p-3 border-t border-gray-100">
                        <div className="text-sm text-gray-600">
                          No exact match found. You can save "<strong>{editValue}</strong>" as a custom college.
                        </div>
                      </div>
                    )}
                  </>
                ) : editValue.length >= 2 ? (
                  <div className="p-3 text-sm text-gray-600">
                    No matches found. You can save "<strong>{editValue}</strong>" as a custom college.
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-green-100"
              onClick={saveEdit}
              disabled={isSaving}
            >
              <Check className="w-3 h-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-red-100"
              onClick={() => {
                cancelEdit();
                setShowDropdown(false);
                setColleges([]);
              }}
              disabled={isSaving}
            >
              <X className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-block cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-sm ${className} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      onClick={disabled ? undefined : startEdit}
    >
      {value || placeholder}
    </span>
  );
}