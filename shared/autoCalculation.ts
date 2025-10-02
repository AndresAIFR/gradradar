// Auto-calculation utilities for liberation path tracking

import { calculateExpectedStage, calculateCurrentStage, shouldAutoAdvanceStage, type PathType, type CurrentStage } from "./liberationPath";
import type { Alumni } from "./schema";

export interface AutoCalculationResult {
  suggestedPathType: PathType | null;
  suggestedCurrentStage: CurrentStage | null;
  suggestedTrackingStatus: "on-track" | "near-track" | "off-track" | "unknown";
  shouldUpdate: boolean;
  reasoning: string;
}

/**
 * Auto-calculate path type based on alumni current status
 */
export function calculateSuggestedPathType(alumni: Alumni): PathType | null {
  const name = `${alumni.firstName} ${alumni.lastName}`;
  
  console.log(`🎯 [PATH-CALC] Starting pathType calculation for ${name}:`, {
    currentlyEnrolled: alumni.currentlyEnrolled,
    trainingProgramName: alumni.trainingProgramName,
    trainingStartDate: alumni.trainingStartDate,
    employed: alumni.employed,
    collegeAttending: alumni.collegeAttending,
    employerName: alumni.employerName,
    cohortYear: alumni.cohortYear
  });
  
  // Priority 1: Currently enrolled in college
  if (alumni.currentlyEnrolled) {
    console.log(`✅ [PATH-CALC] ${name} → "college" (currently enrolled)`);
    return "college";
  }
  
  // Priority 2: In training program (vocation path)
  if (alumni.trainingProgramName || alumni.trainingStartDate) {
    console.log(`✅ [PATH-CALC] ${name} → "vocation" (training program: ${alumni.trainingProgramName})`);
    return "vocation";
  }
  
  // Priority 3: Employed and not in college
  if (alumni.employed && !alumni.currentlyEnrolled) {
    console.log(`✅ [PATH-CALC] ${name} → "employment" (employed: ${alumni.employed})`);
    return "employment";
  }
  
  // No clear path indicators - return null instead of assuming
  console.log(`❌ [PATH-CALC] ${name} → null (no clear indicators)`);
  return null;
}

/**
 * Auto-calculate current stage based on path type and alumni data
 * Now uses the unified stage calculation system
 */
export function calculateSuggestedCurrentStage(alumni: Alumni, pathType: PathType | null): CurrentStage | null {
  // Use the unified system to calculate current stage
  return calculateCurrentStage(alumni);
}

/**
 * Calculate suggested tracking status based on expected vs actual progress
 */
export function calculateSuggestedTrackingStatus(
  alumni: Alumni, 
  suggestedStage: CurrentStage | null, 
  pathType: PathType | null
): "on-track" | "near-track" | "off-track" | "unknown" {
  // If no path type or stage, status is unknown
  if (!pathType || !suggestedStage) {
    return "unknown";
  }
  
  const expectedStage = calculateExpectedStage(alumni.cohortYear, pathType);
  
  // If no expected stage can be calculated, status is unknown
  if (!expectedStage) {
    return "unknown";
  }
  
  // Define stage progression order for each path
  const stageOrder = {
    college: ["yr1-enrolled", "yr2", "yr3", "yr4", "yr5-plus", "graduated"],
    vocation: ["in-program", "credentialed", "employed", "above-median"],
    employment: ["employed", "above-median"]
  };
  
  const expectedIndex = stageOrder[pathType].indexOf(expectedStage);
  const actualIndex = stageOrder[pathType].indexOf(suggestedStage);
  
  if (actualIndex === -1 || expectedIndex === -1) {
    return "off-track"; // Unknown stage
  }
  
  // Check if they're ahead, on time, or behind
  if (actualIndex >= expectedIndex) {
    return "on-track"; // At or ahead of expected stage
  } else if (actualIndex === expectedIndex - 1) {
    return "near-track"; // One stage behind
  } else {
    return "off-track"; // More than one stage behind
  }
}

/**
 * Check if auto-update should occur
 * Now uses the unified system's shouldAutoAdvanceStage function
 */
export function shouldAutoUpdate(alumni: Alumni): boolean {
  // Don't auto-update if path was manually modified
  if (alumni.pathTypeModified) {
    return false;
  }
  
  // Use the unified system's stage advancement logic
  return shouldAutoAdvanceStage(alumni);
}

/**
 * Main auto-calculation function
 */
export function calculateAutoUpdate(alumni: Alumni): AutoCalculationResult {
  const suggestedPathType = calculateSuggestedPathType(alumni);
  const suggestedCurrentStage = calculateSuggestedCurrentStage(alumni, suggestedPathType);
  const suggestedTrackingStatus = calculateSuggestedTrackingStatus(alumni, suggestedCurrentStage, suggestedPathType);
  const shouldUpdate = shouldAutoUpdate(alumni);
  
  // Generate reasoning
  let reasoning = "";
  if (alumni.currentlyEnrolled) {
    reasoning = "Currently enrolled in college";
  } else if (alumni.employed && !alumni.currentlyEnrolled) {
    reasoning = "Employed and not enrolled";
  } else if (alumni.trainingProgramName) {
    reasoning = "In training program";
  } else {
    reasoning = "Based on graduation timeline";
  }
  
  return {
    suggestedPathType,
    suggestedCurrentStage,
    suggestedTrackingStatus,
    shouldUpdate,
    reasoning
  };
}