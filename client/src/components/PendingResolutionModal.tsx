import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Users, CheckCircle, Plus, ArrowLeft, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UnmappedStudent {
  id: number;
  firstName: string;
  lastName: string;
  cohortYear: number;
  college: string | null;
  reason: string;
  category: string;
}

interface UnmappedAnalysis {
  total: number;
  categories: {
    missing_college: UnmappedStudent[];
    invalid_college: UnmappedStudent[];
    unmapped_college: UnmappedStudent[];
  };
  allStudents: UnmappedStudent[];
}

interface UnmappedCollege {
  collegeName: string;
  studentCount: number;
  students: Array<{
    firstName: string;
    lastName: string;
    cohortYear: number;
  }>;
}

interface CollegeLocation {
  id: number;
  standardName: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

interface CreateLocationData {
  standardName: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  programName?: string;
}

interface PendingResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PendingResolutionModal({ open, onOpenChange }: PendingResolutionModalProps) {
  const [view, setView] = useState<'analysis' | 'college-mapping'>('analysis');
  const [selectedCollege, setSelectedCollege] = useState<UnmappedCollege | null>(null);
  const [mapToCollege, setMapToCollege] = useState<string>('');
  const [newCollegeName, setNewCollegeName] = useState('');
  const [programName, setProgramName] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: unmappedAnalysis, isLoading: isLoadingAnalysis } = useQuery<UnmappedAnalysis>({
    queryKey: ['/api/unmapped-analysis'],
    enabled: open,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false
  });

