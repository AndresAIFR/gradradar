import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLastViewedAlumni } from '@/hooks/useLastViewedAlumni';
import { qk } from '@/lib/queryKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit2, Mail, Calendar, User, GraduationCap, Briefcase, FileText, Pencil, Save, X, Phone, MessageCircle, Activity, MapPin, DollarSign, TrendingUp, Heart, Star, CheckCircle, Target, Award, Users, Building, ChevronDown, ChevronRight, ChevronLeft, Camera, Trash2, Info, RotateCcw, Building2, Instagram, Twitter, Linkedin, Home, AlertTriangle, Cake, Flag, Check } from 'lucide-react';
import { SiTiktok } from 'react-icons/si';
import { Alumni, InteractionType } from '@/../../shared/schema';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { calculateAutoUpdate } from '@shared/autoCalculation';
import { STAGE_OPTIONS, calculateCurrentStage } from '@shared/liberationPath';
import InlineNoteForm from '@/components/InlineNoteForm';
import { AlumniHeader } from '@/components/AlumniHeader';
import { OverviewTab } from '@/components/OverviewTab';
import { EducationTab } from '@/components/EducationTab';
import { EmploymentTab } from '@/components/EmploymentTab';
import { InteractionCard } from '@/components/InteractionCard';
import { StatusPopover } from '@/components/StatusPopover';
import { LiberationPathCard } from '@/components/LiberationPathCard';
import { AlumniQuickDashboard } from '@/components/AlumniQuickDashboard';
import { calculateLastContactDate, getContactRecencyRingClass, getContactRecencyTooltip } from '@/utils/contactRecency';
import { InlineTextField, InlineSelectField, InlineBooleanField } from '@/components/InlineEdit';
import InlineCollegeField from '@/components/InlineEdit/InlineCollegeField';
import type { PathType } from '@shared/liberationPath';
import { useInlineEdit } from '@/hooks/useInlineEdit';

