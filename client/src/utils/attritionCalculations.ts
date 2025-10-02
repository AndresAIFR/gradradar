import { Alumni } from '@/../../shared/schema';

// Attrition type definitions
export const ATTRITION_TYPES = {
  "all": "All Alumni",
  "never-enrolled": "Never Enrolled",
  "year1-dropouts": "Year 1 Dropouts", 
  "year2-dropouts": "Year 2 Dropouts",
  "year3-dropouts": "Year 3 Dropouts",
  "year4-dropouts": "Year 4 Dropouts",
  "grad-dropouts": "Grad Dropouts",
  "below-median-salary": "Below Median Salary"
} as const;

export type AttritionType = keyof typeof ATTRITION_TYPES;

export const getAttritionTypeLabel = (type: string): string => {
  return ATTRITION_TYPES[type as AttritionType] || type;
};

// Import shared CurrentStage type for proper typing
type CurrentStage = "yr1-enrolled" | "yr2" | "yr3" | "yr4" | "yr5-plus" | "graduated" | "employed" | "above-median";

// Exact copy of getPathStatus function from Analytics.tsx to ensure identical logic
function getPathStatus(alumni: Alumni, milestone: string): "on-track" | "near-track" | "off-track" | "not-reached" {
  // NEW ➜ if the import / admin UI has already stored a stage, trust it
  const storedStage = alumni.currentStage as CurrentStage | undefined;

  // Fallback to calculation only when the record is blank
  let effectiveCurrentStage = storedStage;
  
  if (!effectiveCurrentStage) {
    // Check if they have college data - if so, they've reached at least Year 1
    if (alumni.collegeAttending && alumni.collegeAttending.trim() !== '' && alumni.collegeAttending !== 'NA') {
      // If they have college data, calculate their expected stage based on graduation year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const yearsPostGraduation = currentMonth >= 5 ? 
        currentYear - alumni.cohortYear : 
        currentYear - alumni.cohortYear - 1;
      
      // Handle future cohorts (negative years)
      if (yearsPostGraduation < 0) {
        return "not-reached"; // Still in high school
      } else if (yearsPostGraduation === 0) {
        effectiveCurrentStage = "yr1-enrolled";
      } else if (yearsPostGraduation === 1) {
        effectiveCurrentStage = "yr2";
      } else if (yearsPostGraduation === 2) {
        effectiveCurrentStage = "yr3";
      } else if (yearsPostGraduation === 3) {
        effectiveCurrentStage = "yr4";
      } else if (yearsPostGraduation >= 4) {
        // For 4+ years, check actual status before assuming graduation/employment
        if (alumni.enrollmentStatus === "graduated" || (alumni.employed && !alumni.currentlyEnrolled)) {
          if (alumni.employed) {
            effectiveCurrentStage = "employed";
          } else {
            effectiveCurrentStage = "graduated";
          }
        } else {
          // Still in college after 4+ years (extended program, taking longer)
          effectiveCurrentStage = "yr5-plus";
        }
      }
    } else if (alumni.employed) {
      effectiveCurrentStage = "employed";
    } else {
      // No college data and not employed - they haven't reached college milestones
      return "not-reached";
    }
  }
  
  // Define stage progression order for college path
  const stageOrder = ["yr1-enrolled", "yr2", "yr3", "yr4", "yr5-plus", "graduated", "employed", "above-median"];
  
  // Map milestones to minimum required stage - FIXED to use only correct field names
  const milestoneToStage: Record<string, string> = {
    // Heat map milestone names
    "enrollment": "yr1-enrolled",
    "retainedYr1": "yr2",
    "persistYr2": "yr3", 
    "credential": "graduated",
    "employment": "employed",
    "salary": "above-median",
    
    // Funnel milestone aliases - so both heat map and funnels can use same helper
    "year1": "yr1-enrolled",
    "year2": "yr2",
    "year3": "yr3",
    "year4": "yr4",
    "graduation": "graduated"
  };
  
  const requiredStage = milestoneToStage[milestone];
  if (!requiredStage) return "not-reached";
  
  // Check if alumni has reached at least the required stage
  const currentIndex = stageOrder.indexOf(effectiveCurrentStage || "");
  const requiredIndex = stageOrder.indexOf(requiredStage);
  
  if (currentIndex === -1) return "not-reached"; // Invalid current stage
  if (currentIndex < requiredIndex) return "not-reached"; // Haven't reached this milestone yet
  
  // For employment and salary, check additional data
  if (milestone === "employment") {
    return alumni.employed ? "on-track" : "off-track";
  }
  
  if (milestone === "salary") {
    if (alumni.onCourseEconomicLiberation) return "on-track";
    if (alumni.employed) return "near-track";
    return "off-track";
  }
  
  // For academic milestones, use tracking status
  return alumni.trackingStatus === "on-track" ? "on-track" : 
         alumni.trackingStatus === "near-track" ? "near-track" : "off-track";
}

