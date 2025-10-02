import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Phone, 
  Mail, 
  Instagram, 
  Twitter, 
  Hash, 
  Linkedin, 
  Users, 
  Home, 
  User, 
  MapPin, 
  Building2, 
  Calendar, 
  FileText, 
  History,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import type { Alumni } from "@shared/schema";
import { calculateLastContactDate } from "../utils/contactRecency";
import { STAGE_OPTIONS, calculateCurrentStage, calculateExpectedStage, type PathType } from "@shared/liberationPath";
import { InlineTextField, InlineSelectField, InlineBooleanField } from "@/components/InlineEdit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

interface OverviewTabProps {
  alumnus: Alumni;
  expandedSections: {
    contact: boolean;
    social: boolean;
    personal: boolean;
    activity: boolean;
  };
  onToggleSection: (section: 'contact' | 'social' | 'personal' | 'activity') => void;
}

// Phone formatting utility
const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return phoneNumber;
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a US domestic number (10 digits)
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]} - ${match[3]}`;
    }
  }
  
  // Check if it's a US number with country code (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]} - ${match[3]}`;
    }
  }
  
  // Return original if not a standard US format
  return phoneNumber;
};

export function OverviewTab({ 
  alumnus, 
  expandedSections, 
  onToggleSection
}: OverviewTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for updating alumni
  const updateAlumniMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      // Type conversion based on database schema
      const textFields = ['highSchoolGpa', 'householdIncome', 'phone', 'collegeGpa', 'latestAnnualIncome'];
      const booleanFields = ['militaryService', 'pathTypeModified', 'currentStageModified', 'currentlyEnrolled', 'receivedScholarships', 'enrolledInOpportunityProgram', 'onCourseEconomicLiberation', 'employed'];
      const dateFields = ['dateOfBirth', 'dropoutDate', 'expectedGraduationDate', 'lastContactDate'];
      
      let processedValue = value;
      
      // Handle different field types
      if (textFields.includes(field) && typeof value === 'number') {
        processedValue = value.toString();
      } else if (dateFields.includes(field) && value) {
        // Ensure dates are in ISO format
        processedValue = value instanceof Date ? value.toISOString().split('T')[0] : value;
      } else if (booleanFields.includes(field)) {
        processedValue = Boolean(value);
      }
      
      const response = await fetch(`/api/alumni/${alumnus.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: processedValue }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to update alumni data: ${response.status} ${text}`);
      }
      return response.json();
    },
    onMutate: async ({ field, value }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: qk.alumniById(alumnus.id) });
      
      // Snapshot the previous value
      const previousAlumni = queryClient.getQueryData<Alumni>(qk.alumniById(alumnus.id));
      
      // Optimistically update the cache
      queryClient.setQueryData(qk.alumniById(alumnus.id), (old: Alumni | undefined) =>
        old ? { ...old, [field]: value } : old
      );
      
      return { previousAlumni };
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousAlumni) {
        queryClient.setQueryData(qk.alumniById(alumnus.id), context.previousAlumni);
      }
      
      console.error('Update failed:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    },
    onSuccess: (updatedAlumni: Alumni) => {
      // Ensure the cache has the latest data
      queryClient.setQueryData(qk.alumniById(alumnus.id), updatedAlumni);
      // Keep list in sync
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
      
      toast({
        title: "Saved",
        description: "Changes saved successfully",
      });
    },
  });

  // Helper function to create save handlers with proper value extraction
  const createSaveHandler = (field: string) => async (val: any) => {
    // Guard against DOM events being passed as values
    const value = val && typeof val === 'object' && 'target' in val 
      ? (val.target as HTMLInputElement).value 
      : val;
    
    await updateAlumniMutation.mutateAsync({ field, value });
  };
  return (
    <div className="space-y-4">
      {/* Contact Information */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => onToggleSection('contact')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        >
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Contact</span>
          </div>
          {expandedSections.contact ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {expandedSections.contact && (
          <div className="p-6 border-t border-gray-200 bg-white min-h-[200px]">
            <div className="space-y-6">
              <div>
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="space-y-4 flex-1">
                    <div className="text-sm">
                      <span className="text-gray-600">CompSci High:</span>
                      <InlineTextField
                        value={alumnus.compSciHighEmail}
                        onSave={createSaveHandler('compSciHighEmail')}
                        fieldLabel="CompSci High Email"
                        fieldType="email"
                        placeholder="Add CompSci High email"
                        className="ml-1"
                      />
                      {alumnus.preferredEmail === alumnus.compSciHighEmail && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="ml-1 text-green-600 text-xs">(Preferred)</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This is the preferred email</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Personal:</span>
                      <InlineTextField
                        value={alumnus.personalEmail}
                        onSave={createSaveHandler('personalEmail')}
                        fieldLabel="Personal Email"
                        fieldType="email"
                        placeholder="Add personal email"
                        className="ml-1"
                      />
                      {alumnus.preferredEmail === alumnus.personalEmail && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="ml-1 text-green-600 text-xs">(Preferred)</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This is the preferred email</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Preferred:</span>
                      <InlineSelectField
                        value={alumnus.preferredEmail}
                        options={[
                          ...(alumnus.compSciHighEmail ? [{ value: alumnus.compSciHighEmail, label: `CompSci High: ${alumnus.compSciHighEmail}` }] : []),
                          ...(alumnus.personalEmail ? [{ value: alumnus.personalEmail, label: `Personal: ${alumnus.personalEmail}` }] : [])
                        ]}
                        onSave={createSaveHandler('preferredEmail')}
                        fieldLabel="Preferred Email"
                        placeholder="Select preferred email"
                        className="ml-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="space-y-4 flex-1">
                  <div className="text-sm">
                    <span className="text-gray-600">Phone:</span>
                    <InlineTextField
                      value={alumnus.phone}
                      onSave={async (value) => {
                        const formattedPhone = formatPhoneNumber(value);
                        await updateAlumniMutation.mutateAsync({ 
                          field: 'phone', 
                          value: formattedPhone 
                        });
                      }}
                      fieldLabel="Phone"
                      fieldType="tel"
                      placeholder="Add phone number"
                      className="ml-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Social Media */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => onToggleSection('social')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        >
          <div className="flex items-center space-x-3">
            <Hash className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Social Media</span>
          </div>
          {expandedSections.social ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {expandedSections.social && (
          <div className="p-6 border-t border-gray-200 bg-white min-h-[200px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Instagram className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Instagram:</span>
                  <InlineTextField
                    value={alumnus.instagramHandle}
                    onSave={createSaveHandler('instagramHandle')}
                    fieldLabel="Instagram Handle"
                    placeholder="Add Instagram"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <Twitter className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Twitter:</span>
                  <InlineTextField
                    value={alumnus.twitterHandle}
                    onSave={createSaveHandler('twitterHandle')}
                    fieldLabel="Twitter Handle"
                    placeholder="Add Twitter"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <Linkedin className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">LinkedIn:</span>
                  <InlineTextField
                    value={alumnus.linkedinHandle}
                    onSave={createSaveHandler('linkedinHandle')}
                    fieldLabel="LinkedIn Handle"
                    placeholder="Add LinkedIn"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">TikTok:</span>
                  <InlineTextField
                    value={alumnus.tiktokHandle}
                    onSave={createSaveHandler('tiktokHandle')}
                    fieldLabel="TikTok Handle"
                    placeholder="Add TikTok"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => onToggleSection('personal')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        >
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Personal</span>
          </div>
          {expandedSections.personal ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {expandedSections.personal && (
          <div className="p-6 border-t border-gray-200 bg-white min-h-[200px]">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Hash className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Contact ID:</span>
                <InlineTextField
                  value={alumnus.contactId || `A-${alumnus.id.toString().padStart(4, '0')}`}
                  onSave={createSaveHandler('contactId')}
                  fieldLabel="Contact ID"
                  placeholder="Add contact ID"
                />
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Date of Birth:</span>
                <InlineTextField
                  value={alumnus.dateOfBirth}
                  onSave={createSaveHandler('dateOfBirth')}
                  fieldLabel="Date of Birth"
                  fieldType="date"
                  placeholder="Add date of birth"
                />
              </div>
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">High School GPA:</span>
                <InlineTextField
                  value={alumnus.highSchoolGpa}
                  onSave={createSaveHandler('highSchoolGpa')}
                  fieldLabel="High School GPA"
                  fieldType="number"
                  placeholder="Add high school GPA"
                />
              </div>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Support Category:</span>
                <InlineSelectField
                  value={alumnus.supportCategory || alumnus.grouping}
                  options={[
                    { value: "Low Needs", label: "Low Needs" },
                    { value: "Medium Needs", label: "Medium Needs" },
                    { value: "High Needs", label: "High Needs" }
                  ]}
                  onSave={createSaveHandler('supportCategory')}
                  fieldLabel="Support Category"
                  placeholder="Select support category"
                />
              </div>
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Liberation Path:</span>
                <InlineSelectField
                  value={alumnus.pathType || 'undefined'}
                  options={[
                    { value: "undefined", label: "Path Undefined" },
                    { value: "college", label: "College" },
                    { value: "work", label: "Employment" },
                    { value: "training", label: "Vocational Training" },
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
                {alumnus.pathTypeModified && (
                  <span className="text-xs text-blue-600">(manually set)</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Current Stage:</span>
                <InlineSelectField
                  value={alumnus.currentStage || calculateCurrentStage(alumnus)}
                  options={alumnus.pathType ? (STAGE_OPTIONS[alumnus.pathType as PathType]?.map(stage => ({
                    value: stage.value,
                    label: stage.label
                  })) || []) : [
                    { value: '', label: 'No stages available (path not defined)' }
                  ]}
                  onSave={async (value) => {
                    await updateAlumniMutation.mutateAsync({ 
                      field: 'currentStage', 
                      value 
                    });
                    await updateAlumniMutation.mutateAsync({ 
                      field: 'currentStageModified', 
                      value: true 
                    });
                  }}
                  fieldLabel="Current Stage"
                  placeholder="Select current stage"
                />
                {alumnus.currentStageModified ? (
                  <span className="text-xs text-blue-600">(manually set)</span>
                ) : (
                  <span className="text-xs text-gray-500">(auto-calculated)</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Home className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Household Income:</span>
                <InlineTextField
                  value={alumnus.householdIncome}
                  onSave={createSaveHandler('householdIncome')}
                  fieldLabel="Household Income"
                  placeholder="Click to add household income"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => onToggleSection('activity')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        >
          <div className="flex items-center space-x-3">
            <History className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Recent Activity</span>
          </div>
          {expandedSections.activity ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {expandedSections.activity && (
          <div className="p-6 border-t border-gray-200 bg-white min-h-[200px]">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Last Contact:</span>
                <InlineTextField
                  value={alumnus.lastContactDate ?? ''}
                  placeholder={
                    alumnus.lastContactDate 
                      ? '' 
                      : (() => {
                          const computedDate = calculateLastContactDate(alumnus, []);
                          return computedDate ? `Computed: ${computedDate.toISOString().split('T')[0]}` : 'Click to add date';
                        })()
                  }
                  onSave={createSaveHandler('lastContactDate')}
                  fieldLabel="Last Contact Date"
                  fieldType="date"
                />
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Follow-up Required:</span>
                <InlineBooleanField
                  value={alumnus.needsFollowUp}
                  onSave={createSaveHandler('needsFollowUp')}
                  fieldLabel="Follow-up Required"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}