// Current Stage Selector Component with conditional reset button
const CurrentStageSelector = ({ alumnus, updateAlumniMutation }: { 
  alumnus: Alumni, 
  updateAlumniMutation: any 
}) => {
  const {
    isEditing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
    isSaving
  } = useInlineEdit({
    initialValue: alumnus.currentStage || calculateCurrentStage(alumnus),
    onSave: async (value) => {
      await updateAlumniMutation.mutateAsync({ 
        field: 'currentStage', 
        value 
      });
      await updateAlumniMutation.mutateAsync({ 
        field: 'currentStageModified', 
        value: true 
      });
    },
    fieldLabel: "Current Stage",
    fieldType: 'select'
  });

  const resetToAuto = async () => {
    await updateAlumniMutation.mutateAsync({ 
      field: 'currentStage', 
      value: null 
    });
    await updateAlumniMutation.mutateAsync({ 
      field: 'currentStageModified', 
      value: false 
    });
    cancelEdit();
  };

  // Map database pathType to liberation logic pathType for stage options
  const mapDbPathToLogicPath = (dbPathType: string | null): PathType => {
    switch (dbPathType) {
      case 'college': return 'college';
      case 'work': return 'employment';
      case 'training': return 'vocation';
      case 'military': return 'vocation';
      case 'other': return 'employment';
      default: return 'college';
    }
  };
  
  const effectivePathType = mapDbPathToLogicPath(alumnus.pathType);
  const stageOptions = STAGE_OPTIONS[effectivePathType]?.map(stage => ({
    value: stage.value,
    label: stage.label
  })) || [];

  const getDisplayLabel = (val: string | null | undefined) => {
    if (!val) return "Select";
    const option = stageOptions.find(opt => opt.value === val);
    return option?.label || val;
  };

  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex items-center space-x-2">
          <Select 
            value={editValue || ""} 
            onValueChange={(value) => {
              setEditValue(value);
            }} 
            disabled={isSaving}
          >
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent 
              position="popper" 
              sideOffset={4}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              {stageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-end space-x-1">
          {alumnus.currentStageModified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                  onClick={resetToAuto}
                  disabled={isSaving}
                >
                  <RotateCcw className="w-3 h-3 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reset to auto-calculated stage based on cohort year
              </TooltipContent>
            </Tooltip>
          )}
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
            onClick={cancelEdit}
            disabled={isSaving}
          >
            <X className="w-3 h-3 text-red-600" />
          </Button>
          {isSaving && (
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="inline-block min-w-[100px] px-2 py-1 rounded transition-colors hover:bg-blue-50 cursor-pointer"
          onClick={startEdit}
        >
          <span className="text-sm">
            {getDisplayLabel(alumnus.currentStage || calculateCurrentStage(alumnus))}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {alumnus.currentStageModified ? (
          "This stage was manually set and won't auto-update"
        ) : (
          "This stage is automatically calculated based on cohort year"
        )}
      </TooltipContent>
    </Tooltip>
  );
};

// Utility function to calculate economic liberation based on income
const calculateEconomicLiberation = (annualIncome: string | null) => {
  if (!annualIncome) return { status: false, threshold: 70000 };
  
  const income = parseFloat(annualIncome.toString().replace(/[^0-9.]/g, ''));
  const threshold = 70000; // US national median household income (approx 2024)
  
  return {
    status: income >= threshold,
    threshold,
    income
  };
};

// Utility function to get current employment data from employment history
const getCurrentEmploymentData = (employmentHistory: any[]) => {
  if (!employmentHistory || employmentHistory.length === 0) {
    return {
      employerName: null,
      employmentType: null,
      latestAnnualIncome: null,
      employed: false,
      economicLiberation: calculateEconomicLiberation(null)
    };
  }

  // Find current job first (isCurrent = true)
  const currentJob = employmentHistory.find(job => job.isCurrent);
  
  // If no current job, get most recent job (sorted by startDate descending)
  const mostRecentJob = currentJob || employmentHistory
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

  const latestIncome = mostRecentJob?.annualSalary || null;

  return {
    employerName: mostRecentJob?.employerName || null,
    employmentType: mostRecentJob?.employmentType || null,
    latestAnnualIncome: latestIncome,
    employed: !!currentJob, // Only true if there's a current job
    economicLiberation: calculateEconomicLiberation(latestIncome)
  };
};

// Utility function to get enrollment status value (matches EducationTab logic)
const getEnrollmentStatusValue = (alumnus: Alumni) => {
  // If manually modified, use the stored value
  if (alumnus.enrollmentStatusModified && alumnus.enrollmentStatus) {
    return alumnus.enrollmentStatus;
  }
  
  // Auto-populate: if student has a college and no manual override, show "enrolled"
  const hasCollege = !!(alumnus.collegeAttending);
  const hasDropoutDate = !!alumnus.dropoutDate;
  
  if (hasCollege && !hasDropoutDate) {
    return 'enrolled';
  }
  
  // Otherwise, use stored value or null
  return alumnus.enrollmentStatus;
};

// Utility function to calculate enrollment status from Present section data
const calculateEnrollmentStatus = (alumnus: Alumni) => {
  const enrollmentStatus = getEnrollmentStatusValue(alumnus);
  return enrollmentStatus?.toLowerCase() === 'enrolled';
};

// Utility function to calculate employment status from Present section data  
const calculateEmploymentStatus = (employmentHistory: any[]) => {
  return getCurrentEmploymentData(employmentHistory).employed;
};

// Utility function to calculate highest priority follow-up from all notes
const calculateHighestFollowUpPriority = (interactions: any[]) => {
  if (!interactions || interactions.length === 0) return null;
  
  // Filter interactions that need follow-up
  const followUpInteractions = interactions.filter(
    interaction => interaction.needsFollowUp && interaction.followUpPriority
  );
  
  if (followUpInteractions.length === 0) return null;
  
  // Priority order (highest to lowest)
  const priorityOrder: { [key: string]: number } = { urgent: 4, high: 3, normal: 2, low: 1 };
  
  // Find the highest priority
  let highestPriority: string | null = null;
  let highestValue = 0;
  
  followUpInteractions.forEach(interaction => {
    const priority = interaction.followUpPriority?.toLowerCase();
    const value = priorityOrder[priority] || 0;
    if (value > highestValue) {
      highestValue = value;
      highestPriority = priority;
    }
  });
  
  return highestPriority;
};

// TimelineCard component from demo 2
interface TimelineCardProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'emerald' | 'sky' | 'violet' | 'amber';
  isLast?: boolean;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ 
  id, title, subtitle, children, icon: Icon, color = "emerald", isLast = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(id === 'present');

  const colorClasses = {
    emerald: "",  // Will use CSS variables for CSH green
    sky: "from-sky-400 to-blue-400", 
    violet: "from-violet-400 to-purple-400",
    amber: "from-amber-400 to-orange-400"
  };

  const bgColorClasses = {
    emerald: "",  // Will use CSS variables for CSH green background
    sky: "bg-gradient-to-br from-sky-50 to-blue-50",
    violet: "bg-gradient-to-br from-violet-50 to-purple-50", 
    amber: "bg-gradient-to-br from-amber-50 to-orange-50"
  };

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-3 top-20 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent"></div>
      )}
      
      <div className="relative group">
        {/* Timeline dot */}
        <div className="absolute left-0 top-6 w-6 h-6 rounded-full bg-white shadow-lg group-hover:scale-110 transition-transform">
          <div className={`w-full h-full rounded-full opacity-80 ${color === 'emerald' ? '' : `bg-gradient-to-br ${colorClasses[color]}`}`}
               style={color === 'emerald' ? { backgroundColor: 'var(--csh-green-500)' } : {}}></div>
        </div>
        
        {/* Card */}
        <div className={`ml-16 bg-white rounded-2xl shadow-sm border border-gray-100 mb-2 overflow-hidden hover:shadow-lg transition-all duration-300 ${isExpanded ? 'shadow-md' : ''}`}>
          {/* Card header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-all ${isExpanded && color !== 'emerald' ? bgColorClasses[color] : ''}`}
            style={isExpanded && color === 'emerald' ? { background: 'linear-gradient(135deg, rgba(63, 184, 113, 0.1), rgba(63, 184, 113, 0.05))' } : {}}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${color === 'emerald' ? '' : `bg-gradient-to-br ${colorClasses[color]}`}`}
                   style={color === 'emerald' ? { backgroundColor: 'var(--csh-green-500)' } : {}}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? '-rotate-90' : '-rotate-180'}`} />
          </button>
          
          {/* Card content */}
          <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div className="px-6 pb-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Interaction {
  id: number;
  alumniId: number;
  type: InteractionType;
  date: string;
  overview: string;            // Body of the note (matches database)
  internalSummary?: string;    // AI-generated summary (matches database)
  studentResponded?: boolean;
  needsFollowUp?: boolean;
  followUpPriority?: string;
  followUpDate?: string | null;
  createdAt: string;
}