  const { data: unmappedColleges = [], isLoading: isLoadingUnmapped } = useQuery<UnmappedCollege[]>({
    queryKey: ['/api/unmapped-colleges'],
    enabled: open && view === 'college-mapping',
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // 🔧 FIXED: Get stored colleges (for checking what exists)
  const { data: storedColleges = [] } = useQuery<CollegeLocation[]>({
    queryKey: ['/api/college-locations'],
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // 🔧 FIXED: Use IPEDS search for full college dataset (6,172 colleges)
  const { data: searchableColleges = [], isFetching: isSearching } = useQuery<string[]>({
    queryKey: ['/api/colleges/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) return [];
      const response = await fetch(`/api/colleges/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Failed to search colleges');
      return response.json();
    },
    enabled: open && !showAddNew && searchTerm.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false
  });


  // Helper function to canonicalize college names for deduplication
  const canonicalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s*\([^)]*\)/g, '') // Remove parentheticals like "(HEOP)"
      .replace(/\s+(main\s+campus|campus|system\s+office|online|extension|center)$/i, '')
      .replace(/\s+(college of|school of|institute of)\s+/i, ' ')
      .replace(/\s+graduate\s+school$/i, '')
      .replace(/\s+medical\s+center$/i, '')
      .replace(/\s+hospital$/i, '')
      .trim();
  };

  // 🔧 FIXED: Use IPEDS search results directly (already filtered and sorted)
  const filteredColleges = useMemo(() => {
    return searchableColleges.slice(0, 10); // Limit to 10 suggestions
  }, [searchableColleges]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCollege(null);
      setMapToCollege('');
      setNewCollegeName('');
      setProgramName('');
      setNotes('');
      setShowAddNew(false);
      setSearchTerm('');
      setView('analysis');
    }
  }, [open]);

  // Auto-extract program name when college is selected
  useEffect(() => {
    if (selectedCollege) {
      const extracted = extractProgramName(selectedCollege.collegeName);
      setProgramName(extracted);
    }
  }, [selectedCollege]);

  // Helper function to extract program name from parentheticals
  const extractProgramName = (collegeName: string): string => {
    const parentheticalMatch = collegeName.match(/\s*\(([^)]+)\)\s*$/);
    if (parentheticalMatch) {
      const extracted = parentheticalMatch[1].trim();
      // Filter out common campus descriptors that aren't programs
      const campusDescriptors = [
        'main campus', 'campus', 'online', 'extension', 'center', 
        'system office', 'graduate school', 'medical center', 'hospital'
      ];
      
      if (!campusDescriptors.some(desc => 
        extracted.toLowerCase().includes(desc.toLowerCase())
      )) {
        return extracted;
      }
    }
    return '';
  };

  const resetForm = () => {
    setSelectedCollege(null);
    setMapToCollege('');
    setNewCollegeName('');
    setProgramName('');
    setNotes('');
    setShowAddNew(false);
    setSearchTerm('');
  };

  const createMappingMutation = useMutation({
    mutationFn: async (data: CreateLocationData) => {
      const response = await fetch('/api/college-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create college mapping');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unmapped-colleges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/college-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unmapped-analysis'] });
      resetForm();
      toast({
        title: "Success",
        description: "College mapping created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating mapping:', error);
      toast({
        title: "Error",
        description: "Failed to create college mapping",
        variant: "destructive",
      });
    }
  });

  const patchMappingMutation = useMutation({
    mutationFn: async (data: { locationId: number; alias: string; programName?: string; notes?: string }) => {
      const response = await fetch(`/api/college-locations/${data.locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          alias: data.alias,
          programName: data.programName,
          notes: data.notes
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add alias: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/college-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unmapped-colleges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unmapped-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni-locations'] });
      resetForm();
      toast({
        title: "Success",
        description: "Successfully mapped to existing college",
      });
    },
    onError: (error: Error) => {
      console.error('❌ PATCH MAPPING ERROR:', error);
      toast({
        title: "Error", 
        description: `Failed to map college: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async () => {
    if (!selectedCollege) return;

    if (showAddNew) {
      // Create new college location
      if (!newCollegeName.trim()) {
        toast({
          title: "Error",
          description: "Please enter a college name",
          variant: "destructive",
        });
        return;
      }

      // For now, we'll use default coordinates - in a real app, you'd geocode
      const locationData: CreateLocationData = {
        standardName: newCollegeName.trim(),
        aliases: [selectedCollege.collegeName],
        latitude: 40.7128, // Default to NYC
        longitude: -74.0060,
        notes: notes || 'Manually created mapping',
        programName: programName.trim() || undefined
      };

      createMappingMutation.mutate(locationData);
    } else {
      // Map to existing college
      if (!mapToCollege) {
        toast({
          title: "Error",
          description: "Please select a college to map to",
          variant: "destructive",
        });
        return;
      }

      // 🔧 FIXED: Check if college already exists in stored colleges
      const existingLocation = storedColleges.find(loc => 
        loc.standardName === mapToCollege ||
        (loc.aliases && loc.aliases.some(alias => alias === mapToCollege))
      );

      if (existingLocation) {
        // Add alias to existing location using PATCH
        console.log('🔗 MAPPING TO EXISTING:', {
          action: 'map_existing',
          selectedCollege: selectedCollege.collegeName,
          mapToCollege,
          existingLocationId: existingLocation.id
        });

        patchMappingMutation.mutate({
          locationId: existingLocation.id!,
          alias: selectedCollege.collegeName,
          programName: programName.trim() || undefined,
          notes: notes.trim() || undefined
        });
      } else {
        // 🔧 FIXED: Create new college from IPEDS data (auto-coordinates)
        console.log('🔗 CREATING NEW FROM IPEDS:', {
          action: 'create_from_ipeds',
          selectedCollege: selectedCollege.collegeName,
          ipedsCollege: mapToCollege
        });

        const locationData: CreateLocationData = {
          standardName: mapToCollege,
          aliases: [selectedCollege.collegeName],
          latitude: 40.7128, // Default coordinates - IPEDS resolution will provide proper ones
          longitude: -74.0060,
          notes: 'Created from IPEDS dataset',
          programName: programName.trim() || undefined
        };

        createMappingMutation.mutate(locationData);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {view === 'analysis' ? 'Unmapped Students Analysis' : 'College Location Mapping'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {view === 'analysis' ? (
            // Analysis View - Show all unmapped students with reasons
            <div>
              {isLoadingAnalysis ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Analyzing unmapped students...</p>
                </div>
              ) : !unmappedAnalysis ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No data available</p>
                </div>
              ) : unmappedAnalysis.total === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">All students can be mapped to the geo visualization!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      {unmappedAnalysis.total} students cannot be shown on the map
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-red-700">Missing College:</span>
                        <span className="ml-1">{unmappedAnalysis.categories.missing_college.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-orange-700">Invalid Data:</span>
                        <span className="ml-1">{unmappedAnalysis.categories.invalid_college.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Unmapped Colleges:</span>
                        <span className="ml-1">{unmappedAnalysis.categories.unmapped_college.length}</span>
                      </div>
                    </div>
                    
                    {/* View in Alumni Page Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          const allUnmappedIds = [
                            ...unmappedAnalysis.categories.missing_college.map(s => s.id),
                            ...unmappedAnalysis.categories.invalid_college.map(s => s.id),
                            ...unmappedAnalysis.categories.unmapped_college.map(s => s.id)
                          ];
                          
                          console.log('🎯 VIEW UNMAPPED IN ALUMNI PAGE clicked!', {
                            totalUnmapped: unmappedAnalysis.total,
                            unmappedIds: allUnmappedIds,
                            categories: {
                              missing: unmappedAnalysis.categories.missing_college.length,
                              invalid: unmappedAnalysis.categories.invalid_college.length,
                              unmapped: unmappedAnalysis.categories.unmapped_college.length
                            }
                          });
                          
                          const params = new URLSearchParams();
                          params.set('ids', allUnmappedIds.join(','));
                          const url = `/alumni?${params.toString()}`;
                          
                          console.log('🎯 Opening Unmapped Alumni URL:', url);
                          window.open(url, '_blank');
                        }}
                        className="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                      >
                        View All {unmappedAnalysis.total} Unmapped Students in Alumni Page
                      </button>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="space-y-4">
                    {/* Missing College */}
                    {unmappedAnalysis.categories.missing_college.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-900 mb-2">
                          No College Information ({unmappedAnalysis.categories.missing_college.length})
                        </h4>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-700 mb-2">These students have empty college fields:</p>
                          <div className="grid grid-cols-2 gap-1 text-sm">
                            {unmappedAnalysis.categories.missing_college.map(student => (
                              <div key={student.id}>
                                {student.firstName} {student.lastName} ({student.cohortYear})
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Invalid College */}
                    {unmappedAnalysis.categories.invalid_college.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-900 mb-2">
                          Invalid College Data ({unmappedAnalysis.categories.invalid_college.length})
                        </h4>
                        <div className="bg-orange-50 border border-orange-200 rounded p-3">
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            {unmappedAnalysis.categories.invalid_college.map(student => (
                              <div key={student.id} className="flex justify-between">
                                <span>{student.firstName} {student.lastName} ({student.cohortYear})</span>
                                <span className="text-orange-700 italic">"{student.college}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Unmapped Colleges */}
                    {unmappedAnalysis.categories.unmapped_college.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Valid Colleges Needing Location Data ({unmappedAnalysis.categories.unmapped_college.length})
                        </h4>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm text-blue-700 mb-2">These students attend valid colleges that need geographic mapping:</p>
                          <div className="space-y-1 text-sm">
                            {Array.from(new Map(unmappedAnalysis.categories.unmapped_college.map(s => [s.college, s])).values())
                              .map(student => {
                                const sameCollegeStudents = unmappedAnalysis.categories.unmapped_college.filter(s => s.college === student.college);
                                return (
                                  <div key={student.college} className="flex justify-between">
                                    <span className="font-medium">{student.college}</span>
                                    <span className="text-blue-700">({sameCollegeStudents.length} student{sameCollegeStudents.length !== 1 ? 's' : ''})</span>
                                  </div>
                                );
                              })}
                          </div>
                          <div className="mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => setView('college-mapping')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Map These Colleges
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // College Mapping View - Original functionality
            <div>
              {isLoadingUnmapped ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading unmapped colleges...</p>
                </div>
              ) : unmappedColleges.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">All colleges have been mapped!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left side - College selection */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Select College to Map</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {unmappedColleges.map((college) => (
                        <div
                          key={college.collegeName}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedCollege?.collegeName === college.collegeName
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedCollege(college)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{college.collegeName}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {college.studentCount} student{college.studentCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            {selectedCollege?.collegeName === college.collegeName && (
                              <CheckCircle className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          
                          {/* Student names */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {college.students.map((student, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {student.firstName} {student.lastName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right side - Mapping form */}
                  <div>
                    {selectedCollege ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">
                          Map "{selectedCollege.collegeName}"
                        </h3>
                        
                        <div className="flex items-center space-x-4 mb-4">
                          <Button
                            variant={!showAddNew ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAddNew(false)}
                          >
                            Map to Existing
                          </Button>
                          <Button
                            variant={showAddNew ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAddNew(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create New
                          </Button>
                        </div>

                        {!showAddNew ? (
                          <div className="space-y-3">
                            <Label htmlFor="search">Search existing colleges</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="search"
                                ref={inputRef}
                                type="text"
                                placeholder="Type to search colleges..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            
                            {filteredColleges.length > 0 && (
                              <div className="border rounded-lg max-h-48 overflow-y-auto">
                                {filteredColleges.map((collegeName) => (
                                  <div
                                    key={collegeName}
                                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                                      mapToCollege === collegeName ? 'bg-purple-50 border-purple-200' : ''
                                    }`}
                                    onClick={() => {
                                      setMapToCollege(collegeName);
                                      setSearchTerm(collegeName);
                                    }}
                                  >
                                    <div className="font-medium text-gray-900">{collegeName}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {mapToCollege && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-800">
                                    Will map to: {mapToCollege}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setMapToCollege('');
                                      setSearchTerm('');
                                    }}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="newCollege">New College Name</Label>
                            <Input
                              id="newCollege"
                              type="text"
                              placeholder="Enter the official college name..."
                              value={newCollegeName}
                              onChange={(e) => setNewCollegeName(e.target.value)}
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="programName">Program Name (Optional)</Label>
                          <Input
                            id="programName"
                            type="text"
                            placeholder="e.g., Tandon, HEOP, SPS..."
                            value={programName}
                            onChange={(e) => setProgramName(e.target.value)}
                          />
                          {selectedCollege && extractProgramName(selectedCollege.collegeName) && (
                            <p className="text-xs text-gray-500 mt-1">
                              Auto-extracted from "{selectedCollege.collegeName}"
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Any special notes about this mapping..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button variant="outline" onClick={() => resetForm()}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSubmit}
                            disabled={createMappingMutation.isPending}
                          >
                            {createMappingMutation.isPending ? 'Creating...' : 'Create Mapping'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Select a college from the left to create a mapping</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Back button for college mapping view */}
        {view === 'college-mapping' && (
          <div className="flex justify-start pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setView('analysis')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analysis
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}