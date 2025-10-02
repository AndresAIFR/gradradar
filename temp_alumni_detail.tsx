import { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLastViewedAlumni } from '@/hooks/useLastViewedAlumni';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit2, Mail, Calendar, User, GraduationCap, Briefcase, FileText, Pencil, Save, X, Phone, MessageCircle, Activity, MapPin, DollarSign, TrendingUp, Heart, Star, CheckCircle, Target, Award, Users, Building, ChevronDown, ChevronRight, ChevronLeft, Camera, Trash2 } from 'lucide-react';
import { Alumni, InteractionType } from '@/../../shared/schema';
import InlineNoteForm from '@/components/InlineNoteForm';
import { AlumniHeader } from '@/components/AlumniHeader';
import { OverviewTab } from '@/components/OverviewTab';
import { EducationTab } from '@/components/EducationTab';
import { EmploymentTab } from '@/components/EmploymentTab';
import { InteractionCard } from '@/components/InteractionCard';
import { StatusPopover } from '@/components/StatusPopover';
import { LiberationPathCard } from '@/components/LiberationPathCard';
import { calculateLastContactDate, getContactRecencyRingClass, getContactRecencyTooltip } from '@/utils/contactRecency';

interface Interaction {
  id: string;
  alumniId: string;
  type: InteractionType;
  date: string;
  content: string;
  category: string;
  createdAt: string;
  aiSummary?: string;
}