interface AlumniDetailProps {
  alumniId?: string;
  embedded?: boolean;
}

export default function QueueAlumniDetail({ alumniId: propAlumniId, embedded = false }: AlumniDetailProps = {}) {
  const { id: urlId } = useParams<{ id: string }>();
  const id = propAlumniId || urlId;
  const [activeTab, setActiveTab] = useState('overview');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { setLastViewedAlumni } = useLastViewedAlumni();
  

  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [editData, setEditData] = useState<Partial<Alumni> | null>(null);
  const [educationEditData, setEducationEditData] = useState<Partial<Alumni> | null>(null);
  const [employmentEditData, setEmploymentEditData] = useState<Partial<Alumni> | null>(null);
  const [editingInteractionId, setEditingInteractionId] = useState<number | 'new' | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false);
  const [nextAction, setNextAction] = useState<(() => void) | null>(null);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showStageConfirmation, setShowStageConfirmation] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<string>('');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { toast } = useToast();
  const noteFormRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

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
    queryKey: qk.alumniById(id!),
    enabled: !!id,
  });

  // Re-enabled interaction fetching with proper error handling
  const { data: interactions = [], isLoading: interactionsLoading, refetch: refetchInteractions } = useQuery<any[]>({
    queryKey: qk.alumniInteractions(id!),
    enabled: !!id,
    retry: 1, // Only retry once on failure
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Memoize follow-up priority calculation to prevent infinite re-renders
  const followUpData = useMemo(() => {
    const highestPriority = calculateHighestFollowUpPriority(interactions);
    const hasFollowUp = !!highestPriority;
    
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return 'text-red-600';
        case 'high': return 'text-orange-600';
        case 'normal': return 'text-yellow-600';
        case 'low': return 'text-blue-600';
        default: return 'text-gray-600';
      }
    };
    
    const getFollowUpDescription = (priority: string | null) => {
      switch (priority) {
        case 'urgent': return 'Urgent followup - contact tomorrow';
        case 'high': return 'High priority followup - contact within 3 days';
        case 'normal': return 'Normal priority followup - contact within 1 week';
        case 'low': return 'Low priority followup - contact within 1 month';
        default: return 'No pending follow-ups';
      }
    };
    
    // Get note text from the interaction that triggered the follow-up flag
    const priorityOrder: { [key: string]: number } = {
      'urgent': 4,
      'high': 3,
      'normal': 2,
      'low': 1
    };
    
    const followUpInteractions = interactions.filter(
      interaction => interaction.needsFollowUp && interaction.followUpPriority
    );
    
    let flaggedNote = 'No follow-up note';
    
    if (followUpInteractions.length > 0) {
      // Find the interaction with the highest priority
      const highestPriorityInteraction = followUpInteractions.reduce((highest, current) => {
        const currentValue = priorityOrder[current.followUpPriority?.toLowerCase() || ''] || 0;
        const highestValue = priorityOrder[highest.followUpPriority?.toLowerCase() || ''] || 0;
        return currentValue > highestValue ? current : highest;
      });
      
      flaggedNote = highestPriorityInteraction.internalSummary || highestPriorityInteraction.overview || 'No note text';
    }
    
    return {
      highestPriority,
      hasFollowUp,
      priorityColor: highestPriority ? getPriorityColor(highestPriority) : '',
      description: getFollowUpDescription(highestPriority),
      lastNoteText: flaggedNote
    };
  }, [interactions]);

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
      queryClient.invalidateQueries({ queryKey: qk.alumniById(id!) });
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
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
      queryClient.invalidateQueries({ queryKey: qk.alumniById(id!) });
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
      setUploadingImage(false);
    },
  });

  // Single field update mutation for inline editing
  const updateAlumniMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update field');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.alumniById(id!) });
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
    },
  });

  // Create save handler for inline editing
  const createSaveHandler = (field: string) => async (value: any) => {
    try {
      await updateAlumniMutation.mutateAsync({ field, value });
      toast({
        title: "Updated successfully",
        description: `${field} has been updated.`,
      });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast({
        title: "Update failed",
        description: `Failed to update ${field}. Please try again.`,
        variant: "destructive",
      });
    }
  };

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
      queryClient.invalidateQueries({ queryKey: qk.alumniById(id!) });
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
    },
  });

  // Delete interaction mutation
  const deleteInteractionMutation = useMutation({
    mutationFn: async (interactionId: number) => {
      const response = await apiRequest('DELETE', `/api/alumni/${id}/interactions/${interactionId}`);
      
      // Handle null response (204 No Content) - apiRequest returns null for 204 status
      if (response === null) {
        return null;
      }
      
      return response;
    },
    onSuccess: () => {
      const key = qk.alumniInteractions(String(id!));
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: qk.alumniById(String(id!)) });
      
      // Add the same optimistic update logic for contact queue strikethrough
      queryClient.setQueryData(['/api/alumni'], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((a: any) => 
          a.id === Number(id) 
            ? { ...a, attemptedToday: false }
            : a
        );
      });
      
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  // Delete alumni mutation
  const deleteAlumniMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/alumni/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] });
      toast({
        title: "Success",
        description: "Alumni deleted successfully",
      });
      // Navigate back to alumni list after successful deletion
      setLocation('/alumni');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error", 
        description: "Failed to delete alumni. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fix: Extract the first element from the array if it's an array
  // Remove this line - use alumnus directly

  const handleImageUpload = (imageData: string) => {
    setUploadingImage(true);
    uploadImageMutation.mutate(imageData);
  };

  const handleImageDelete = () => {
    deleteImageMutation.mutate();
  };

  // Memoized avatar border style that updates when interactions change
  const avatarBorderStyle = useMemo(() => {
    if (!alumnus) return { 
      outlineColor: '#9ca3af',
      outlineWidth: '4px',
      outlineStyle: 'solid',
      outlineOffset: '-4px'
    };
    
    // Calculate from interactions to get the most recent successful contact
    const lastContactDate = calculateLastContactDate(alumnus, interactions || []);
    
    // Get matching border color
    const days = lastContactDate ? Math.floor((new Date().getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    let borderColor = '#9ca3af'; // gray-400
    
    if (days !== null) {
      if (days <= 30) {
        borderColor = '#22c55e'; // green-500
      } else if (days <= 90) {
        borderColor = '#eab308'; // yellow-500
      } else if (days <= 180) {
        borderColor = '#f97316'; // orange-500
      } else {
        borderColor = '#ef4444'; // red-500
      }
    }
    
    return { 
      outlineColor: borderColor,
      outlineWidth: '4px',
      outlineStyle: 'solid',
      outlineOffset: '-4px'
    };
  }, [alumnus, interactions]);

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
        credentials: 'include',
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
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update alumni');
      }

      await response.json();

      // Invalidate and refetch to get updated data - force refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: qk.alumniById(id!) });
      await queryClient.invalidateQueries({ queryKey: qk.alumniList });
    } catch (error) {
      
    }
  };

  const handleEditInteraction = (interaction: Interaction) => {
    setEditingInteractionId(interaction.id);
  };

  const handleAddNewNote = () => {
    setEditingInteractionId('new');
  };

  // Sophisticated dropdown handlers from original AlumniHeader
  const handlePathTypeChange = async (newPathType: string) => {
    if (!alumnus) return;
    
    try {
      // Create updated alumni object for auto-calculation
      const updatedAlumni = { ...alumnus, pathType: newPathType as "college" | "work" | "training" | "military" | "other" | "path not defined" };
      const autoCalc = calculateAutoUpdate(updatedAlumni);
      
      await handleUpdateAlumnus({ 
        pathType: newPathType as "college" | "work" | "training" | "military" | "other" | "path not defined",
        currentStage: autoCalc.suggestedCurrentStage,
        trackingStatus: autoCalc.suggestedTrackingStatus
      });
      
      toast({
        title: "Path updated",
        description: `Path changed to ${newPathType} with auto-calculated stage and status.`,
      });
    } catch (error) {
      console.error('Error updating path type:', error);
      toast({
        title: "Error",
        description: "Failed to update path type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCurrentStageChange = (newStage: string) => {
    if (!alumnus) return;
    
    // Compute the display current stage (respect manual override flag)
    const displayCurrentStage = alumnus.currentStageModified 
      ? alumnus.currentStage 
      : calculateCurrentStage(alumnus);

    // If already manually modified or no change, proceed directly
    if (alumnus.currentStageModified || newStage === displayCurrentStage) {
      handleUpdateAlumnus({ currentStage: newStage });
      return;
    }

    // Show confirmation for first-time manual override
    setPendingStageChange(newStage);
    setShowStageConfirmation(true);
  };

  const handleConfirmStageChange = () => {
    handleUpdateAlumnus({ 
      currentStage: pendingStageChange,
      currentStageModified: true 
    });
    
    toast({
      title: "Stage manually set",
      description: "Automatic yearly progression has been disabled for this student.",
    });
    
    setShowStageConfirmation(false);
    setPendingStageChange('');
  };

  const handleTrackingStatusChange = async (newStatus: string) => {
    if (!alumnus) return;
    
    try {
      await handleUpdateAlumnus({ trackingStatus: newStatus as "on-track" | "near-track" | "off-track" | "unknown" });
      
      toast({
        title: "Status updated",
        description: `Tracking status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating tracking status:', error);
      toast({
        title: "Error",
        description: "Failed to update tracking status. Please try again.",
        variant: "destructive",
      });
    }
  };





  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !alumnus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
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
      <div className={embedded ? "h-full bg-white" : "min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50"}>

        {/* Main content */}
        <div className={`max-w-4xl mx-auto px-6 ${embedded ? 'pt-6 pb-2' : 'py-6'}`}>
          
          {/* Profile header with gradient accent */}
          <div className="flex items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-6">
            <div 
              className="relative cursor-pointer group" 
              ref={avatarRef}
              onClick={() => setIsStatusPopoverOpen(true)}
            >
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="relative w-20 h-20 rounded-2xl shadow-xl" style={avatarBorderStyle}>
                    {alumnus.profileImageUrl ? (
                      <img 
                        src={alumnus.profileImageUrl} 
                        alt={`${alumnus.firstName} ${alumnus.lastName}`}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--csh-green-500)' }}>
                        <span className="text-3xl font-bold text-white">
                          {alumnus?.firstName?.charAt(0)}{alumnus?.lastName?.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Upload overlay on hover */}
                    <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="text-center">
                    <p className="font-medium">Click to manage profile photo</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getContactRecencyTooltip(calculateLastContactDate(alumnus, interactions || []))}
                    </p>
                    <p className="text-xs mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white`}
                      style={
                        alumnus.trackingStatus === 'on-track' ? { background: 'linear-gradient(135deg, #34d399, #14b8a6)' } :
                        alumnus.trackingStatus === 'near-track' ? { background: 'linear-gradient(135deg, #fbbf24, #f97316)' } :
                        alumnus.trackingStatus === 'off-track' ? { background: 'linear-gradient(135deg, #f87171, #ec4899)' } :
                        alumnus.trackingStatus === 'unknown' ? { background: 'linear-gradient(135deg, #9ca3af, #6b7280)' } :
                        { background: 'linear-gradient(135deg, #9ca3af, #6b7280)' }
                      }>
                        {(alumnus.trackingStatus === 'on-track' && 'On-track') ||
                         (alumnus.trackingStatus === 'near-track' && 'Near-track') ||
                         (alumnus.trackingStatus === 'off-track' && 'Off-track') ||
                         (alumnus.trackingStatus === 'unknown' && 'Unknown') ||
                         'Unknown'}
                      </span>
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {/* Status indicator */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <div className="w-6 h-6 rounded-full"
                     style={{
                       background: alumnus.trackingStatus === 'on-track' ? 'linear-gradient(135deg, #34d399, #14b8a6)' :
                                   alumnus.trackingStatus === 'near-track' ? 'linear-gradient(135deg, #fbbf24, #f97316)' :
                                   alumnus.trackingStatus === 'off-track' ? 'linear-gradient(135deg, #f87171, #ec4899)' :
                                   alumnus.trackingStatus === 'unknown' ? 'linear-gradient(135deg, #9ca3af, #6b7280)' :
                                   'linear-gradient(135deg, #9ca3af, #6b7280)'
                     }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-end space-x-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {alumnus?.firstName} {alumnus?.lastName}
                </h1>
                <span className="text-lg text-gray-600 font-normal">
                  {alumnus?.cohortYear}
                </span>
                {followUpData.hasFollowUp && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Flag className={`h-5 w-5 cursor-help ${followUpData.priorityColor}`} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <div className="space-y-1">
                        <p>{followUpData.description}</p>
                        <p className="text-xs text-gray-500">Last note: {followUpData.lastNoteText}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            </div>
            
            {/* Delete Alumni Button */}
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                    data-testid="button-delete-alumni"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Alumnus</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Liberation Path Card */}
          <div className="mb-6">
            <LiberationPathCard
              alumnus={alumnus}
              onUpdateAlumnus={handleUpdateAlumnus}
              onEditLiberationPath={() => {
                setActiveTab('overview');
                startEditing('overview');
              }}
            />
          </div>

          {/* Quick Dashboard */}
          <AlumniQuickDashboard 
            alumnus={alumnus}
            interactions={interactions}
            createSaveHandler={createSaveHandler}
            onAddNote={() => {
              setActiveTab('interactions');
              setEditingInteractionId('new');
              setTimeout(() => {
                notesRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            onEditNote={(id) => {
              setEditingInteractionId(id);
              setActiveTab('interactions');
              setTimeout(() => {
                notesRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          />

          {/* Timeline Structure - Demo 2 Style */}
          <div className="space-y-0">
            
            {/* Present - Current Status */}
            <TimelineCard
              id="present"
              title="Present"
              icon={TrendingUp}
              color="emerald"
            >
              {/* LinkedIn-style flowing layout - no nested sections */}
              <div className="space-y-4 pt-3">
                
                {/* Current Status & Path - Priority Information */}
                <div className="rounded-lg p-4 border" 
                     style={{ 
                       background: 'linear-gradient(90deg, rgba(63, 184, 113, 0.08), rgba(63, 184, 113, 0.04))',
                       borderColor: 'rgba(63, 184, 113, 0.2)'
                     }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Path:</span>
                        <InlineSelectField
                          value={alumnus.pathType || 'undefined'}
                          options={[
                            { value: "undefined", label: "Path Undefined" },
                            { value: "college", label: "College" },
                            { value: "work", label: "Work" },
                            { value: "training", label: "Training" },
                            { value: "military", label: "Military" },
                            { value: "other", label: "Other" }
                          ]}
                          onSave={async (value) => {
                            const finalValue = value === 'undefined' ? null : value;
                            await updateAlumniMutation.mutateAsync({ 
                              field: 'pathType', 
                              value: finalValue 
                            });
                            await updateAlumniMutation.mutateAsync({ 
                              field: 'pathTypeModified', 
                              value: true 
                            });
                          }}
                          fieldLabel="Liberation Path Type"
                          placeholder="Select path type"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Stage:</span>
                        <CurrentStageSelector 
                          alumnus={alumnus}
                          updateAlumniMutation={updateAlumniMutation}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Support:</span>
                        <InlineSelectField
                          value={alumnus.supportCategory || alumnus.grouping}
                          options={[
                            { value: "Low Needs", label: "Low Needs" },
                            { value: "Medium Needs", label: "Medium Needs" },
                            { value: "High Needs", label: "High Needs" }
                          ]}
                          onSave={createSaveHandler('supportCategory')}
                          fieldLabel="Support Category"
                          placeholder="Select"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Status:</span>
                        <InlineSelectField
                          value={alumnus.trackingStatus}
                          options={[
                            { value: "on-track", label: "On-Track" },
                            { value: "near-track", label: "Near-Track" },
                            { value: "off-track", label: "Off-Track" },
                            { value: "unknown", label: "Unknown" }
                          ]}
                          onSave={async (value) => {
                            await updateAlumniMutation.mutateAsync({ 
                              field: 'trackingStatus', 
                              value 
                            });
                            await updateAlumniMutation.mutateAsync({ 
                              field: 'trackingStatusModified', 
                              value: true 
                            });
                          }}
                          fieldLabel="Tracking Status"
                          placeholder="Select tracking status"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Last Attempt:</span>
                        <span className="text-sm px-2 py-1">
                          {(() => {
                            // Get most recent interaction date from timeline (any interaction)
                            if (interactions && interactions.length > 0) {
                              const sortedInteractions = interactions.sort((a, b) => {
                                // Parse dates safely to avoid timezone issues
                                const parseDate = (dateString: string) => {
                                  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    const [year, month, day] = dateString.split('-').map(Number);
                                    return new Date(year, month - 1, day);
                                  }
                                  return new Date(dateString);
                                };
                                const dateA = parseDate(a.date);
                                const dateB = parseDate(b.date);
                                return dateB.getTime() - dateA.getTime();
                              });
                              const mostRecent = sortedInteractions[0];
                              
                              // Parse the date safely to avoid timezone issues
                              if (mostRecent.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                const [year, month, day] = mostRecent.date.split('-').map(Number);
                                const localDate = new Date(year, month - 1, day);
                                return `${localDate.getMonth() + 1}/${localDate.getDate()}/${localDate.getFullYear()}`;
                              }
                              
                              // Fallback for other date formats
                              const recentDate = new Date(mostRecent.date);
                              return `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;
                            }
                            return 'No attempts recorded';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Last Contact:</span>
                        <span className="text-sm px-2 py-1">
                          {(() => {
                            // Get most recent successful interaction date (where studentResponded = true)
                            if (interactions && interactions.length > 0) {
                              const successfulInteractions = interactions
                                .filter(interaction => interaction.studentResponded === true)
                                .sort((a, b) => {
                                  // Parse dates safely to avoid timezone issues
                                  const parseDate = (dateString: string) => {
                                    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                      const [year, month, day] = dateString.split('-').map(Number);
                                      return new Date(year, month - 1, day);
                                    }
                                    return new Date(dateString);
                                  };
                                  const dateA = parseDate(a.date);
                                  const dateB = parseDate(b.date);
                                  return dateB.getTime() - dateA.getTime();
                                });
                              
                              if (successfulInteractions.length > 0) {
                                const mostRecent = successfulInteractions[0];
                                
                                // Parse the date safely to avoid timezone issues
                                if (mostRecent.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                  const [year, month, day] = mostRecent.date.split('-').map(Number);
                                  const localDate = new Date(year, month - 1, day);
                                  return `${localDate.getMonth() + 1}/${localDate.getDate()}/${localDate.getFullYear()}`;
                                }
                                
                                // Fallback for other date formats
                                const recentDate = new Date(mostRecent.date);
                                return `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;
                              }
                            }
                            
                            // Fallback to database lastContactDate if no successful interactions
                            if (alumnus.lastContactDate) {
                              const contactDate = new Date(alumnus.lastContactDate);
                              return `${contactDate.getMonth() + 1}/${contactDate.getDate()}/${contactDate.getFullYear()}`;
                            }
                            
                            // Final fallback to graduation date (June 1st + cohort year)
                            if (alumnus.cohortYear) {
                              const gradDate = new Date(alumnus.cohortYear, 5, 1); // June 1st
                              return `${gradDate.getMonth() + 1}/${gradDate.getDate()}/${gradDate.getFullYear()} (graduation)`;
                            }
                            
                            return 'No contact recorded';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Contact & Personal Information */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  
                  {/* Contact Details */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Contact
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <InlineTextField
                            value={alumnus.compSciHighEmail}
                            onSave={createSaveHandler('compSciHighEmail')}
                            fieldLabel="CompSci High Email"
                            placeholder="School email"
                          />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => createSaveHandler('preferredEmail')('compSciHighEmail')}
                              className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                            >
                              <Star className={`h-3 w-3 transition-colors ${
                                alumnus.preferredEmail === 'compSciHighEmail' 
                                  ? 'text-yellow-500 fill-current' 
                                  : 'text-gray-300 hover:text-yellow-300'
                              }`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set as preferred email for contact</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <InlineTextField
                            value={alumnus.personalEmail}
                            onSave={createSaveHandler('personalEmail')}
                            fieldLabel="Personal Email"
                            placeholder="Personal email"
                          />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => createSaveHandler('preferredEmail')('personalEmail')}
                              className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                            >
                              <Star className={`h-3 w-3 transition-colors ${
                                alumnus.preferredEmail === 'personalEmail' 
                                  ? 'text-yellow-500 fill-current' 
                                  : 'text-gray-300 hover:text-yellow-300'
                              }`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set as preferred email for contact</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.phone}
                          onSave={createSaveHandler('phone')}
                          fieldLabel="Phone"
                          placeholder="Phone"
                        />
                      </div>

                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Social Media
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Instagram className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.instagramHandle}
                          onSave={createSaveHandler('instagramHandle')}
                          fieldLabel="Instagram Handle"
                          placeholder="Instagram"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Twitter className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.twitterHandle}
                          onSave={createSaveHandler('twitterHandle')}
                          fieldLabel="Twitter Handle"
                          placeholder="Twitter"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Linkedin className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.linkedinHandle}
                          onSave={createSaveHandler('linkedinHandle')}
                          fieldLabel="LinkedIn Handle"
                          placeholder="LinkedIn"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <SiTiktok className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.tiktokHandle}
                          onSave={createSaveHandler('tiktokHandle')}
                          fieldLabel="TikTok Handle"
                          placeholder="TikTok"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Personal
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Contact ID</p>
                          </TooltipContent>
                        </Tooltip>
                        <InlineTextField
                          value={alumnus.contactId || "Not set"}
                          onSave={createSaveHandler('contactId')}
                          fieldLabel="Contact ID"
                          placeholder="Add contact ID"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Cake className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.dateOfBirth}
                          onSave={createSaveHandler('dateOfBirth')}
                          fieldLabel="Date of Birth"
                          fieldType="date"
                          placeholder="Date of birth"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <InlineTextField
                          value={alumnus.highSchoolGpa}
                          onSave={createSaveHandler('highSchoolGpa')}
                          fieldLabel="High School GPA"
                          fieldType="number"
                          placeholder="High school GPA"
                        />
                      </div>

                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    About
                  </h4>
                  <InlineTextField
                    value={alumnus.notes || ''}
                    onSave={createSaveHandler('notes')}
                    fieldLabel="Notes"
                    placeholder="Add anything important you want to remember about this student"
                    className="w-full"
                  />
                </div>

              </div>
            </TimelineCard>

            {/* Education */}
            <TimelineCard
              id="education"
              title="Education"
              icon={GraduationCap}
              color="sky"
            >
              <div className="space-y-4 pt-3">
                {/* Education Priority Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">College:</span>
                        <InlineCollegeField
                          value={alumnus.collegeAttending}
                          onSave={createSaveHandler('collegeAttending')}
                          fieldLabel="College"
                          placeholder="Search for college..."
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Program:</span>
                        <InlineTextField
                          value={alumnus.collegeProgram}
                          onSave={createSaveHandler('collegeProgram')}
                          fieldLabel="College Program"
                          placeholder="e.g. Tandon, SPS, HEOP"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Major:</span>
                        <InlineTextField
                          value={alumnus.collegeMajor}
                          onSave={createSaveHandler('collegeMajor')}
                          fieldLabel="College Major"
                          placeholder="Major"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">GPA:</span>
                        <InlineTextField
                          value={alumnus.collegeGpa}
                          onSave={createSaveHandler('collegeGpa')}
                          fieldLabel="College GPA"
                          placeholder="GPA"
                          className="text-sm"
                          fieldType="number"
                          validation={(value) => {
                            const num = parseFloat(value);
                            if (isNaN(num) || num < 0 || num > 4) {
                              return "GPA must be between 0.00 and 4.00";
                            }
                            return null;
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Enrolled:</span>
                        {(() => {
                          const isEnrolled = calculateEnrollmentStatus(alumnus);
                          return (
                            <div className={`flex items-center space-x-1 ${isEnrolled ? 'text-green-700' : 'text-gray-500'}`}>
                              <CheckCircle className={`h-3 w-3 ${isEnrolled ? 'text-green-600' : 'text-gray-400'}`} />
                              <span className="text-sm">{isEnrolled ? 'Yes' : 'No'}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Education Information */}
                <EducationTab alumnus={alumnus} />
              </div>
            </TimelineCard>

            {/* Career */}
            <TimelineCard
              id="career"
              title="Career"
              icon={Briefcase}
              color="violet"
            >
              <div className="space-y-4 pt-3">
                {/* Employment Priority Information */}
                {(() => {
                  const currentEmployment = getCurrentEmploymentData(alumnus.employmentHistory || []);
                  return (
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Employer:</span>
                            <span className="text-sm">
                              {currentEmployment.employerName || 'No employer listed'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Type:</span>
                            <span className="text-sm capitalize">
                              {currentEmployment.employmentType || 'Not specified'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Income:</span>
                            <span className="text-sm">
                              {currentEmployment.latestAnnualIncome ? `$${Number(currentEmployment.latestAnnualIncome).toLocaleString()}` : 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Employed:</span>
                            <span className={`text-sm ${currentEmployment.employed ? 'text-green-700' : 'text-gray-500'}`}>
                              {currentEmployment.employed ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Economic Liberation:</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`text-sm cursor-help ${currentEmployment.economicLiberation.status ? 'text-green-700' : 'text-gray-500'}`}>
                                  {currentEmployment.economicLiberation.status ? 'Achieved' : 'No'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {currentEmployment.economicLiberation.status 
                                    ? `Income above national median ($${currentEmployment.economicLiberation.threshold.toLocaleString()})`
                                    : `Income below national median ($${currentEmployment.economicLiberation.threshold.toLocaleString()})`
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Detailed Employment Information */}
                <EmploymentTab alumnus={alumnus} />
              </div>
            </TimelineCard>

            {/* Notes */}
            <div ref={notesRef}>
              <TimelineCard
                id="notes"
                title="Notes"
                icon={FileText}
                color="amber"
                isLast={true}
              >
              <div className="space-y-3 pt-3 ml-12">
                {/* Add new note form */}
                {editingInteractionId === 'new' && (
                  <InlineNoteForm 
                    alumni={alumnus}
                    onCancel={() => setEditingInteractionId(null)}
                    interaction={null}
                  />
                )}

                {interactions && interactions.length > 0 ? (
                  interactions
                    .sort((a, b) => {
                      const dateA = new Date(a.date ? a.date + 'T00:00:00' : a.createdAt);
                      const dateB = new Date(b.date ? b.date + 'T00:00:00' : b.createdAt);
                      return dateB.getTime() - dateA.getTime(); // Most recent first
                    })
                    .slice(0, 5)
                    .map((interaction) => (
                      editingInteractionId === interaction.id ? (
                        <InlineNoteForm
                          key={`edit-${interaction.id}`}
                          alumni={alumnus}
                          onCancel={() => setEditingInteractionId(null)}
                          interaction={interaction}
                        />
                      ) : (
                        <InteractionCard
                          key={interaction.id}
                          alumniId={Number(id)}
                          interaction={{
                            id: Number(interaction.id),
                            date: interaction.date,
                            type: interaction.type,
                            overview: interaction.overview || '',
                            internalSummary: interaction.internalSummary || '',
                            createdAt: interaction.createdAt,
                            studentResponded: interaction.studentResponded || false,
                            needsFollowUp: interaction.needsFollowUp || false,
                            followUpPriority: interaction.followUpPriority || '',
                            followUpDate: interaction.followUpDate || ''
                          }}
                          onEdit={() => setEditingInteractionId(interaction.id)}
                          onDelete={(id) => deleteInteractionMutation.mutate(id)}
                        />
                      )
                    ))
                ) : editingInteractionId !== 'new' ? (
                  <p className="text-gray-500 text-sm">No interactions recorded yet.</p>
                ) : null}
                
                {editingInteractionId !== 'new' && (
                  <div className="pt-4 border-t border-gray-100">
                    <Button 
                      onClick={() => setEditingInteractionId('new')}
                      className="w-full"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                )}
              </div>
              </TimelineCard>
            </div>
          </div>

          {/* Dialogs and Forms */}
        </div>

        {/* Status Popover */}
        <StatusPopover
          isOpen={isStatusPopoverOpen}
          onClose={() => setIsStatusPopoverOpen(false)}
          triggerRef={avatarRef}
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDelete}
          uploadingImage={uploadingImage}
          hasProfileImage={!!alumnus.profileImageUrl}
        />

        {/* Dialogs */}
        <Dialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to leave without saving?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUnsavedChangesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setUnsavedChangesDialog(false);
                setHasUnsavedChanges(false);
                if (nextAction) nextAction();
              }}>
                Discard Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stage Confirmation Dialog */}
        <AlertDialog open={showStageConfirmation} onOpenChange={setShowStageConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Manual Stage Override</AlertDialogTitle>
              <AlertDialogDescription>
                This will override the automatic yearly progression. The student's stage will be manually set and won't update automatically anymore. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowStageConfirmation(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStageChange}>
                Confirm Manual Override
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Alumni Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Alumnus
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{alumnus?.firstName} {alumnus?.lastName}</strong>? 
                <br/><br/>
                This action cannot be undone. All associated data including:
                <ul className="mt-2 ml-4 list-disc">
                  <li>Personal information and contact details</li>
                  <li>Academic records and progress tracking</li>
                  <li>All interaction notes and communications</li>
                  <li>Employment history and financial data</li>
                </ul>
                will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmation(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  deleteAlumniMutation.mutate();
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteAlumniMutation.isPending}
                data-testid="confirm-delete-alumni"
              >
                {deleteAlumniMutation.isPending ? "Deleting..." : "Delete Alumnus"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}