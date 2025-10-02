import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Edit2, 
  Mail, 
  Calendar,
  Plus,
  Info,
  RotateCcw,
  Flag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Alumni } from "@shared/schema";
import SupportNeedsIcon from "@/components/SupportNeedsIcon";
import { calculateLastContactDate, getContactRecencyTooltip } from "@/utils/contactRecency";
import { calculateAutoUpdate } from "@shared/autoCalculation";
import { STAGE_OPTIONS, calculateCurrentStage } from "@shared/liberationPath";

// Calculate highest priority follow-up from interactions
const calculateHighestFollowUpPriority = (interactions: any[]) => {
  const followUpInteractions = interactions.filter(
    interaction => interaction.followUpPriority && 
    interaction.interactionType === 'counselor-note'
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

// Get follow-up description with timing
const getFollowUpDescription = (priority: string | null) => {
  switch (priority) {
    case 'urgent': return 'Urgent followup - contact tomorrow';
    case 'high': return 'High priority followup - contact within 3 days';
    case 'normal': return 'Normal priority followup - contact within 1 week';
    case 'low': return 'Low priority followup - contact within 1 month';
    default: return 'No pending follow-ups';
  }
};

// Helper functions for button styling
const getPathTypeInfo = (pathType: string | null) => {
  switch (pathType) {
    case 'college':
      return { bgClass: 'bg-green-500', textClass: 'text-white' };
    case 'vocation':
      return { bgClass: 'bg-blue-500', textClass: 'text-white' };
    case 'employment':
      return { bgClass: 'bg-purple-500', textClass: 'text-white' };
    default:
      return { bgClass: 'bg-gray-200', textClass: 'text-gray-700' };
  }
};

const getCurrentStageInfo = (pathType: string | null, currentStage: string | null) => {
  return { bgClass: 'bg-blue-100', textClass: 'text-blue-700' };
};

const getTrackingStatusInfo = (trackingStatus: string | null) => {
  switch (trackingStatus) {
    case 'on-track':
      return { bgClass: 'bg-green-100', textClass: 'text-green-700' };
    case 'near-track':
      return { bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' };
    case 'off-track':
      return { bgClass: 'bg-red-100', textClass: 'text-red-700' };
    default:
      return { bgClass: 'bg-gray-200', textClass: 'text-gray-700' };
  }
};

interface AlumniHeaderProps {
  alumnus: Alumni;
  interactions?: any[];
  activeTab: string;
  isEditingOverview: boolean;
  isEditingEducation: boolean;
  isEditingEmployment: boolean;
  onEditOverview: () => void;
  onSaveOverview: () => void;
  onCancelOverview: () => void;
  onEditEducation: () => void;
  onSaveEducation: () => void;
  onCancelEducation: () => void;
  onEditEmployment: () => void;
  onSaveEmployment: () => void;
  onCancelEmployment: () => void;
  onStatusPopoverOpen: () => void;
  onUpdateAlumnus?: (updates: Partial<Alumni>) => void;
  updateOverviewMutation: { isPending: boolean };
  updateEducationMutation: { isPending: boolean };
  updateEmploymentMutation: { isPending: boolean };
  avatarRef: React.RefObject<HTMLDivElement>;
  getAvatarRingClass: (alumni: Alumni) => string;
}

export function AlumniHeader({
  alumnus,
  activeTab,
  isEditingOverview,
  isEditingEducation,
  isEditingEmployment,
  onEditOverview,
  onSaveOverview,
  onCancelOverview,
  onEditEducation,
  onSaveEducation,
  onCancelEducation,
  onEditEmployment,
  onSaveEmployment,
  onCancelEmployment,
  onStatusPopoverOpen,
  onUpdateAlumnus,
  updateOverviewMutation,
  updateEducationMutation,
  updateEmploymentMutation,
  avatarRef,
  getAvatarRingClass,
}: AlumniHeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showStageConfirmation, setShowStageConfirmation] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<string>('');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Handler functions for the three dropdowns
  const handlePathTypeChange = (newPathType: string) => {
    if (onUpdateAlumnus) {
      // Create updated alumni object for auto-calculation
      const updatedAlumni = { ...alumnus, pathType: newPathType as "college" | "vocation" | "employment" };
      const autoCalc = calculateAutoUpdate(updatedAlumni);
      
      onUpdateAlumnus({ 
        pathType: newPathType as "college" | "vocation" | "employment",
        currentStage: autoCalc.suggestedCurrentStage,
        trackingStatus: autoCalc.suggestedTrackingStatus
      });
    }
  };

  const handleCurrentStageChange = (newStage: string) => {
    // If already manually modified or no change, proceed directly
    if (alumnus.currentStageModified || newStage === displayCurrentStage) {
      if (onUpdateAlumnus) {
        onUpdateAlumnus({ currentStage: newStage });
      }
      return;
    }

    // Show confirmation for first-time manual override
    setPendingStageChange(newStage);
    setShowStageConfirmation(true);
  };

  const handleConfirmStageChange = () => {
    if (onUpdateAlumnus) {
      onUpdateAlumnus({ 
        currentStage: pendingStageChange,
        currentStageModified: true 
      });
      
      toast({
        title: "Stage manually set",
        description: "Automatic yearly progression has been disabled for this student.",
      });
    }
    setShowStageConfirmation(false);
    setPendingStageChange('');
  };

  const handleResetToAuto = () => {
    setShowResetConfirmation(true);
  };

  const handleConfirmReset = () => {
    if (onUpdateAlumnus) {
      // Force auto-calculation by temporarily clearing the modified flag
      const autoCalculatedStage = calculateCurrentStage({
        ...alumnus,
        currentStageModified: false
      });
      
      onUpdateAlumnus({ 
        currentStage: autoCalculatedStage,
        currentStageModified: false 
      });
      
      toast({
        title: "Reset to automatic",
        description: "Stage will now update automatically with student progress.",
      });
    }
    setShowResetConfirmation(false);
  };

  const handleTrackingStatusChange = (newStatus: string) => {
    if (onUpdateAlumnus) {
      onUpdateAlumnus({ trackingStatus: newStatus as "on-track" | "near-track" | "off-track" | "unknown" });
    }
  };

  // Compute the display current stage (respect manual override flag)
  const displayCurrentStage = alumnus.currentStageModified 
    ? alumnus.currentStage 
    : calculateCurrentStage(alumnus);

  // Get styling info for buttons
  const pathTypeInfo = getPathTypeInfo(alumnus.pathType);
  const currentStageInfo = getCurrentStageInfo(alumnus.pathType, displayCurrentStage);
  const trackingStatusInfo = getTrackingStatusInfo(alumnus.trackingStatus);
  const stages = STAGE_OPTIONS[alumnus.pathType as keyof typeof STAGE_OPTIONS] || [];

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation("/alumni")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Alumni</span>
        </Button>
        <div className="flex items-center space-x-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`mailto:${alumnus.preferredEmail || alumnus.personalEmail || alumnus.compSciHighEmail}`, '_blank')}
                disabled={!alumnus.preferredEmail && !alumnus.personalEmail && !alumnus.compSciHighEmail}
                className="h-9 w-9 p-0"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send Email</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled
                className="h-9 w-9 p-0 opacity-50 cursor-not-allowed"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Schedule Meeting (Coming Soon)</p>
            </TooltipContent>
          </Tooltip>
          {activeTab === 'overview' && (
            <Tooltip>
              <TooltipTrigger asChild>
                {!isEditingOverview ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onEditOverview}
                    className="h-9 w-9 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={onSaveOverview}
                      disabled={updateOverviewMutation.isPending}
                      className="h-9 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelOverview}
                      disabled={updateOverviewMutation.isPending}
                      className="h-9 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditingOverview ? "Edit Overview" : "Edit Overview"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {activeTab === 'education' && (
            <Tooltip>
              <TooltipTrigger asChild>
                {!isEditingEducation ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onEditEducation}
                    className="h-9 w-9 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={onSaveEducation}
                      disabled={updateEducationMutation.isPending}
                      className="h-9 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelEducation}
                      disabled={updateEducationMutation.isPending}
                      className="h-9 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditingEducation ? "Edit Education" : "Edit Education"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {activeTab === 'employment' && (
            <Tooltip>
              <TooltipTrigger asChild>
                {!isEditingEmployment ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onEditEmployment}
                    className="h-9 w-9 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={onSaveEmployment}
                      disabled={updateEmploymentMutation.isPending}
                      className="h-9 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelEmployment}
                      disabled={updateEmploymentMutation.isPending}
                      className="h-9 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditingEmployment ? "Save Career Changes" : "Edit Career"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-6 mb-6">
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                ref={avatarRef}
                className="relative cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onStatusPopoverOpen()}
              >
                <Avatar className={`h-24 w-24 ${getAvatarRingClass(alumnus)}`}>
                  <AvatarImage src={alumnus.profileImageUrl || undefined} alt={`${alumnus.firstName} ${alumnus.lastName}`} />
                  <AvatarFallback className="text-2xl bg-green-100 text-green-700">
                    {alumnus.firstName?.charAt(0) || ''}{alumnus.lastName?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                {alumnus.supportCategory && (
                  <div className="absolute -top-2 -right-2">
                    <SupportNeedsIcon supportNeeds={alumnus.supportCategory} />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getContactRecencyTooltip(calculateLastContactDate(alumnus, []))}</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Profile settings button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusPopoverOpen()}
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white border-2 border-gray-300 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit profile settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {alumnus.firstName} {alumnus.lastName}
            </h1>
            {(() => {
              const highestPriority = calculateHighestFollowUpPriority((interactions as any) || []);
              const hasFollowUp = !!highestPriority;
              
              if (!hasFollowUp) return null;
              
              const getPriorityColor = (priority: string) => {
                switch (priority) {
                  case 'urgent': return 'text-red-600';
                  case 'high': return 'text-orange-600';
                  case 'normal': return 'text-yellow-600';
                  case 'low': return 'text-blue-600';
                  default: return 'text-gray-600';
                }
              };
              
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Flag className={`h-5 w-5 cursor-help ${getPriorityColor(highestPriority!)}`} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getFollowUpDescription(highestPriority)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })()}
          </div>
          <p className="text-lg text-gray-600 mb-3">{alumnus.cohortYear}</p>
          
          {/* Economic Liberation Control Buttons */}
          <div className="flex items-center space-x-3">
            {/* Path Type Dropdown */}
            <Select value={alumnus.pathType || ''} onValueChange={handlePathTypeChange}>
              <SelectTrigger className={`px-3 py-1 rounded-full font-medium border-0 ${pathTypeInfo.bgClass} ${pathTypeInfo.textClass} hover:opacity-90 transition-opacity text-xs w-[120px] h-7`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College Path</SelectItem>
                <SelectItem value="vocation">Vocation Path</SelectItem>
                <SelectItem value="employment">Employment Path</SelectItem>
              </SelectContent>
            </Select>

            {/* Current Stage Dropdown */}
            <div className="relative">
              <Select value={displayCurrentStage || ''} onValueChange={handleCurrentStageChange}>
                <SelectTrigger className={`px-3 py-1 rounded-full font-medium border-0 ${currentStageInfo.bgClass} ${currentStageInfo.textClass} hover:opacity-90 transition-opacity text-xs w-[100px] h-7`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Manual Override Indicator */}
              {alumnus.currentStageModified && (
                <div className="absolute -bottom-6 left-0 flex items-center space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-orange-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Stage manually set - automatic yearly progression disabled</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetToAuto}
                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset to automatic yearly progression</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            {/* Tracking Status Dropdown */}
            <Select value={alumnus.trackingStatus || ''} onValueChange={handleTrackingStatusChange}>
              <SelectTrigger className={`px-3 py-1 rounded-full font-medium border-0 ${trackingStatusInfo.bgClass} ${trackingStatusInfo.textClass} hover:opacity-90 transition-opacity text-xs w-[110px] h-7`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on-track">On Track</SelectItem>
                <SelectItem value="near-track">Near Track</SelectItem>
                <SelectItem value="off-track">Off Track</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Manual Stage Override Confirmation Dialog */}
      <AlertDialog open={showStageConfirmation} onOpenChange={setShowStageConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Stage Override</AlertDialogTitle>
            <AlertDialogDescription>
              Changing this stage will disable automatic yearly progression for this student. 
              Future college year updates will need to be done manually.
              <br /><br />
              Continue with manual override?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowStageConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStageChange}>
              Override Manually
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Auto Confirmation Dialog */}
      <AlertDialog open={showResetConfirmation} onOpenChange={setShowResetConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Automatic</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the stage to be automatically calculated based on the student's current data 
              and enable automatic yearly progression going forward.
              <br /><br />
              Are you sure you want to reset to automatic mode?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset}>
              Reset to Auto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}