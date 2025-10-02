// Liberation Path utility functions for alumni tracking
// UNIFIED STAGE CALCULATION SYSTEM - Single source of truth

// Database path types (from schema)
export type DbPathType = "college" | "work" | "training" | "military" | "other";

// Liberation logic path types
export type PathType = "college" | "vocation" | "employment";

export type CollegeStage = "yr1-enrolled" | "yr2" | "yr3" | "yr4" | "yr5-plus" | "graduated" | "employed" | "above-median";
export type VocationStage = "in-program" | "credentialed" | "employed" | "above-median";
export type EmploymentStage = "25-percent" | "50-percent" | "75-percent" | "above-median";

export type CurrentStage = CollegeStage | VocationStage | EmploymentStage;

// Stage options for each path type
export const STAGE_OPTIONS = {
  college: [
    { value: "yr1-enrolled", label: "Year 1" },
    { value: "yr2", label: "Year 2" },
    { value: "yr3", label: "Year 3" },
    { value: "yr4", label: "Year 4" },
    { value: "yr5-plus", label: "Year 5+" },
    { value: "graduated", label: "Graduated" },
    { value: "employed", label: "Employed" },
    { value: "above-median", label: "> Median" }
  ],
  vocation: [
    { value: "in-program", label: "In Program" },
    { value: "credentialed", label: "Credentialed" },
    { value: "employed", label: "Employed" },
    { value: "above-median", label: "> Median" }
  ],
  employment: [
    { value: "25-percent", label: "25% Median" },
    { value: "50-percent", label: "50% Median" },
    { value: "75-percent", label: "75% Median" },
    { value: "above-median", label: "> Median" }
  ]
} as const;

/**
 * UNIFIED STAGE CALCULATION - Single source of truth
 * Priority: Manual override → Auto-calculation with June 1st cutoff
 */
// Map database pathType to liberation logic pathType
function mapDbPathToLogicPath(dbPathType: DbPathType | string | null): PathType | null {
  switch (dbPathType) {
    case 'college': return 'college';
    case 'work': return 'employment';
    case 'training': return 'vocation';
    case 'military': return 'vocation';
    case 'other': return 'employment';
    default: return null; // No fallback - preserve unclear status
  }
}

export function calculateCurrentStage(alumni: any): CurrentStage | null {
  // Priority 1: Manual override takes precedence
  if (alumni.currentStageModified && alumni.currentStage) {
    return alumni.currentStage as CurrentStage;
  }
  
  // Priority 2: Auto-calculation with June 1st cutoff
  let logicPathType = mapDbPathToLogicPath(alumni.pathType);
  
  // Priority 3: If pathType is null, infer from available data
  if (!logicPathType) {
    // Check for college enrollment/graduation indicators
    if (alumni.enrollmentStatus || alumni.collegeAttending || alumni.collegeAttended) {
      logicPathType = 'college';
    }
    // Check for training/vocation indicators
    else if (alumni.trainingProgramName || alumni.trainingDegreeCertification || alumni.trainingStartDate) {
      logicPathType = 'vocation';
    }
    // Check for employment indicators
    else if (alumni.employed || alumni.currentSalary || alumni.latestAnnualIncome || alumni.employmentHistory?.length > 0) {
      logicPathType = 'employment';
    }
    // If still no clear path, return null
    else {
      return null;
    }
  }
  
  const autoStage = calculateAutoStage(alumni.cohortYear, logicPathType, alumni);
  return autoStage;
}

/**
 * Auto-calculation with June 1st cutoff logic
 * Used for both expected and actual stage calculations
 */
function calculateAutoStage(cohortYear: number, pathType: PathType, alumni?: any): CurrentStage | null {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January)
  
  // Calculate current academic year (June cutoff)
  const currentAcademicYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  
  // Calculate college year (forward counting from cohort year)
  const collegeYear = currentAcademicYear - cohortYear + 1;



  switch (pathType) {
    case "college":
      return calculateCollegeStage(collegeYear, alumni);
    
    case "vocation":
      return calculateVocationStage(collegeYear, alumni);
    
    case "employment":
      // Employment stage can be null for unemployed alumni
      return calculateEmploymentStage(collegeYear, alumni);
    
    default:
      return "yr1-enrolled";
  }
}

