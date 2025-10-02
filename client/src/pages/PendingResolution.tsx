import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
import { MapPin, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  latitude: string;
  longitude: string;
  source: string;
}

export default function PendingResolution() {
  const { toast } = useToast();
  const [selectedCollege, setSelectedCollege] = useState<UnmappedCollege | null>(null);
  const [mappingForm, setMappingForm] = useState({
    standardName: '',
    latitude: '',
    longitude: ''
  });

  // Fetch unmapped colleges
  const { data: unmappedColleges, isLoading: isLoadingUnmapped } = useQuery({
    queryKey: ['/api/unmapped-colleges'],
    queryFn: async () => {
      const response = await fetch('/api/unmapped-colleges');
      if (!response.ok) throw new Error('Failed to fetch unmapped colleges');
      return response.json() as UnmappedCollege[];
    }
  });

  // Fetch existing college locations
  const { data: collegeLocations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['/api/college-locations'],
    queryFn: async () => {
      const response = await fetch('/api/college-locations');
      if (!response.ok) throw new Error('Failed to fetch college locations');
      return response.json() as CollegeLocation[];
    }
  });

  // Create college mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data: { collegeName: string; standardName: string; latitude: string; longitude: string }) => {
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
      toast({ title: 'College mapped successfully!' });
      setSelectedCollege(null);
      setMappingForm({ standardName: '', latitude: '', longitude: '' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleMapCollege = () => {
    if (!selectedCollege || !mappingForm.standardName || !mappingForm.latitude || !mappingForm.longitude) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    createMappingMutation.mutate({
      collegeName: selectedCollege.collegeName,
      standardName: mappingForm.standardName,
      latitude: mappingForm.latitude,
      longitude: mappingForm.longitude
    });
  };

  const handleSelectExistingLocation = (location: CollegeLocation) => {
    if (!selectedCollege) return;
    
    createMappingMutation.mutate({
      collegeName: selectedCollege.collegeName,
      standardName: location.standardName,
      latitude: location.latitude,
      longitude: location.longitude
    });
  };

  if (isLoadingUnmapped || isLoadingLocations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending College Resolution</h1>
          <p className="text-gray-600">
            Map unmapped colleges to geographic locations for the Alumni Analytics dashboard
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Unmapped Colleges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Unmapped Colleges ({unmappedColleges?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unmappedColleges?.map((college, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{college.collegeName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {college.studentCount} student{college.studentCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {college.students.map((student, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {student.firstName} {student.lastName} ({student.cohortYear})
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCollege(college);
                              setMappingForm({
                                standardName: college.collegeName,
                                latitude: '',
                                longitude: ''
                              });
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Map
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Map College: {college.collegeName}</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Students affected */}
                            <div>
                              <h4 className="font-semibold mb-2">Students affected:</h4>
                              <div className="flex flex-wrap gap-2">
                                {college.students.map((student, i) => (
                                  <Badge key={i} variant="outline">
                                    {student.firstName} {student.lastName} ({student.cohortYear})
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="border-t my-4"></div>

                            {/* Option 1: Create new mapping */}
                            <div>
                              <h4 className="font-semibold mb-3">Create New Location</h4>
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="standardName">Standard College Name</Label>
                                  <Input
                                    id="standardName"
                                    value={mappingForm.standardName}
                                    onChange={(e) => setMappingForm(prev => ({ ...prev, standardName: e.target.value }))}
                                    placeholder="e.g., Hunter College (CUNY)"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="latitude">Latitude</Label>
                                    <Input
                                      id="latitude"
                                      value={mappingForm.latitude}
                                      onChange={(e) => setMappingForm(prev => ({ ...prev, latitude: e.target.value }))}
                                      placeholder="40.7681"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="longitude">Longitude</Label>
                                    <Input
                                      id="longitude"
                                      value={mappingForm.longitude}
                                      onChange={(e) => setMappingForm(prev => ({ ...prev, longitude: e.target.value }))}
                                      placeholder="-73.9665"
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={handleMapCollege}
                                  disabled={createMappingMutation.isPending}
                                  className="w-full"
                                >
                                  Create New Location
                                </Button>
                              </div>
                            </div>

                            <div className="border-t my-4"></div>

                            {/* Option 2: Use existing location */}
                            <div>
                              <h4 className="font-semibold mb-3">Or Use Existing Location</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {collegeLocations?.map((location) => (
                                  <div
                                    key={location.id}
                                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                                  >
                                    <div>
                                      <div className="font-medium">{location.standardName}</div>
                                      <div className="text-sm text-gray-600">
                                        {location.latitude}, {location.longitude}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSelectExistingLocation(location)}
                                      disabled={createMappingMutation.isPending}
                                    >
                                      Use This
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
                
                {(!unmappedColleges || unmappedColleges.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All colleges have been mapped!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing College Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Mapped Colleges ({collegeLocations?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {collegeLocations?.map((location) => (
                  <div key={location.id} className="border rounded-lg p-3">
                    <div className="font-medium text-gray-900">{location.standardName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {location.latitude}, {location.longitude}
                    </div>
                    {location.aliases.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {location.aliases.map((alias, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}