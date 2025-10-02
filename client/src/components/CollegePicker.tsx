import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cleanCollegeName } from "@shared/collegeName";

interface CollegePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function CollegePicker({ value, onChange, placeholder }: CollegePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [colleges, setColleges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch colleges when search term changes using college service adapter
  useEffect(() => {
    const fetchColleges = async () => {
      if (searchTerm.length < 2) {
        setColleges([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const { searchColleges } = await import('@/utils/collegeServiceAdapter');
        const results = await searchColleges(searchTerm);
        setColleges(results.slice(0, 10));
      } catch (error) {
        console.error('Error searching colleges:', error);
        setColleges([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchColleges, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        value={isEditing ? searchTerm : (value || '')}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsEditing(true);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsEditing(true);
          setSearchTerm('');
          setIsOpen(true);
        }}
        onBlur={() => {
          // Delay to allow click on dropdown items
          setTimeout(() => {
            if (!isOpen) {
              setIsEditing(false);
              setSearchTerm('');
            }
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const cleanName = cleanCollegeName(searchTerm);
            onChange(cleanName);
            setSearchTerm(cleanName);
            setIsOpen(false);
            setIsEditing(false);
          }
        }}
        placeholder={placeholder}
        className="text-sm"
      />
      
      {isOpen && (searchTerm.length >= 2 || colleges.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500">Searching...</div>
          ) : colleges.length > 0 ? (
            colleges.map((college, index) => (
              <div
                key={index}
                className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to parent cell
                  const cleanName = cleanCollegeName(college);
                  onChange(cleanName);
                  setSearchTerm(cleanName);
                  setIsOpen(false);
                  setIsEditing(false);
                }}
              >
                {college}
              </div>
            ))
          ) : searchTerm.length >= 2 ? (
            <div className="p-3 text-sm text-gray-500">No colleges found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}