function calculateCollegeStage(collegeYear: number, alumni?: any): CurrentStage {
  // FIXED: If enrolled (prioritize enrollmentStatus over currentlyEnrolled flag)
  if (alumni?.enrollmentStatus === 'enrolled') {
    if (collegeYear <= 1) return "yr1-enrolled";
    else if (collegeYear === 2) return "yr2";
    else if (collegeYear === 3) return "yr3";
    else if (collegeYear === 4) return "yr4";
    else return "yr5-plus";
  }
  
  // If graduated from college
  if (alumni?.enrollmentStatus === 'graduated') {
    if (alumni.employed) {
      // Check if earning above median salary
      if (alumni.onCourseEconomicLiberation || (alumni.latestAnnualIncome && parseInt(alumni.latestAnnualIncome) > 74580)) {
        return "above-median";
      }
      return "employed";
    }
    return "graduated";
  }
  
  // If dropped out, check alternative paths
  if (alumni?.enrollmentStatus === 'dropped-out') {
    // Check if they're in a training program
    if (alumni.trainingProgramName) {
      return 'in-program';
    }
    // Check if they're employed
    if (alumni.employed) {
      return 'employed';
    }
  }
  
  // Standard timeline progression (based on college year)
  if (collegeYear < 1) return "yr1-enrolled"; // Future graduation year
  if (collegeYear === 1) return "yr1-enrolled"; // First year
  if (collegeYear === 2) return "yr2";
  if (collegeYear === 3) return "yr3";
  if (collegeYear === 4) return "yr4";
  if (collegeYear >= 5 && collegeYear <= 7) return "yr5-plus";
  if (collegeYear === 8) return "graduated"; // Should have graduated
  if (collegeYear === 9) return "employed"; // First year post-graduation employment
  return "above-median"; // 2+ years post-graduation
}

function calculateVocationStage(collegeYear: number, alumni?: any): CurrentStage {
  // Check current status first
  if (alumni?.trainingDegreeCertification) {
    if (alumni.employed) {
      return alumni.onCourseEconomicLiberation ? "above-median" : "employed";
    }
    return "credentialed";
  }
  
  if (alumni?.trainingProgramName || alumni?.trainingStartDate) {
    return "in-program";
  }
  
  // Standard vocation timeline (6 months to 2 years programs)
  if (collegeYear <= 1) return "in-program";
  if (collegeYear <= 2) return "credentialed";
  if (collegeYear <= 3) return "employed";
  return "above-median";
}

function calculateEmploymentStage(collegeYear: number, alumni?: any): CurrentStage | null {
  const NATIONAL_MEDIAN = 74580; // Current US median household income
  
  // Priority 1: Check employmentHistory for current job (single source of truth)
  let salary: number | null = null;
  if (alumni?.employmentHistory && Array.isArray(alumni.employmentHistory)) {
    // Find the current job (isCurrent = true)
    const currentJob = alumni.employmentHistory.find((job: any) => 
      job.type === 'job' && job.isCurrent
    );
    
    if (currentJob?.annualSalary) {
      // Handle both string and number formats
      salary = typeof currentJob.annualSalary === 'string' 
        ? parseInt(currentJob.annualSalary.replace(/[^0-9]/g, ''))
        : currentJob.annualSalary;
    }
  }
  
  // Priority 2: Fall back to legacy fields for backward compatibility
  if (salary === null && (alumni?.latestAnnualIncome || alumni?.currentSalary)) {
    salary = parseInt((alumni.latestAnnualIncome || alumni.currentSalary || '0').toString().replace(/[^0-9]/g, ''));
  }
  
  // Calculate stage from salary
  if (salary !== null && salary > 0) {
    if (salary >= NATIONAL_MEDIAN) {
      return "above-median";
    } else if (salary >= NATIONAL_MEDIAN * 0.75) {
      return "75-percent";
    } else if (salary >= NATIONAL_MEDIAN * 0.50) {
      return "50-percent";
    } else if (salary >= NATIONAL_MEDIAN * 0.25) {
      return "25-percent";
    }
  }
  
  // If employed but no salary data, assume entry level
  if (alumni?.employed) {
    return "25-percent";
  }
  
  // If not employed and no salary data, return null to indicate they haven't started employment path
  // This ensures unemployed alumni aren't counted in employment milestones
  return null;
}

/**
 * Calculate expected stage (what stage they should be at)
 * Uses the same June 1st cutoff logic as calculateCurrentStage
 */
export function calculateExpectedStage(cohortYear: number, pathType: PathType): CurrentStage | null {
  return calculateAutoStage(cohortYear, pathType);
}

/**
 * Check if auto-update should occur (June 1st advancement logic)
 */
