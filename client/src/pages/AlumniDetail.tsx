import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { format } from 'date-fns';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit2, Mail, Calendar, User, GraduationCap, Briefcase, FileText, Pencil, Save, X, Phone, MessageCircle, Activity, MapPin, DollarSign, TrendingUp, Heart, Star, CheckCircle, Target, Award, Users, Building, ChevronDown, ChevronRight, ChevronLeft, Camera, Trash2, Info, RotateCcw, Building2, Instagram, Twitter, Linkedin, Home, AlertTriangle, Cake, Flag, Check, ExternalLink, Sparkles, StickyNote, MessageSquare, MoreVertical } from 'lucide-react';
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
import { InlineScholarshipManager } from '@/components/InlineScholarshipManager';
import type { PathType } from '@shared/liberationPath';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Social Media Icon Component with advanced interactions
const SocialMediaIcon = ({ 
  platform, 
  icon: IconComponent, 
  handle, 
  onSave 
}: {
  platform: string;
  icon: any;
  handle: string | null;
  onSave: (value: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(handle || '');

  const hasHandle = Boolean(handle);
  
  // URL generators for each platform
  const getProfileUrl = (handle: string) => {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    switch (platform.toLowerCase()) {
      case 'instagram':
        return `https://instagram.com/${cleanHandle}`;
      case 'twitter':
        return `https://twitter.com/${cleanHandle}`;
      case 'linkedin':
        return `https://linkedin.com/in/${cleanHandle}`;
      case 'tiktok':
        return `https://tiktok.com/@${cleanHandle}`;
      default:
        return '#';
    }
  };

  const handleSave = async () => {
    await onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(handle || '');
    setIsEditing(false);
  };

  const handleIconClick = () => {
    if (!hasHandle) {
      // Empty state - start editing
      setIsEditing(true);
    }
    // If has handle, the dropdown will handle the interaction
  };

  const handleVisitProfile = () => {
    if (handle) {
      window.open(getProfileUrl(handle), '_blank');
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded">
        <IconComponent className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={`${platform} handle`}
          className="text-xs border rounded px-1 py-0.5 w-20"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // If has handle, wrap in dropdown for edit/visit options
  if (hasHandle) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 text-gray-700 hover:text-gray-900 hover:bg-transparent"
              >
                <IconComponent className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{platform}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="center" className="w-40">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3 w-3 mr-2" />
            Edit handle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleVisitProfile}>
            <ExternalLink className="h-3 w-3 mr-2" />
            Visit profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Empty state - just the clickable icon with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="h-5 w-5 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
          onClick={handleIconClick}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{platform}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// PresentCard Component - Single page with all present information
const PaginatedPresentCard = ({ 
  alumnus, 
  interactions,
  createSaveHandler, 
  updateAlumniMutation
}: {
  alumnus: Alumni;
  interactions: any[];
  createSaveHandler: (field: string) => (value: any) => Promise<void>;
  updateAlumniMutation: any;
}) => {
  
  
  // Helper functions
  const getLastAttemptDate = () => {
    if (interactions && interactions.length > 0) {
      const sortedInteractions = [...interactions].sort((a, b) => {
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
      
      if (mostRecent.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = mostRecent.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return `${localDate.getMonth() + 1}/${localDate.getDate()}/${localDate.getFullYear()}`;
      }
      
      const recentDate = new Date(mostRecent.date);
      return `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;
    }
    return 'No attempts recorded';
  };

  const getLastContactDate = () => {
    if (interactions && interactions.length > 0) {
      const successfulInteractions = interactions
        .filter(interaction => interaction.studentResponded === true)
        .sort((a, b) => {
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
        
        if (mostRecent.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = mostRecent.date.split('-').map(Number);
          const localDate = new Date(year, month - 1, day);
          return `${localDate.getMonth() + 1}/${localDate.getDate()}/${localDate.getFullYear()}`;
        }
        
        const recentDate = new Date(mostRecent.date);
        return `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;
      }
    }
    
    if (alumnus.lastContactDate) {
      const contactDate = new Date(alumnus.lastContactDate);
      return `${contactDate.getMonth() + 1}/${contactDate.getDate()}/${contactDate.getFullYear()}`;
    }
    
    if (alumnus.cohortYear) {
      const gradDate = new Date(alumnus.cohortYear, 5, 1); // June 1st
      return `${gradDate.getMonth() + 1}/${gradDate.getDate()}/${gradDate.getFullYear()} (graduation)`;
    }
    
    return 'No contact recorded';
  };

  // Single page with all content combined
  const renderContent = () => {
    return (
      <div className="space-y-4">
        {/* Path and Stage with Arrow */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
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
              fieldLabel="Path Type"
              placeholder="Path"
              className="text-sm"
            />
            
            <div className="flex items-center text-gray-400">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
          
          <div>
            <CurrentStageSelector 
              alumnus={alumnus}
              updateAlumniMutation={updateAlumniMutation}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mt-4">
          <div>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div>
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
                    fieldLabel="Status"
                    placeholder="Status"
                    className="text-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Track Status</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div>
            <InlineSelectField
              value={alumnus.supportCategory || alumnus.grouping}
              options={[
                { value: "Low Needs", label: "Low Needs" },
                { value: "Medium Needs", label: "Medium Needs" },
                { value: "High Needs", label: "High Needs" }
              ]}
              onSave={createSaveHandler('supportCategory')}
              fieldLabel="Support"
              placeholder="Support"
              className="text-sm"
            />
          </div>
        </div>

        {/* Personal Details - from page 2 */}
        <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-100">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div>
                <InlineTextField
                  value={alumnus.contactId}
                  onSave={createSaveHandler('contactId')}
                  fieldLabel="Contact ID"
                  placeholder="Contact ID"
                  className="text-sm"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Contact ID</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <InlineTextField
              value={alumnus.dateOfBirth}
              onSave={createSaveHandler('dateOfBirth')}
              fieldType="date"
              fieldLabel="DOB"
              placeholder="Date of Birth"
              className="text-sm"
            />
          </div>
          <div>
            <InlineTextField
              value={alumnus.highSchoolGpa}
              onSave={createSaveHandler('highSchoolGpa')}
              fieldLabel="HS GPA"
              placeholder="HS GPA"
              className="text-sm"
            />
          </div>
          <div>
            <InlineTextField
              value={alumnus.householdIncome}
              onSave={createSaveHandler('householdIncome')}
              fieldLabel="Income"
              placeholder="Yearly Income"
              className="text-sm"
            />
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <div className="space-y-2 pl-2">
            <div className="flex items-center space-x-2">
              <Mail className="h-3 w-3 text-gray-400" />
              <div className="flex-1">
                <InlineTextField
                  value={alumnus.compSciHighEmail}
                  onSave={createSaveHandler('compSciHighEmail')}
                  fieldLabel="School Email"
                  placeholder="School email"
                  className="text-sm"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Star className={`h-3 w-3 cursor-pointer ${
                    alumnus.preferredEmail === 'compSciHighEmail' 
                      ? 'text-yellow-500 fill-current' 
                      : 'text-gray-300'
                  }`} onClick={() => createSaveHandler('preferredEmail')('compSciHighEmail')} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Set as preferred email for contact</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-3 w-3 text-gray-400" />
              <div className="flex-1">
                <InlineTextField
                  value={alumnus.personalEmail}
                  onSave={createSaveHandler('personalEmail')}
                  fieldLabel="Personal Email"
                  placeholder="Personal email"
                  className="text-sm"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Star className={`h-3 w-3 cursor-pointer ${
                    alumnus.preferredEmail === 'personalEmail' 
                      ? 'text-yellow-500 fill-current' 
                      : 'text-gray-300'
                  }`} onClick={() => createSaveHandler('preferredEmail')('personalEmail')} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Set as preferred email for contact</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-3 w-3 text-gray-400" />
              <InlineTextField
                value={alumnus.phone}
                onSave={createSaveHandler('phone')}
                fieldLabel="Phone"
                placeholder="Phone"
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-between pt-1 pl-2">
            <SocialMediaIcon
              platform="Instagram"
              icon={Instagram}
              handle={alumnus.instagramHandle}
              onSave={createSaveHandler('instagramHandle')}
            />
            <SocialMediaIcon
              platform="Twitter"
              icon={Twitter}
              handle={alumnus.twitterHandle}
              onSave={createSaveHandler('twitterHandle')}
            />
            <SocialMediaIcon
              platform="LinkedIn"
              icon={Linkedin}
              handle={alumnus.linkedinHandle}
              onSave={createSaveHandler('linkedinHandle')}
            />
            <SocialMediaIcon
              platform="TikTok"
              icon={SiTiktok}
              handle={alumnus.tiktokHandle}
              onSave={createSaveHandler('tiktokHandle')}
            />
          </div>
        </div>

        {/* About Section - from page 2 */}
        <div className="pt-3 border-t border-gray-100">
          <div className="pl-2">
            <div className="text-sm font-medium text-gray-700 mb-2">
              About
            </div>
            <InlineTextField
              value={alumnus.notes}
              onSave={createSaveHandler('notes')}
              fieldLabel="About"
              placeholder="Add anything important you want to remember about this student"
              className="text-sm"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 -m-6 px-6 py-4 bg-green-50/40 rounded-t-2xl">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--csh-green-500)' }}>
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Present</h3>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

// EducationCard Component - Single page with all education information
const PaginatedEducationCard = ({ 
  alumnus, 
  createSaveHandler, 
  updateAlumniMutation
}: {
  alumnus: Alumni;
  createSaveHandler: (field: string) => (value: any) => Promise<void>;
  updateAlumniMutation: any;
}) => {
  
  // Helper functions from EducationTab.tsx - exact same logic
  const getGpaColorClass = (gpa: string | null | undefined) => {
    if (!gpa) return 'text-gray-400';
    const numGpa = parseFloat(gpa);
    if (isNaN(numGpa)) return 'text-gray-400';
    if (numGpa >= 3.5) return 'text-green-600';
    if (numGpa >= 3.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Education Tab enrollment status logic - exact same as EducationTab.tsx
  const getEnrollmentStatusValue = () => {
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

  // Handle field updates with special enrollment status logic - exact same as EducationTab.tsx
  const handleFieldUpdate = async (field: string, value: any) => {
    // Special handling for enrollment status - mark as manually modified
    if (field === 'enrollmentStatus') {
      await createSaveHandler('enrollmentStatus')(value);
      await createSaveHandler('enrollmentStatusModified')(true);
    } else {
      await createSaveHandler(field)(value);
    }
  };

  // Options arrays from EducationTab.tsx - exact same
  const enrollmentStatusOptions = [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'graduated', label: 'Graduated' },
    { value: 'dropped-out', label: 'Dropped Out' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'gap-year', label: 'Gap Year' },
    { value: 'deferred', label: 'Deferred' }
  ];

  const transferStatusOptions = [
    { value: 'not-transfer', label: 'Not a Transfer' },
    { value: 'community-to-4year', label: 'Community to 4-year' },
    { value: '4year-to-4year', label: '4-year to 4-year' },
    { value: 'internal-transfer', label: 'Internal Transfer' },
    { value: 'reverse-transfer', label: 'Reverse Transfer' },
    { value: 'considering', label: 'Considering Transfer' }
  ];

  // Single page with all content combined
  const renderContent = () => {
    return (
      <div className="space-y-3">
        {/* Line 1: College + Green Checkmark */}
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <InlineCollegeField
              value={alumnus.collegeAttending}
              onSave={handleFieldUpdate.bind(null, 'collegeAttending')}
              fieldLabel="College"
              placeholder="Search for college..."
              className="text-sm"
            />
          </div>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1">
                <CheckCircle className={`h-4 w-4 ${getEnrollmentStatusValue() === 'enrolled' ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getEnrollmentStatusValue() === 'enrolled' ? 'Currently enrolled' : 'Not currently enrolled'}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Line 2: Enrollment Status */}
        <div>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div>
                <InlineSelectField
                  value={getEnrollmentStatusValue()}
                  options={enrollmentStatusOptions}
                  onSave={(value) => handleFieldUpdate('enrollmentStatus', value)}
                  fieldLabel="Enrollment Status"
                  placeholder="Add"
                  className="text-sm"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current Enrollment Status</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Line 3: Program */}
        <div>
          <InlineTextField
            value={alumnus.collegeProgram}
            onSave={handleFieldUpdate.bind(null, 'collegeProgram')}
            fieldLabel="Program"
            placeholder="Program (HEOP, SPS, etc.)"
            className="text-sm"
          />
        </div>

        {/* Opportunity Program */}
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2 pl-2">
                <span className="text-sm text-gray-600">Opportunity Program:</span>
                <InlineBooleanField
                  value={alumnus.enrolledInOpportunityProgram}
                  onSave={(value) => handleFieldUpdate('enrolledInOpportunityProgram', value)}
                  fieldLabel="Enrolled in Opportunity Program"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>HEOP, EOP, or similar support programs</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Line 4: Major, Minor (side by side) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <InlineTextField
                    value={alumnus.collegeMajor}
                    onSave={handleFieldUpdate.bind(null, 'collegeMajor')}
                    fieldLabel="Major"
                    placeholder="Major"
                    className="text-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>College Major</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <InlineTextField
                    value={alumnus.collegeMinor}
                    onSave={handleFieldUpdate.bind(null, 'collegeMinor')}
                    fieldLabel="Minor"
                    placeholder="Minor"
                    className="text-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>College Minor</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Line 5: GPA, Expected Graduation Date (side by side) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <InlineTextField
              value={alumnus.collegeGpa}
              onSave={handleFieldUpdate.bind(null, 'collegeGpa')}
              fieldLabel="GPA"
              placeholder="GPA"
              fieldType="number"
              validation={(value) => {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0 || num > 4) {
                  return "GPA must be between 0.00 and 4.00";
                }
                return null;
              }}
              className={`text-sm ${getGpaColorClass(alumnus.collegeGpa)}`}
            />
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <InlineTextField
                    value={alumnus.expectedGraduationDate}
                    onSave={handleFieldUpdate.bind(null, 'expectedGraduationDate')}
                    fieldLabel="Graduation"
                    placeholder="Graduation"
                    fieldType="date"
                    className="text-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Approximate date of Graduation</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Line 6: Transfer Status */}
        <div>
          <InlineSelectField
            value={alumnus.transferStudentStatus}
            options={transferStatusOptions}
            onSave={handleFieldUpdate.bind(null, 'transferStudentStatus')}
            fieldLabel="Transfer Status"
            placeholder="Transfer Status"
            className="text-sm"
          />
        </div>

        {/* Scholarships - from page 2 */}
        <div className="border-t border-gray-100 pt-3">
          <div>
            <InlineScholarshipManager
              scholarships={alumnus.scholarships || []}
              onUpdate={(scholarships) => handleFieldUpdate('scholarships', scholarships)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 -m-6 px-6 py-4 bg-blue-50/40 rounded-t-2xl">
        <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-400 rounded-xl flex items-center justify-center shadow-sm">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Education</h3>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

// PaginatedNotesCard Component - Shows recent notes with navigation
const PaginatedNotesCard = ({ 
  interactions,
  currentPage,
  setCurrentPage,
  alumniId,
  onAddNote,
  onEditNote,
  onDeleteNote,
  editingInteractionId,
  alumnus
}: {
  interactions: any[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  alumniId: number;
  onAddNote?: () => void;
  onEditNote?: (id: number | 'new') => void;
  onDeleteNote?: (id: number) => void;
  editingInteractionId?: number | 'new' | null;
  alumnus?: any;
}) => {
  // Sort interactions by date (most recent first), using createdAt for chronological ordering within same day
  const sortedNotes = [...interactions]
    .sort((a, b) => {
      // Always use createdAt for accurate chronological sorting (includes time)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

  const totalNotes = sortedNotes.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 -m-6 px-6 py-4 bg-orange-50/40 rounded-t-2xl">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center shadow-sm">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Notes</h3>
      </div>
      
      {/* Content - Fixed height with scrollable notes */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '400px' }}>
        {totalNotes === 0 && editingInteractionId !== 'new' ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm mb-2">No notes yet</p>
            <p className="text-gray-400 text-xs">Click "+ Add Note" below to get started</p>
          </div>
        ) : (
          // All notes vertically
          <div className="space-y-3 pb-4">
            {/* Add new note form */}
            {editingInteractionId === 'new' && alumnus && (
              <InlineNoteForm 
                alumni={alumnus}
                onCancel={() => onEditNote?.(null as any)}
                interaction={null}
              />
            )}
            
            {sortedNotes.map((note) => (
              editingInteractionId === note.id && alumnus ? (
                <InlineNoteForm
                  key={`edit-${note.id}`}
                  alumni={alumnus}
                  onCancel={() => onEditNote?.(null as any)}
                  interaction={note}
                />
              ) : (
                <InteractionCard 
                  key={note.id}
                  interaction={note}
                  alumniId={alumniId}
                  onEdit={() => onEditNote?.(note.id)}
                  onDelete={(id) => onDeleteNote?.(id)}
                  hideTimeline={true}
                />
              )
            ))}
          </div>
        )}
      </div>
      
      {/* Add Note Button */}
      <div className="flex justify-center gap-2 mt-auto pt-4 border-t border-gray-100">
        <button
          onClick={onAddNote}
          disabled={editingInteractionId === 'new'}
          className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-md border transition-all font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-700 hover:text-yellow-800 border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>
    </div>
  );
};

// Custom AlumniQuickDashboard for V2 with PaginatedPresentCard
const AlumniQuickDashboardV2 = ({ 
  alumnus, 
  interactions, 
  createSaveHandler,
  updateAlumniMutation,
  onAddNote,
  onEditNote,
  editingInteractionId,
  onDeleteNote
}: {
  alumnus: Alumni;
  interactions: any[];
  createSaveHandler: (field: string) => (value: any) => Promise<void>;
  updateAlumniMutation: any;
  onAddNote?: () => void;
  onEditNote?: (id: number | 'new') => void;
  editingInteractionId?: number | 'new' | null;
  onDeleteNote?: (id: number) => void;
}) => {
  
  // Pagination state for Notes card - persisted across component unmounts/remounts
  const [notesCurrentPage, setNotesCurrentPage] = useState(() => {
    const stored = sessionStorage.getItem(`alumniDetailV2_${alumnus.id}_notesPage`);
    return stored ? parseInt(stored, 10) : 0;
  });
  
  // Persist pagination state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(`alumniDetailV2_${alumnus.id}_notesPage`, notesCurrentPage.toString());
  }, [alumnus.id, notesCurrentPage]);
  
  
  // Get recent interactions for notes (same as original)
  const recentInteractions = [...interactions]
    .sort((a, b) => {
      const dateA = new Date(a.date ? a.date + 'T00:00:00' : a.createdAt);
      const dateB = new Date(b.date ? b.date + 'T00:00:00' : b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 6);

  // Helper functions (same as original)
  const getGpaColorClass = (gpa: string | null | undefined) => {
    if (!gpa) return 'text-gray-400';
    const numGpa = parseFloat(gpa);
    if (isNaN(numGpa)) return 'text-gray-400';
    if (numGpa >= 3.5) return 'text-green-600';
    if (numGpa >= 3.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatIncome = (income: string | null | undefined) => {
    if (!income) return null;
    const num = parseFloat(income.replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return income;
    return `$${num.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return format(date, 'MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const enrollmentStatusOptions = [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'graduated', label: 'Graduated' },
    { value: 'dropped-out', label: 'Dropped Out' },
    { value: 'gap-year', label: 'Gap Year' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'unknown', label: 'Unknown' }
  ];

  const employmentTypeOptions = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'internship', label: 'Internship' },
    { value: 'temporary', label: 'Temporary' }
  ];

  return (
    <>
      {/* Four Horizontal Cards with Paginated Present Card */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* Present Card - Single Page */}
        <Card className="shadow-md border border-gray-200 bg-white h-full rounded-2xl">
          <CardContent className="p-6 h-full">
            <PaginatedPresentCard 
              alumnus={alumnus}
              interactions={interactions}
              createSaveHandler={createSaveHandler}
              updateAlumniMutation={updateAlumniMutation}
            />
          </CardContent>
        </Card>

        {/* Education Card - Single Page */}
        <Card className="shadow-md border border-gray-200 bg-white h-full rounded-2xl">
          <CardContent className="p-6 h-full">
            <PaginatedEducationCard 
              alumnus={alumnus}
              createSaveHandler={createSaveHandler}
              updateAlumniMutation={updateAlumniMutation}
            />
          </CardContent>
        </Card>

        {/* Career Card - Simplified */}
        <Card className="shadow-md border border-gray-200 bg-white h-full rounded-2xl">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2.5 mb-4 -m-6 px-6 py-4 bg-violet-50/40 rounded-t-2xl">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-500 rounded-xl flex items-center justify-center shadow-sm">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Career</h3>
            </div>
            
            {/* Employment & Training List */}
            <div className="flex-1 overflow-y-auto">
              <EmploymentTab alumnus={alumnus} />
            </div>
          </CardContent>
        </Card>

        {/* Notes Card - New */}
        <Card className="shadow-md border border-gray-200 bg-white h-full rounded-2xl">
          <CardContent className="p-6 h-full">
            <PaginatedNotesCard 
              interactions={interactions}
              currentPage={notesCurrentPage}
              setCurrentPage={setNotesCurrentPage}
              alumniId={alumnus.id}
              onAddNote={onAddNote}
              onEditNote={onEditNote}
              editingInteractionId={editingInteractionId}
              onDeleteNote={onDeleteNote}
              alumnus={alumnus}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Current Stage Selector Component with conditional reset button
const CurrentStageSelector = ({ alumnus, updateAlumniMutation }: { 
  alumnus: Alumni, 
  updateAlumniMutation: any 
}) => {
  const [showStageWarning, setShowStageWarning] = useState(false);
  const [pendingStageValue, setPendingStageValue] = useState<string>('');
  
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

  const handleStageChange = (value: string) => {
    // Show warning dialog before allowing the change
    setPendingStageValue(value);
    setShowStageWarning(true);
  };
  
  const confirmStageChange = () => {
    setEditValue(pendingStageValue);
    setShowStageWarning(false);
    setPendingStageValue('');
  };
  
  const cancelStageChange = () => {
    setShowStageWarning(false);
    setPendingStageValue('');
  };

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
      <>
        <AlertDialog open={showStageWarning} onOpenChange={setShowStageWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Modify Auto-Calculated Stage?</AlertDialogTitle>
              <AlertDialogDescription>
                The stage is automatically calculated based on the student's cohort year. 
                Are you sure you want to manually override this?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelStageChange}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStageChange}>Yes, Override</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="flex flex-col space-y-2 w-full">
          <div className="flex items-center space-x-2">
            <Select 
              value={editValue || ""} 
              onValueChange={handleStageChange} 
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
      </>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="inline-block min-w-[100px] pl-2 py-1 rounded transition-colors hover:bg-blue-50 cursor-pointer"
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
  const mostRecentJob = currentJob || [...employmentHistory]
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
        <div className={`ml-16 bg-white rounded-2xl shadow-md border border-gray-100 mb-2 overflow-hidden hover:shadow-xl transition-all duration-300 ${isExpanded ? 'shadow-lg' : ''}`}>
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

export default function AlumniDetail({ alumniId: propAlumniId, embedded = false }: AlumniDetailProps = {}) {
  const { id: urlId } = useParams<{ id: string }>();
  const id = propAlumniId || urlId;

  // Early return if no ID is provided
  if (!id) {
    return (
      <div className="min-h-screen bg-[#F8F7FB] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Alumni Selected</h1>
            <p className="text-gray-600">Please select an alumni to view their profile.</p>
          </div>
        </div>
      </div>
    );
  }
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
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

  // Edit alumni form schema
  const currentYear = new Date().getFullYear();
  const editAlumniSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    cohortYear: z.number().min(2022).max(currentYear + 2),
    contactId: z.string().nullable().optional().transform(val => val === "" ? null : val || null),
  });

  type EditAlumniFormData = z.infer<typeof editAlumniSchema>;

  // Edit alumni form
  const editForm = useForm<EditAlumniFormData>({
    resolver: zodResolver(editAlumniSchema),
    values: alumnus ? {
      firstName: alumnus.firstName || "",
      lastName: alumnus.lastName || "",
      cohortYear: alumnus.cohortYear || currentYear,
      contactId: alumnus.contactId || "",
    } : undefined,
  });

  // Edit alumni mutation
  const editAlumniMutation = useMutation({
    mutationFn: async (data: EditAlumniFormData) => {
      const response = await apiRequest('PATCH', `/api/alumni/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.alumniById(id!) });
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
      toast({
        title: "Success",
        description: "Alumni profile updated successfully",
      });
      setShowEditDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update alumni profile",
        variant: "destructive",
      });
    },
  });

  const onEditSubmit = (data: EditAlumniFormData) => {
    editAlumniMutation.mutate(data);
  };

  // Fix: Extract the first element from the array if it's an array
  // Remove this line - use alumnus directly

  const handleImageUpload = (imageData: string) => {
    setUploadingImage(true);
    uploadImageMutation.mutate(imageData);
  };

  const handleImageDelete = () => {
    deleteImageMutation.mutate();
  };

  // Ref for avatar div to inspect computed styles
  const avatarDivRef = useRef<HTMLDivElement>(null);

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

  // Get soft background color based on contact recency
  const getContactRecencyBgClass = (alumnus: Alumni): string => {
    const lastContactDate = calculateLastContactDate(alumnus, interactions || []);
    const days = lastContactDate ? Math.floor((new Date().getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    if (days === null) {
      return 'bg-gray-50/30'; // Very subtle gray
    }
    
    if (days <= 30) {
      return 'bg-green-50/40'; // Subtle green
    } else if (days <= 90) {
      return 'bg-yellow-50/40'; // Subtle yellow
    } else if (days <= 180) {
      return 'bg-orange-50/40'; // Subtle orange
    } else {
      return 'bg-red-50/40'; // Subtle red
    }
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
      <div className="min-h-screen bg-[#F8F7FB] p-6">
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
      <div className="min-h-screen bg-[#F8F7FB] p-6">
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
      <div className={embedded ? "h-full bg-white" : "min-h-screen bg-[#F8F7FB]"}>

        {/* Main content */}
        <div className={`max-w-screen-2xl mx-auto px-4 ${embedded ? 'pt-6 pb-2' : 'py-6'}`}>
          
          {/* Profile header with gradient accent */}
          <div className="flex items-center justify-between gap-6 mb-6">
            <Card className="shadow-md border border-gray-200 bg-white rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
            <div 
              className="relative cursor-pointer group" 
              ref={avatarRef}
              onClick={() => setIsStatusPopoverOpen(true)}
            >
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div 
                    ref={avatarDivRef}
                    className="relative w-16 h-16 rounded-2xl shadow-xl"
                    style={avatarBorderStyle}
                    data-alumni-id={alumnus.id}
                  >
                    {alumnus.profileImageUrl ? (
                      <img 
                        src={alumnus.profileImageUrl} 
                        alt={`${alumnus.firstName} ${alumnus.lastName}`}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--csh-green-500)' }}>
                        <span className="text-2xl font-bold text-white">
                          {alumnus?.firstName?.charAt(0)}{alumnus?.lastName?.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Upload overlay on hover */}
                    <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
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
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                <div className="w-4 h-4 rounded-full"
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
              </CardContent>
            </Card>
            
            {/* Contact History Card */}
            <Card className="shadow-md border border-gray-200 rounded-2xl">
              <CardContent className={`p-6 h-28 flex items-center ${getContactRecencyBgClass(alumnus)}`}>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-500">Last Outreach:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(() => {
                        if (interactions && interactions.length > 0) {
                          const sortedInteractions = [...interactions].sort((a, b) => {
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
                          
                          if (mostRecent.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const [year, month, day] = mostRecent.date.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            return `${localDate.getMonth() + 1}/${localDate.getDate()}/${localDate.getFullYear()}`;
                          }
                          
                          const recentDate = new Date(mostRecent.date);
                          return `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;
                        }
                        return 'No attempts';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-500">Last Contact:</span>
                    {(() => {
                      if (interactions && interactions.length > 0) {
                        const successfulInteractions = interactions
                          .filter(interaction => interaction.studentResponded === true)
                          .sort((a, b) => {
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
                          let dateText = '';
                          
                          if (mostRecent.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const [year, month, day] = mostRecent.date.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            dateText = `${localDate.getMonth() + 1}/${localDate.getDate()}/${localDate.getFullYear()}`;
                          } else {
                            const recentDate = new Date(mostRecent.date);
                            dateText = `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;
                          }
                          
                          return <span className="text-sm font-medium text-gray-900">{dateText}</span>;
                        }
                      }
                      
                      if (alumnus.lastContactDate) {
                        const contactDate = new Date(alumnus.lastContactDate);
                        const dateText = `${contactDate.getMonth() + 1}/${contactDate.getDate()}/${contactDate.getFullYear()}`;
                        return <span className="text-sm font-medium text-gray-900">{dateText}</span>;
                      }
                      
                      if (alumnus.cohortYear) {
                        const gradDate = new Date(alumnus.cohortYear, 5, 1);
                        const dateText = `${gradDate.getMonth() + 1}/${gradDate.getDate()}/${gradDate.getFullYear()} (grad)`;
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium text-gray-900 cursor-help">{dateText}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No contact recorded. Showing graduation date as fallback.</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      
                      return <span className="text-sm font-medium text-gray-900">No contact</span>;
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Liberation Path Card - Moved to Header */}
            <div className="flex-1 max-w-2xl">
              <LiberationPathCard
                alumnus={alumnus}
                onUpdateAlumnus={handleUpdateAlumnus}
                onEditLiberationPath={() => {
                  setActiveTab('overview');
                  startEditing('overview');
                }}
              />
            </div>
            
            {/* Actions Menu */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setShowEditDialog(true)}
                    data-testid="button-edit-alumni"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Alumni
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="text-red-600 focus:text-red-600"
                    data-testid="button-delete-alumni"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Alumni
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>


          {/* Quick Dashboard */}
          <AlumniQuickDashboardV2 
            alumnus={alumnus}
            interactions={interactions}
            createSaveHandler={createSaveHandler}
            updateAlumniMutation={updateAlumniMutation}
            editingInteractionId={editingInteractionId}
            onAddNote={() => {
              setEditingInteractionId('new');
            }}
            onEditNote={(id) => {
              setEditingInteractionId(id);
            }}
            onDeleteNote={(id) => {
              deleteInteractionMutation.mutate(id);
            }}
          />

          {/* Timeline Structure - Demo 2 Style */}
          <div className="space-y-0">
            
            {/* LEGACY PRESENT REMOVED - DISABLED */}
            {false && (
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
                              const sortedInteractions = [...interactions].sort((a, b) => {
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
            )}

            {/* LEGACY EDUCATION REMOVED - DISABLED */}
            {false && (
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
            )}

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

        {/* Edit Alumni Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Alumni</DialogTitle>
              <DialogDescription>
                Update basic alumni information. Additional details can be edited inline on the profile page.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="cohortYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cohort Year *</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-cohortYear">
                            <SelectValue placeholder="Select cohort year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: currentYear - 2022 + 3 }, (_, i) => 2022 + i).map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact ID</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          value={field.value || ""}
                          placeholder="External contact system ID (optional)" 
                          data-testid="input-edit-contactId"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                    disabled={editAlumniMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editAlumniMutation.isPending}
                    data-testid="button-submit-edit-alumni"
                  >
                    {editAlumniMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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