import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

interface Alumni {
  id: number;
  firstName: string;
  lastName: string;
}

interface AlumniPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function AlumniPicker({ value, onChange, placeholder }: AlumniPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all alumni
  const { data: alumni = [], isLoading } = useQuery<Alumni[]>({
    queryKey: ['/api/alumni'],
    enabled: true
  });

  // Filter and sort alumni based on search term
  const filteredAlumni = alumni
    .filter(alum => {
      if (!searchTerm) return true; // Show all when no search term
      
      const fullName = `${alum.firstName} ${alum.lastName}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return fullName.includes(searchLower);
    })
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // Show filtered/sorted alumni when dropdown is open
  const displayAlumni = isOpen ? filteredAlumni : [];

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
        placeholder={placeholder}
        className="text-sm"
      />
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500">Loading alumni...</div>
          ) : displayAlumni.length > 0 ? (
            displayAlumni.map((alum) => {
              const fullName = `${alum.firstName} ${alum.lastName}`;
              return (
                <div
                  key={alum.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                  onClick={() => {
                    onChange(fullName);
                    setSearchTerm('');
                    setIsOpen(false);
                    setIsEditing(false);
                  }}
                >
                  {fullName}
                </div>
              );
            })
          ) : searchTerm ? (
            <div className="p-3 text-sm text-gray-500">No alumni found</div>
          ) : alumni.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No alumni available</div>
          ) : (
            <div className="p-3 text-sm text-gray-500">Click to see all alumni</div>
          )}
        </div>
      )}
    </div>
  );
}