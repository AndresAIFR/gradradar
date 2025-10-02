import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CheckCircle, X } from 'lucide-react';
import { CollegeInfo } from './steps/CollegeResolutionStepSimple';

interface CollegeData {
  unitid: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  alias?: string;
}

interface SimpleMappingRowProps {
  college: CollegeInfo;
  onMap: (originalName: string, standardName: string, category: 'college' | 'work' | 'training' | 'military' | 'other') => void;
  onRemove: (originalName: string) => void;
}

export default function SimpleMappingRowClean({ college, onMap, onRemove }: SimpleMappingRowProps) {
  const [selectedCategory, setSelectedCategory] = useState<'college' | 'work' | 'training' | 'military' | 'other'>(
    // Auto-detect category based on name
    college.name.toLowerCase().includes('army') || 
    college.name.toLowerCase().includes('marine') || 
    college.name.toLowerCase().includes('guard') || 
    college.name.toLowerCase().includes('corps') || 
    college.name.toLowerCase().includes('military') ||
    college.name.toLowerCase().includes('navy') ||
    college.name.toLowerCase().includes('air force') ||
    college.name.toLowerCase().includes('coast guard')
      ? 'military' : 'college'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [programNote, setProgramNote] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [collegeData, setCollegeData] = useState<CollegeData[]>([]);


  // Load college data
  React.useEffect(() => {
    const loadCollegeData = async () => {
      try {
        const response = await fetch('/api/colleges-data');
        if (response.ok) {
          const data = await response.json();
          setCollegeData(data);
        }
      } catch (error) {
        console.error('Error loading college data:', error);
      }
    };
    loadCollegeData();
  }, []);

  // Filter colleges
  const filteredColleges = searchQuery.length >= 2 
    ? collegeData
        .filter((item: CollegeData) => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const handleSave = () => {
    if (selectedCategory === 'college') {
      const baseName = selectedCollege || searchQuery.trim();
      const finalName = programNote.trim() 
        ? `${baseName} (${programNote.trim()})`
        : baseName;
      
      if (baseName) {
        onMap(college.name, finalName, selectedCategory);
      }
    } else if (searchQuery.trim()) {
      onMap(college.name, searchQuery.trim(), selectedCategory);
    }
    
    // Reset
    setSearchQuery('');
    setSelectedCollege('');
    setProgramNote('');
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{college.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {college.count} students
        </Badge>
        {college.isMapped && (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-600">Mapped</span>
          </div>
        )}
      </div>

      {college.isMapped ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant={college.category === 'college' ? 'default' : 
                      college.category === 'military' ? 'destructive' : 
                      college.category === 'work' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {college.category === 'military' ? 'Military' :
               college.category === 'work' ? 'Work' :
               college.category === 'training' ? 'Training' :
               college.category === 'other' ? 'Other' : 'College'}
            </Badge>
            <span className="text-sm text-gray-600">{college.standardName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(college.name);
            }}
            className="h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div 
          className="flex items-center gap-2"
          onClick={(e) => {
          }}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Category Selection */}
          <Select
            value={selectedCategory}
            onValueChange={(value: 'college' | 'work' | 'training' | 'military' | 'other') => {
              setSelectedCategory(value);
            }}
            onOpenChange={(isOpen) => {
            }}
          >
            <SelectTrigger 
              className="w-32"
              onClick={(e) => {
              }}
              onMouseDown={(e) => {
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="college">College</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="military">Military</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Main Input */}
          {selectedCategory === 'college' ? (
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  placeholder="Search colleges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56"
                />
                {filteredColleges.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {filteredColleges.map((item) => (
                      <button
                        key={item.unitid}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setSelectedCollege(item.name);
                          setSearchQuery(item.name);
                        }}
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.city}, {item.state}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                placeholder="Program (e.g., Messina, Honors)"
                value={programNote}
                onChange={(e) => setProgramNote(e.target.value)}
                className="w-40"
              />
            </div>
          ) : (
            <Input
              placeholder={
                selectedCategory === 'military' 
                  ? "Enter military service (e.g., Army National Guard, Marine Corps)..."
                  : selectedCategory === 'work'
                  ? "Enter employer name..."
                  : selectedCategory === 'training'
                  ? "Enter training program..."
                  : "Enter name..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56"
            />
          )}

          <Button
            onClick={handleSave}
            disabled={
              (selectedCategory === 'college' && !searchQuery.trim() && !selectedCollege) ||
              (selectedCategory !== 'college' && !searchQuery.trim())
            }
            size="sm"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}