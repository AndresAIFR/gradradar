// Field label dictionary for audit log display
export const fieldLabels: Record<string, string> = {
  // Basic Profile
  firstName: "First Name",
  lastName: "Last Name",
  cohortYear: "Cohort Year",
  dateOfBirth: "Date of Birth",
  highSchoolGpa: "High School GPA",
  householdSize: "Household Size",
  householdIncome: "Household Income",
  
  // Contact Information
  phone: "Phone Number",
  compSciHighEmail: "CompSci High Email",
  personalEmail: "Personal Email",
  collegeEmail: "College Email",
  preferredEmail: "Preferred Email",
  
  // Social Media
  instagramHandle: "Instagram Handle",
  twitterHandle: "Twitter Handle",
  tiktokHandle: "TikTok Handle",
  linkedinHandle: "LinkedIn Handle",
  
  // Current Status
  trackingStatus: "Tracking Status",
  supportCategory: "Support Category",
  lastContactDate: "Last Contact Date",
  needsFollowUp: "Needs Follow-up",
  
  // Education
  collegeAttending: "College/University",
  collegeMajor: "Major",
  collegeMinor: "Minor",
  degreeTrack: "Degree Track",
  intendedCareerPath: "Intended Career Path",
  currentlyEnrolled: "Currently Enrolled",
  enrollmentStatus: "Enrollment Status",
  expectedGraduationDate: "Expected Graduation",
  collegeGpa: "College GPA",
  receivedScholarships: "Received Scholarships",
  scholarshipsRequiringRenewal: "Scholarships Requiring Renewal",
  enrolledInOpportunityProgram: "Enrolled in Opportunity Program",
  transferStudentStatus: "Transfer Student Status",
  
  // Employment
  onCourseEconomicLiberation: "On-course for Economic Liberation",
  employed: "Employment Status",
  employmentType: "Employment Type",
  employerName: "Employer Name",
  latestAnnualIncome: "Latest Annual Income",
  latestIncomeDate: "Latest Income Date",
  
  // Training
  trainingProgramName: "Training Program Name",
  trainingProgramType: "Training Program Type",
  trainingProgramLocation: "Training Program Location",
  trainingProgramPay: "Training Program Pay",
  trainingStartDate: "Training Start Date",
  trainingEndDate: "Training End Date",
  trainingDegreeCertification: "Training Degree/Certification",
  
  // Contact Log
  contactLog: "Contact Log Entry",
};

// Helper function to get display label for a field
export function getFieldLabel(fieldName: string): string {
  // Handle contact log entries
  if (fieldName.startsWith("contact_log.")) {
    const id = fieldName.split(".")[1];
    return `Contact Log Entry #${id}`;
  }
  
  return fieldLabels[fieldName] || fieldName;
}

// Helper function to format values for display
export function formatFieldValue(value: string | null): string {
  if (value === null || value === undefined || value === "") {
    return "(blank)";
  }
  return value;
}