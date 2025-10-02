import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  GraduationCap, 
  Award, 
  Target, 
  Briefcase, 
  FileText, 
  Calendar, 
  DollarSign, 
  Clock, 
  Users, 
  ArrowLeft
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Alumni } from "@shared/schema";
import { InlineTextField, InlineSelectField, InlineBooleanField } from "@/components/InlineEdit";
import { InlineScholarshipManager } from "@/components/InlineScholarshipManager";
import { CollegePicker } from "@/components/CollegePicker";
import { useUpdateAlumniField } from "@/hooks/useUpdateAlumniField";

interface EducationTabProps {
  alumnus: Alumni;
}

export function EducationTab({ alumnus }: EducationTabProps) {
  const updateAlumniField = useUpdateAlumniField(alumnus.id.toString());
  
  const handleFieldUpdate = async (field: string, value: any) => {
    // Special handling for enrollment status - mark as manually modified
    if (field === 'enrollmentStatus') {
      updateAlumniField.mutate({ 
        field: field, 
        value: value,
        additionalUpdates: { enrollmentStatusModified: true }
      });
    } else {
      updateAlumniField.mutate({ field, value });
    }
  };

  // Calculate the display value for enrollment status
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

  const degreeTrackOptions = [
    { value: 'associate', label: 'Associate Degree' },
    { value: 'bachelor', label: 'Bachelor Degree' },
    { value: 'master', label: 'Master Degree' },
    { value: 'doctorate', label: 'Doctorate' },
    { value: 'certificate', label: 'Certificate Program' },
    { value: 'trade', label: 'Trade School' }
  ];

  const enrollmentStatusOptions = [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'graduated', label: 'Graduated' },
    { value: 'dropped-out', label: 'Dropped Out' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'gap-year', label: 'Gap Year' },
    { value: 'deferred', label: 'Deferred' }
  ];

  const scholarshipRenewalOptions = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
    { value: 'N/A', label: 'N/A' }
  ];

  const transferStatusOptions = [
    { value: 'not-transfer', label: 'Not a Transfer' },
    { value: 'community-to-4year', label: 'Community to 4-year' },
    { value: '4year-to-4year', label: '4-year to 4-year' },
    { value: 'internal-transfer', label: 'Internal Transfer' },
    { value: 'reverse-transfer', label: 'Reverse Transfer' },
    { value: 'considering', label: 'Considering Transfer' }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Academics */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-4">
            Academics
          </h4>
          <div className="space-y-3">
            {/* College Minor */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Minor:</span>
              <InlineTextField
                value={alumnus.collegeMinor}
                onSave={(value) => handleFieldUpdate('collegeMinor', value)}
                placeholder="Add"
                fieldLabel="College Minor"
              />
            </div>

            {/* Degree Track */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Degree:</span>
              <InlineSelectField
                value={alumnus.degreeTrack}
                options={degreeTrackOptions}
                onSave={(value) => handleFieldUpdate('degreeTrack', value)}
                placeholder="Add"
                fieldLabel="Degree Track"
              />
            </div>

            {/* Intended Career Path */}
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-600 cursor-help">Career:</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>What job or industry they want to work in after graduation<br/>
                  (e.g., Software Engineer, Teacher, Healthcare, Finance)</p>
                </TooltipContent>
              </Tooltip>
              <InlineTextField
                value={alumnus.intendedCareerPath}
                onSave={(value) => handleFieldUpdate('intendedCareerPath', value)}
                placeholder="Add"
                fieldLabel="Intended Career Path"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-4">
            Status
          </h4>
          <div className="space-y-3">
            {/* Enrollment Status */}
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-600 cursor-help">Enrollment:</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current enrollment status - enrolled, graduated, dropped out, or deferred</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <InlineSelectField
                      value={getEnrollmentStatusValue()}
                      options={enrollmentStatusOptions}
                      onSave={(value) => handleFieldUpdate('enrollmentStatus', value)}
                      placeholder="Add"
                      fieldLabel="Enrollment Status"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current enrollment status - enrolled, graduated, dropped out, or deferred</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Expected Graduation Date */}
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-600 cursor-help">Graduation:</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expected graduation date from college</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <InlineTextField
                      value={alumnus.expectedGraduationDate}
                      onSave={(value) => handleFieldUpdate('expectedGraduationDate', value)}
                      placeholder="Add"
                      fieldLabel="Expected Graduation Date"
                      fieldType="date"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expected graduation date from college</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Transfer Status */}
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-600 cursor-help">Transfer:</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Whether student transferred from another college or started at current college</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <InlineSelectField
                      value={alumnus.transferStudentStatus}
                      options={transferStatusOptions}
                      onSave={(value) => handleFieldUpdate('transferStudentStatus', value)}
                      placeholder="Add"
                      fieldLabel="Transfer Status"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Whether student transferred from another college or started at current college</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-4">
            Support
          </h4>
          <div className="space-y-3">
            {/* Scholarships - Inline Management */}
            <div className="space-y-2">
              <InlineScholarshipManager
                scholarships={alumnus.scholarships || []}
                onUpdate={(scholarships) => handleFieldUpdate('scholarships', scholarships)}
              />
            </div>



            {/* Opportunity Program */}
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-600 cursor-help">Opportunity:</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Whether student is enrolled in college opportunity programs (EOP, SEEK, HEOP, etc.)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <InlineBooleanField
                      value={alumnus.enrolledInOpportunityProgram}
                      onSave={(value) => handleFieldUpdate('enrolledInOpportunityProgram', value)}
                      fieldLabel="Enrolled in Opportunity Program"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Whether student is enrolled in college opportunity programs (EOP, SEEK, HEOP, etc.)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}