export function shouldAutoAdvanceStage(alumni: any): boolean {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-based
  const lastUpdate = alumni.updatedAt ? new Date(alumni.updatedAt) : null;
  
  // Don't auto-advance if stage was manually modified
  if (alumni.currentStageModified) {
    return false;
  }
  
  // Auto-advance if this is first load (no updated date)
  if (!lastUpdate) {
    return true;
  }
  
  // Auto-advance if June 1st has passed since last update
  if (currentMonth >= 5) { // June or later
    const lastUpdateYear = lastUpdate.getFullYear();
    const currentYear = currentDate.getFullYear();
    
    if (currentYear > lastUpdateYear) {
      return true; // New academic year
    }
    
    if (currentYear === lastUpdateYear && lastUpdate.getMonth() < 5) {
      return true; // June 1st has passed this year
    }
  }
  
  return false;
}

// Get tracking status based on expected vs actual stage
export function getTrackingStatus(
  expectedStage: CurrentStage | null,
  actualStage: CurrentStage | null | undefined,
  pathType: PathType
): "on-track" | "near-track" | "off-track" {
  // If no expected stage can be determined, assume off-track
  if (!expectedStage || !actualStage) return "off-track";
  
  // Coerce paths to ensure stages are on paths that contain them
  const expectedPath = coercePathForStage(pathType, expectedStage);
  const actualPath = coercePathForStage(pathType, actualStage);
  
  // If stages are on different paths, they're off-track
  if (expectedPath !== actualPath) return "off-track";
  
  const stageOptions = STAGE_OPTIONS[expectedPath];
  const expectedIndex = stageOptions.findIndex(s => s.value === expectedStage);
  const actualIndex = stageOptions.findIndex(s => s.value === actualStage);
  
  if (expectedIndex === -1 || actualIndex === -1) return "off-track";
  
  // On track: at expected stage or ahead
  if (actualIndex >= expectedIndex) return "on-track";
  
  // Near track: 1 stage behind
  if (actualIndex === expectedIndex - 1) return "near-track";
  
  // Off track: 2+ stages behind
  return "off-track";
}

// Auto-calculate path type based on alumni data (can be overridden)
export function suggestPathType(alumni: {
  currentlyEnrolled?: boolean;
  employed?: boolean;
  trainingProgramName?: string;
}): PathType {
  if (alumni.currentlyEnrolled) return "college";
  if (alumni.trainingProgramName) return "vocation";
  if (alumni.employed) return "employment";
  return "college"; // Default assumption
}

/**
 * Coerce path to one that contains the given stage
 * Handles cross-path stages (e.g., "in-program" returned for college student who dropped out)
 * Prefers the fallback path if it contains the stage to avoid surprising path switches
 */
export function coercePathForStage(fallbackPath: PathType, stage: CurrentStage): PathType {
  // If fallback path contains the stage, use it (most common case)
  if (STAGE_OPTIONS[fallbackPath].some(s => s.value === stage)) {
    return fallbackPath;
  }
  
  // Otherwise, try to find a path that contains this stage
  const paths: PathType[] = ["college", "vocation", "employment"];
  
  for (const path of paths) {
    if (STAGE_OPTIONS[path].some(s => s.value === stage)) {
      return path;
    }
  }
  
  // If stage not found in any path, return fallback
  return fallbackPath;
}

/**
 * Calculate safe 0..1 percentage for stage position
 * Clamps invalid stages to 0 and handles edge cases
 */
export function stagePercent(path: PathType, stage: CurrentStage | null): number {
  if (!stage) return 0;
  
  const opts = STAGE_OPTIONS[path];
  let idx = opts.findIndex(o => o.value === stage);
  
  // Clamp unknown stages to start (prevents negative or >100% math)
  if (idx < 0) idx = 0;
  
  const denom = Math.max(1, opts.length - 1);
  return Math.min(1, Math.max(0, idx / denom));
}

/**
 * Resolve the correct path and stage for an alumni
 * Ensures the stage is always on a path that contains it
 */
export function resolveStageAndPath(alumni: any): { path: PathType; stage: CurrentStage | null; stageIndex: number } {
  // Get base path from database or suggestion
  const basePath = mapDbPathToLogicPath(alumni.pathType) ?? suggestPathType(alumni);
  
  // Calculate the stage
  const stage = calculateCurrentStage(alumni);
  
  // If no stage, return base path with null stage
  if (!stage) {
    return { path: basePath, stage: null, stageIndex: -1 };
  }
  
  // Coerce to a path that contains the stage
  const resolvedPath = coercePathForStage(basePath, stage);
  
  // Get the stage index on the resolved path
  const stageIndex = STAGE_OPTIONS[resolvedPath].findIndex(s => s.value === stage);
  
  return { 
    path: resolvedPath, 
    stage, 
    stageIndex: stageIndex >= 0 ? stageIndex : 0 
  };
}