export default function AlumniDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const { setLastViewedAlumni } = useLastViewedAlumni();
  

  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [editData, setEditData] = useState<Partial<Alumni> | null>(null);
  const [educationEditData, setEducationEditData] = useState<Partial<Alumni> | null>(null);
  const [employmentEditData, setEmploymentEditData] = useState<Partial<Alumni> | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false);
  const [nextAction, setNextAction] = useState<(() => void) | null>(null);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const noteFormRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const [expandedSections, setExpandedSections] = useState({
    contact: false,
    social: false,
    personal: false,
    activity: false,
    education: false,
    employment: false,
    training: false,
  });

  const { data: alumnus, isLoading, error, refetch } = useQuery<Alumni>({
    queryKey: ['/api/alumni', id],
    enabled: !!id,
  });

  const { data: interactions, isLoading: interactionsLoading, refetch: refetchInteractions } = useQuery<Interaction[]>({
    queryKey: ['/api/alumni', id, 'interactions'],
    enabled: !!id,

  });

  // Update last viewed alumni when component mounts (not on every data change)
  useEffect(() => {
    if (alumnus && !Array.isArray(alumnus) && id) {
      setLastViewedAlumni({
        id: alumnus.id,
        name: `${alumnus.firstName} ${alumnus.lastName}`,
        cohortYear: alumnus.cohortYear || 2024
      });
    }
  }, [id, alumnus?.id, setLastViewedAlumni]); // Only trigger when ID changes or alumni ID changes

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
    },
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImageUrl: imageData }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to upload image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
      setUploadingImage(false);
    },
  });

  // Image delete mutation
  const deleteImageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImageUrl: null }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
    },
  });

  // Fix: Extract the first element from the array if it's an array
  const alumnusData = Array.isArray(alumnus) ? alumnus[0] : alumnus;

  const handleImageUpload = (imageData: string) => {
    setUploadingImage(true);
    uploadImageMutation.mutate(imageData);
  };

  const handleImageDelete = () => {
    deleteImageMutation.mutate();
  };

  // Utility functions for avatar and status
  const getAvatarRingClass = (alumni: Alumni) => {
    const lastContactDate = calculateLastContactDate(alumni, interactions || []);
    return getContactRecencyRingClass(lastContactDate, 'large');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEducationFieldChange = (field: string, value: any) => {
    setEducationEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmploymentFieldChange = (field: string, value: any) => {
    setEmploymentEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const startEditing = (section: 'overview' | 'education' | 'employment') => {
    if (section === 'overview') {
      setIsEditingOverview(true);
      setEditData(alumnus || {});
    } else if (section === 'education') {
      setIsEditingEducation(true);
      setEducationEditData(alumnus || {});
    } else if (section === 'employment') {
      setIsEditingEmployment(true);
      setEmploymentEditData(alumnus || {});
    }
  };

  const cancelEditing = (section: 'overview' | 'education' | 'employment') => {
    if (section === 'overview') {
      setIsEditingOverview(false);
      setEditData(null);
    } else if (section === 'education') {
      setIsEditingEducation(false);
      setEducationEditData(null);
    } else if (section === 'employment') {
      setIsEditingEmployment(false);
      setEmploymentEditData(null);
    }
  };

  const saveChanges = async (section: 'overview' | 'education' | 'employment') => {
    if (!id) return;

    try {
      let dataToSave;
      
      if (section === 'overview') {
        dataToSave = editData;
      } else if (section === 'education') {
        dataToSave = educationEditData;
      } else if (section === 'employment') {
        // Only send employment-related fields to avoid validation errors
        const employmentFields = {
          onCourseEconomicLiberation: employmentEditData?.onCourseEconomicLiberation,
          employed: employmentEditData?.employed,
          employmentType: employmentEditData?.employmentType,
          employerName: employmentEditData?.employerName,
          latestAnnualIncome: employmentEditData?.latestAnnualIncome,
          latestIncomeDate: employmentEditData?.latestIncomeDate,
          employmentHistory: employmentEditData?.employmentHistory,
          trainingProgramName: employmentEditData?.trainingProgramName,
          trainingProgramType: employmentEditData?.trainingProgramType,
          trainingProgramLocation: employmentEditData?.trainingProgramLocation,
          trainingProgramPay: employmentEditData?.trainingProgramPay,
          trainingStartDate: employmentEditData?.trainingStartDate,
          trainingEndDate: employmentEditData?.trainingEndDate,
          trainingDegreeCertification: employmentEditData?.trainingDegreeCertification,
        };
        dataToSave = employmentFields;
      }
      
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      await refetch();
      
      if (section === 'overview') {
        setIsEditingOverview(false);
        setEditData(null);
      } else if (section === 'education') {
        setIsEditingEducation(false);
        setEducationEditData(null);
      } else if (section === 'employment') {
        setIsEditingEmployment(false);
        setEmploymentEditData(null);
      }
    } catch (error) {

    }
  };

  // Handle liberation path updates from header dropdowns
  const handleUpdateAlumnus = async (updates: Partial<Alumni>) => {
    if (!id) return;
    

    
    try {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update alumni');
      }

      await response.json();

      // Invalidate and refetch to get updated data
      queryClient.invalidateQueries({ queryKey: ['/api/alumni', id] });
    } catch (error) {
      
    }
  };

  const handleEditInteraction = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setShowNoteForm(true);
    setTimeout(() => {
      noteFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !alumnusData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Alumni Not Found</h1>
            <p className="text-gray-600">The alumni profile you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }



  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <AlumniHeader 
            alumnus={alumnusData} 
            activeTab={activeTab}
            isEditingOverview={isEditingOverview}
            isEditingEducation={isEditingEducation}
            isEditingEmployment={isEditingEmployment}
            onEditOverview={() => startEditing('overview')}
            onSaveOverview={() => saveChanges('overview')}
            onCancelOverview={() => cancelEditing('overview')}
            onEditEducation={() => startEditing('education')}
            onSaveEducation={() => saveChanges('education')}
            onCancelEducation={() => cancelEditing('education')}
            onEditEmployment={() => startEditing('employment')}
            onSaveEmployment={() => saveChanges('employment')}
            onCancelEmployment={() => cancelEditing('employment')}
            onStatusPopoverOpen={() => setIsStatusPopoverOpen(true)}
            onUpdateAlumnus={handleUpdateAlumnus}
            updateOverviewMutation={{ isPending: false }}
            updateEducationMutation={{ isPending: false }}
            updateEmploymentMutation={{ isPending: false }}
            avatarRef={avatarRef}
            getAvatarRingClass={getAvatarRingClass}
          />

          {/* Liberation Path Card */}
          <div className="mb-6">
            <LiberationPathCard
              alumnus={alumnusData}
              onUpdateAlumnus={handleUpdateAlumnus}
              onEditLiberationPath={() => {
                setActiveTab('overview');
                startEditing('overview');
              }}
            />
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="education" className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Education</span>
                </TabsTrigger>
                <TabsTrigger value="employment" className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Career</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="mt-6">
                <TabsContent value="overview" className="space-y-4">
                  <OverviewTab
                    alumnus={alumnusData}
                    isEditing={isEditingOverview}
                    editData={editData}
                    expandedSections={expandedSections}
                    onToggleSection={toggleSection}
                    onFieldChange={handleFieldChange}
                  />
                </TabsContent>

                <TabsContent value="education" className="space-y-6">
                  <EducationTab
                    alumnus={alumnusData}
                    isEditing={isEditingEducation}
                    editData={educationEditData}
                    onFieldChange={handleEducationFieldChange}
                  />
                </TabsContent>

                <TabsContent value="employment" className="space-y-6">
                  <EmploymentTab
                    alumnus={alumnusData}
                    isEditing={isEditingEmployment}
                    editData={employmentEditData}
                    onFieldChange={handleEmploymentFieldChange}
                    expandedSections={expandedSections}
                    onToggleSection={toggleSection}
                  />
                </TabsContent>

                <TabsContent value="notes" className="space-y-6">
                  <div className="space-y-4">
                    {/* Inline Ghost Entry */}
                    {!showNoteForm && (
                      <div 
                        className="group border-2 border-dashed border-gray-200 rounded-xl p-8 bg-white hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:border-gray-300 hover:shadow-sm"
                        onClick={() => {
                          setShowNoteForm(true);
                          setTimeout(() => {
                            noteFormRef.current?.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'start' 
                            });
                          }, 100);
                        }}
                      >
                        <div className="flex items-center text-gray-500">
                          <div className="w-14 h-14 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center mr-5 group-hover:border-gray-300 group-hover:bg-gray-100 transition-all duration-200">
                            <Plus className="h-7 w-7 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-gray-600 group-hover:text-gray-800 transition-colors duration-200">Add a new note...</span>
                            <span className="text-sm text-gray-400 group-hover:text-gray-500 transition-colors duration-200">Click to create an interaction record</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {showNoteForm && (
                      <div ref={noteFormRef}>
                        <InlineNoteForm 
                          alumni={alumnusData}
                          onCancel={() => {
                            setShowNoteForm(false);
                            setEditingInteraction(null);
                            setHasUnsavedChanges(false);
                          }}
                          interaction={editingInteraction}
                          onChangeDetected={setHasUnsavedChanges}
                        />
                      </div>
                    )}
                    
                    {/* Display existing interactions */}
                    <div className="relative">
                      {interactionsLoading ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                          <p>Loading interactions...</p>
                        </div>
                      ) : interactions && interactions.length > 0 ? (
                        <div className="timeline relative pl-9 before:absolute before:top-0 before:bottom-0 before:left-[20px] before:w-px before:bg-gray-200">
                          {(() => {
                            const sortedInteractions = [...interactions].sort((a, b) => {
                              // Handle null/undefined dates by placing them at the end
                              if (!a.date || !b.date) {
                                if (!a.date && !b.date) return 0;
                                return !a.date ? 1 : -1;
                              }
                              
                              // Create dates in local timezone to avoid UTC midnight issues
                              const [aYear, aMonth, aDay] = a.date.split('-').map(Number);
                              const [bYear, bMonth, bDay] = b.date.split('-').map(Number);
                              const aDate = new Date(aYear, aMonth - 1, aDay).getTime();
                              const bDate = new Date(bYear, bMonth - 1, bDay).getTime();
                              return bDate - aDate; // Sort by date descending (newest first)
                            });
                            
                            const groupedInteractions = sortedInteractions.reduce((groups: any, interaction: any) => {
                              // Handle null/undefined dates
                              const dateSource = interaction.date;
                              let date;
                              
                              if (!dateSource) {
                                date = "Unknown Date";
                              } else {
                                // Create date in local timezone to avoid UTC midnight issues
                                const [year, month, day] = dateSource.split('-').map(Number);
                                const parsedDate = new Date(year, month - 1, day); // month is 0-indexed
                                date = parsedDate.toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                });
                              }

                              if (!groups[date]) {
                                groups[date] = [];
                              }
                              groups[date].push(interaction);
                              return groups;
                            }, {});

                            // Calculate total interactions to determine last one globally
                            let globalInteractionIndex = 0;
                            const totalInteractions = sortedInteractions.length;

                            return Object.entries(groupedInteractions).map(([date, dayInteractions]: [string, any]) => {
                              // Sort interactions within each day by creation time (most recent first)
                              const sortedDayInteractions = [...dayInteractions].sort((a, b) => {
                                // Use createdAt if available, otherwise use ID (higher ID = more recent)
                                if (a.createdAt && b.createdAt) {
                                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                }
                                return b.id - a.id; // Higher ID = more recent
                              });
                              
                              return (
                                <div key={date} className="mb-6 last:mb-0">
                                  <div className="sticky top-0 bg-white z-10 py-2 mb-3">
                                    <h3 className="font-semibold text-gray-900 text-sm">
                                      {date}
                                    </h3>
                                  </div>
                                  
                                  {sortedDayInteractions.map((interaction: any, index: number) => {
                                    const isLastInteractionGlobally = globalInteractionIndex === totalInteractions - 1;
                                    globalInteractionIndex++;
                                    
                                    return (
                                      <div key={interaction.id} className={`relative ${index !== sortedDayInteractions.length - 1 ? 'mb-4' : ''}`}>
                                        <InteractionCard 
                                          interaction={interaction}
                                          onEdit={() => {
                                            if (hasUnsavedChanges) {
                                              setUnsavedChangesDialog(true);
                                              setNextAction(() => () => handleEditInteraction(interaction));
                                            } else {
                                              handleEditInteraction(interaction);
                                            }
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No interactions yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <Dialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in your current note. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUnsavedChangesDialog(false);
                setHasUnsavedChanges(false);
                setShowNoteForm(false);
                setEditingInteraction(null);
                if (nextAction) nextAction();
              }}
            >
              Discard Changes
            </Button>
            <Button
              onClick={() => {
                setUnsavedChangesDialog(false);
              }}
            >
              Continue Editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Popover */}
      {alumnusData && (
        <StatusPopover
          isOpen={isStatusPopoverOpen}
          onClose={() => setIsStatusPopoverOpen(false)}
          triggerRef={avatarRef}
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDelete}
          uploadingImage={uploadingImage}
          hasProfileImage={!!alumnusData.profileImageUrl}
        />
      )}
    </TooltipProvider>
  );
}