// Main attrition calculation function
export const calculateAttritionFilter = (alumni: Alumni[], attritionType: string): Alumni[] => {
  if (attritionType === "all") return alumni;
  
  const currentYear = new Date().getFullYear();
  
  switch (attritionType) {
    case "never-enrolled": {
      // All alumni who never enrolled in college/training (never reached Year 1)
      // This matches the Analytics funnel logic: totalGraduates - year1
      // Based on Analytics getPathStatus logic:
      // Someone reaches Year 1 if they have collegeAttending data (not empty/NA) OR are employed
      // So "Never Enrolled" = those without college data AND not employed
      return alumni.filter(a => {
        const hasCollegeData = a.collegeAttending && a.collegeAttending.trim() !== '' && a.collegeAttending !== 'NA';
        return !hasCollegeData && !a.employed;
      });
    }
    
    case "year1-dropouts": {
      // Only cohorts that have had time to reach Year 2 (all except current year)
      const eligible = alumni.filter(a => a.cohortYear < currentYear);
      return eligible.filter(a => {
        const enrollmentStatus = getPathStatus(a, "enrollment");
        const retainedYr1Status = getPathStatus(a, "retainedYr1");
        const reachedEnrollment = enrollmentStatus !== "not-reached";
        const reachedRetainedYr1 = retainedYr1Status !== "not-reached";
        return reachedEnrollment && !reachedRetainedYr1;
      });
    }
    
    case "year2-dropouts": {
      // Only cohorts that have had time to reach Year 3 (2023 and earlier)
      const eligible = alumni.filter(a => a.cohortYear <= currentYear - 2);
      return eligible.filter(a => {
        const retainedYr1Status = getPathStatus(a, "retainedYr1");
        const persistYr2Status = getPathStatus(a, "persistYr2");
        const reachedRetainedYr1 = retainedYr1Status !== "not-reached";
        const reachedPersistYr2 = persistYr2Status !== "not-reached";
        return reachedRetainedYr1 && !reachedPersistYr2;
      });
    }
    
    case "year3-dropouts": {
      // Only cohorts that have had time to reach Year 4 (2022 and earlier)
      const eligible = alumni.filter(a => a.cohortYear <= currentYear - 3);
      return eligible.filter(a => {
        const persistYr2Status = getPathStatus(a, "persistYr2");
        const credentialStatus = getPathStatus(a, "credential");
        const reachedPersistYr2 = persistYr2Status !== "not-reached";
        const reachedCredential = credentialStatus !== "not-reached";
        return reachedPersistYr2 && !reachedCredential;
      });
    }
    
    case "year4-dropouts": {
      // Only cohorts that have had time to graduate (2021 and earlier)
      const eligible = alumni.filter(a => a.cohortYear <= currentYear - 4);
      return eligible.filter(a => {
        const credentialStatus = getPathStatus(a, "credential");
        const employmentStatus = getPathStatus(a, "employment");
        const reachedCredential = credentialStatus !== "not-reached";
        const employed = employmentStatus !== "not-reached";
        return reachedCredential && !employed;
      });
    }
    
    case "grad-dropouts": {
      // Only cohorts that have had time to find employment (2020 and earlier)
      const eligible = alumni.filter(a => a.cohortYear <= currentYear - 5);
      return eligible.filter(a => {
        const credentialStatus = getPathStatus(a, "credential");
        const empStatus = getPathStatus(a, "employment");
        const graduated = credentialStatus !== "not-reached";
        const employed = empStatus !== "not-reached";
        return graduated && !employed;
      });
    }
    
    case "below-median-salary": {
      // Only cohorts that have had time to establish salary (2020 and earlier)
      const eligible = alumni.filter(a => a.cohortYear <= currentYear - 5);
      return eligible.filter(a => {
        const empStatus = getPathStatus(a, "employment");
        const salaryStatus = getPathStatus(a, "salary");
        const employed = empStatus !== "not-reached";
        const aboveMedian = salaryStatus !== "not-reached";
        return employed && !aboveMedian;
      });
    }
    
    default:
      return alumni;
  }
};