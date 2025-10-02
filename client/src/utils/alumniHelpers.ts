/**
 * Pure utility functions for alumni data processing
 * Extracted from Alumni.tsx for better code organization
 * These functions have no dependencies on React state or UI components
 */

import type { Alumni } from "@shared/schema";
import { calculateLastContactDate, getDaysSinceLastContact } from "@/utils/contactRecency";
import { getStateFromCoordinates, US_STATE_CENTROIDS } from "@/utils/geo";

// Types for filter state
export type SortField = 'lastName' | 'firstName' | 'cohortYear' | 'collegeAttending' | 'collegeMajor' | 'collegeGpa' | 'latestAnnualIncome' | 'trackingStatus' | 'lastContactDate' | 'contactId' | 'phone' | 'matriculation' | 'connected' | 'supportCategory' | 'currentlyEnrolled' | 'employed' | 'receivedScholarships' | 'needsFollowUp' | 'enrollmentStatus' | 'employmentType' | 'email' | 'personalEmail' | 'compSciHighEmail' | 'notes' | 'employerName' | 'expectedGraduationDate';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  sort: { field: SortField; direction: SortDirection };
  filters: {
    cohortYear: number[];
    trackingStatus: string[];
    contactRecency: string[];
    supportCategory: string[];
    collegeAttending: string[];
    employed: boolean | null;
    receivedScholarships: boolean | null;
    currentStage: string[];
    attritionType: string;
    // New filterable columns for sheets view
    connected: string[];
    matriculation: string[];
    currentlyEnrolled: string[];
    needsFollowUp: string[];
    enrollmentStatus: string[];
    employmentType: string[];
    employmentStatus: string[];
    scholarships: string[];
    // Geographic filters
    location: {
      latitude: number | null;
      longitude: number | null;
      radius: number; // in miles
    } | null;
    state: string[]; // State-level geographic filter
    // Alumni IDs filter (from map clusters)
    ids: number[] | null;
  };
}

// --- State Normalization ---
// Create name-to-code mapping for flexible state parsing
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_CENTROIDS).map(([code, v]) => [v.name.toLowerCase(), code])
);

/**
 * Normalizes state input to consistent uppercase state codes
 * Handles various formats: 'NY', 'ny', 'New York', ' NY ', etc.
 * @param raw - Raw state input (code or name)
 * @returns Normalized state code or null if invalid
 */
export const normalizeStateCode = (raw?: string | null): string | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  
  // Check if it's already a valid state code
  const maybeCode = s.toUpperCase();
  if (US_STATE_CENTROIDS[maybeCode as keyof typeof US_STATE_CENTROIDS]) return maybeCode;
  
  // Try to find by state name
  return NAME_TO_CODE[s.toLowerCase()] ?? null;
};

/**
 * Categorizes an alumnus based on their last contact date
 * @param alumnus - The alumni record
 * @returns Contact recency category string
 */
export const getContactRecencyCategory = (alumnus: Alumni): string => {
  const lastContactDate = calculateLastContactDate(alumnus, []);
  const daysSince = getDaysSinceLastContact(lastContactDate);
  
  if (daysSince === null) return 'none'; // No contact recorded
  if (daysSince <= 30) return 'recent'; // 0-30 days
  if (daysSince <= 90) return 'moderate'; // 31-90 days
  if (daysSince <= 180) return 'stale'; // 91-180 days
  return 'none'; // 180+ days
};

/**
 * Maps support categories to their corresponding CSS color classes
 * @param category - The support category string
 * @returns CSS class names for styling
 */
export const getSupportCategoryColor = (category: string): string => {
  switch (category) {
    case "Persistence": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Success-Employed": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Job Training": return "bg-purple-50 text-purple-700 border border-purple-200";
    default: return "bg-gray-50 text-gray-700 border border-gray-200";
  }
};

/**
 * Filters alumni by state using fallback logic
 * @param alumni - Array of alumni to filter
 * @param states - Array of state codes to filter by (e.g., ['NY', 'CA'])
 * @returns Filtered alumni array
 */
export const filterAlumniByState = (alumni: Alumni[], states: string[]): Alumni[] => {
  const wanted = new Set(states.map(normalizeStateCode).filter(Boolean) as string[]);
  if (wanted.size === 0) return alumni;
  
  // Alumni table has NO state fields - states are derived from coordinates only
  return alumni.filter((alum: any) => {
    // Skip if no coordinates available
    if (!alum.latitude || !alum.longitude) return false;
    
    const lat = typeof alum.latitude === "string" ? parseFloat(alum.latitude) : alum.latitude;
    const lng = typeof alum.longitude === "string" ? parseFloat(alum.longitude) : alum.longitude;
    
    if (isNaN(lat) || isNaN(lng)) return false;
    
    const code = getStateFromCoordinates(lat, lng);
    return code ? wanted.has(code) : false;
  });
};

/**
 * Counts the number of active filters in the filter state
 * @param filterState - The current filter state
 * @returns Number of active filters
 */
export const getActiveFilterCount = (filterState: FilterState): number => {
  let count = 0;
  
  // Check primary data selection filters first (respect precedence: ids > state > location)
  const hasIdsFilter = !!(filterState.filters.ids && filterState.filters.ids.length > 0);
  const hasStateFilter = !!(filterState.filters.state && filterState.filters.state.length > 0);
  const hasLocationFilter = !!filterState.filters.location;
  
  // Only count the highest precedence filter that's active
  if (hasIdsFilter) {
    count++; // Only count IDs, ignore state/location since IDs takes precedence
  } else if (hasStateFilter) {
    count++; // Only count state, ignore location since state takes precedence  
  } else if (hasLocationFilter) {
    count++; // Only count location if neither IDs nor state are active
  }
  
  // Count other filters that don't conflict with data selection precedence
  if (filterState.filters.cohortYear.length > 0) count++;
  if (filterState.filters.trackingStatus.length > 0) count++;
  if (filterState.filters.contactRecency.length > 0) count++;
  if (filterState.filters.supportCategory.length > 0) count++;
  if (filterState.filters.collegeAttending.length > 0) count++;
  if (filterState.filters.employed !== null) count++;
  if (filterState.filters.receivedScholarships !== null) count++;
  if (filterState.filters.currentStage.length > 0) count++;
  if (filterState.filters.attritionType !== 'all') count++;
  
  return count;
};

/**
 * Predefined sort options for the alumni list
 */
export const sortOptions = [
  { value: 'lastName-asc', label: 'Last Name A→Z', field: 'lastName' as SortField, direction: 'asc' as SortDirection },
  { value: 'lastName-desc', label: 'Last Name Z→A', field: 'lastName' as SortField, direction: 'desc' as SortDirection },
  { value: 'firstName-asc', label: 'First Name A→Z', field: 'firstName' as SortField, direction: 'asc' as SortDirection },
  { value: 'firstName-desc', label: 'First Name Z→A', field: 'firstName' as SortField, direction: 'desc' as SortDirection },
  { value: 'cohortYear-desc', label: 'Graduation Year (Newest)', field: 'cohortYear' as SortField, direction: 'desc' as SortDirection },
  { value: 'cohortYear-asc', label: 'Graduation Year (Oldest)', field: 'cohortYear' as SortField, direction: 'asc' as SortDirection },
  { value: 'collegeGpa-desc', label: 'GPA (Highest)', field: 'collegeGpa' as SortField, direction: 'desc' as SortDirection },
  { value: 'collegeGpa-asc', label: 'GPA (Lowest)', field: 'collegeGpa' as SortField, direction: 'asc' as SortDirection },
  { value: 'latestAnnualIncome-desc', label: 'Income (Highest)', field: 'latestAnnualIncome' as SortField, direction: 'desc' as SortDirection },
  { value: 'latestAnnualIncome-asc', label: 'Income (Lowest)', field: 'latestAnnualIncome' as SortField, direction: 'asc' as SortDirection },
];

/**
 * Column definition for export functionality
 */
export interface ExportColumn {
  key: string;
  label: string;
  getValue: (alum: any) => string;
}

/**
 * Gets a complete mapping of all sheet column keys to their export definitions
 * @returns Object mapping column keys to ExportColumn definitions
 */
const getSheetColumnMap = (): Record<string, ExportColumn> => ({
  // Present (core identity & tracking)
  contactId: { key: 'contactId', label: 'Contact ID', getValue: (alum: any) => alum.contactId || `A-${alum.id.toString().padStart(4, '0')}` },
  firstName: { key: 'firstName', label: 'First Name', getValue: (alum: any) => alum.firstName || '' },
  lastName: { key: 'lastName', label: 'Last Name', getValue: (alum: any) => alum.lastName || '' },
  cohortYear: { key: 'cohortYear', label: 'Cohort Year', getValue: (alum: any) => alum.cohortYear?.toString() || '' },
  pathType: { key: 'pathType', label: 'Path', getValue: (alum: any) => alum.pathType || '' },
  currentStage: { key: 'currentStage', label: 'Current Stage', getValue: (alum: any) => alum.currentStage || '' },
  trackingStatus: { key: 'trackingStatus', label: 'Track', getValue: (alum: any) => alum.trackingStatus || 'unknown' },
  supportCategory: { key: 'supportCategory', label: 'Grouping', getValue: (alum: any) => alum.supportCategory || '' },
  lastContactDate: { key: 'lastContactDate', label: 'Last Attempted Outreach', getValue: (alum: any) => alum.lastContactDate || '' },
  needsFollowUp: { key: 'needsFollowUp', label: 'Needs Follow Up', getValue: (alum: any) => alum.needsFollowUp ? 'Yes' : 'No' },
  dropoutDate: { key: 'dropoutDate', label: 'Dropout Date', getValue: (alum: any) => alum.dropoutDate || '' },
  matriculation: { key: 'matriculation', label: 'Matriculation', getValue: (alum: any) => alum.pathType === 'college' ? 'College' : 'Workforce' },
  transcriptCollected: { key: 'transcriptCollected', label: 'Transcript', getValue: (alum: any) => alum.transcriptCollected ? 'Yes' : 'No' },
  
  // Contact information
  phone: { key: 'phone', label: 'Mobile Number', getValue: (alum: any) => alum.phone || '' },
  email: { key: 'email', label: 'Preferred Email', getValue: (alum: any) => alum.email || '' },
  personalEmail: { key: 'personalEmail', label: 'Personal Email', getValue: (alum: any) => alum.personalEmail || '' },
  compSciHighEmail: { key: 'compSciHighEmail', label: 'CSH Email', getValue: (alum: any) => alum.compSciHighEmail || '' },
  connected: { key: 'connected', label: 'Connected', getValue: (alum: any) => (alum.personalEmail || alum.compSciHighEmail) ? 'Yes' : 'No' },
  
  // Social media
  instagramHandle: { key: 'instagramHandle', label: 'Instagram', getValue: (alum: any) => alum.instagramHandle || '' },
  twitterHandle: { key: 'twitterHandle', label: 'Twitter', getValue: (alum: any) => alum.twitterHandle || '' },
  linkedinHandle: { key: 'linkedinHandle', label: 'LinkedIn', getValue: (alum: any) => alum.linkedinHandle || '' },
  tiktokHandle: { key: 'tiktokHandle', label: 'TikTok', getValue: (alum: any) => alum.tiktokHandle || '' },
  
  // Personal information
  dateOfBirth: { key: 'dateOfBirth', label: 'Date of Birth', getValue: (alum: any) => alum.dateOfBirth || '' },
  highSchoolGpa: { key: 'highSchoolGpa', label: 'HS GPA', getValue: (alum: any) => alum.highSchoolGpa?.toString() || '' },
  
  // Education
  collegeAttending: { key: 'collegeAttending', label: 'College Attending', getValue: (alum: any) => alum.collegeAttending || '' },
  collegeProgram: { key: 'collegeProgram', label: 'Program', getValue: (alum: any) => alum.collegeProgram || '' },
  collegeMajor: { key: 'collegeMajor', label: 'Major', getValue: (alum: any) => alum.collegeMajor || '' },
  collegeMinor: { key: 'collegeMinor', label: 'Minor', getValue: (alum: any) => alum.collegeMinor || '' },
  degreeTrack: { key: 'degreeTrack', label: 'Degree Track', getValue: (alum: any) => alum.degreeTrack || '' },
  intendedCareerPath: { key: 'intendedCareerPath', label: 'Intended Career', getValue: (alum: any) => alum.intendedCareerPath || '' },
  collegeGpa: { key: 'collegeGpa', label: 'College GPA', getValue: (alum: any) => alum.collegeGpa?.toString() || '' },
  enrollmentStatus: { key: 'enrollmentStatus', label: 'Enrollment Status', getValue: (alum: any) => alum.enrollmentStatus || '' },
  expectedGraduationDate: { key: 'expectedGraduationDate', label: 'Expected Graduation', getValue: (alum: any) => alum.expectedGraduationDate || '' },
  transferStudentStatus: { key: 'transferStudentStatus', label: 'Transfer Status', getValue: (alum: any) => alum.transferStudentStatus || '' },
  currentlyEnrolled: { key: 'currentlyEnrolled', label: 'Currently Enrolled', getValue: (alum: any) => alum.currentlyEnrolled ? 'Yes' : 'No' },
  
  // Support & scholarships
  receivedScholarships: { key: 'receivedScholarships', label: 'Received Scholarships', getValue: (alum: any) => alum.receivedScholarships || '' },
  scholarshipsRequiringRenewal: { key: 'scholarshipsRequiringRenewal', label: 'Scholarship Renewals', getValue: (alum: any) => alum.scholarshipsRequiringRenewal || '' },
  
  // Career & employment
  employed: { key: 'employed', label: 'Employed', getValue: (alum: any) => alum.employed ? 'Yes' : 'No' },
  employerName: { key: 'employerName', label: 'Employer Name', getValue: (alum: any) => alum.employerName || '' },
  employmentType: { key: 'employmentType', label: 'Employment Type', getValue: (alum: any) => alum.employmentType || '' },
  currentSalary: { key: 'currentSalary', label: 'Current Salary', getValue: (alum: any) => alum.currentSalary?.toString() || '' },
  latestAnnualIncome: { key: 'latestAnnualIncome', label: 'Latest Annual Income', getValue: (alum: any) => alum.latestAnnualIncome?.toString() || '' },
  latestIncomeDate: { key: 'latestIncomeDate', label: 'Income Date', getValue: (alum: any) => alum.latestIncomeDate || '' },
  
  // Job training
  trainingProgramName: { key: 'trainingProgramName', label: 'Training Program', getValue: (alum: any) => alum.trainingProgramName || '' },
  trainingProgramType: { key: 'trainingProgramType', label: 'Training Type', getValue: (alum: any) => alum.trainingProgramType || '' },
  trainingProgramLocation: { key: 'trainingProgramLocation', label: 'Training Location', getValue: (alum: any) => alum.trainingProgramLocation || '' },
  trainingStartDate: { key: 'trainingStartDate', label: 'Training Start', getValue: (alum: any) => alum.trainingStartDate || '' },
  trainingEndDate: { key: 'trainingEndDate', label: 'Training End', getValue: (alum: any) => alum.trainingEndDate || '' },
  
  // Notes
  notes: { key: 'notes', label: 'Notes', getValue: (alum: any) => alum.notes || '' },
});

/**
 * Gets visible columns for export based on view mode
 * @param viewMode - Current view mode
 * @param tableRef - Reference to table component (for table view)
 * @param sheetViewMode - Sheet view mode (basic/expanded/all) when viewMode is 'sheets'
 * @returns Array of export column definitions
 */
export const getVisibleColumnsForExport = (viewMode: 'grid' | 'list' | 'table' | 'sheets', tableRef?: any, sheetViewMode?: 'basic' | 'expanded' | 'all'): ExportColumn[] => {
  // Table view: ask the table what's actually visible
  if (viewMode === 'table' && tableRef?.current) {
    return tableRef.current.getVisibleColumns();
  }

  // Sheets view: return columns based on current sheet view mode
  if (viewMode === 'sheets') {
    const columnMap = getSheetColumnMap();
    
    // Get column keys based on view mode (matches AlumniSheetsView columnSets)
    let columnKeys: string[];
    switch (sheetViewMode) {
      case 'basic':
        columnKeys = [
          // Present (core identity & tracking)
          'firstName', 'lastName', 'cohortYear', 'pathType', 'currentStage', 'trackingStatus', 'supportCategory', 'lastContactDate', 'phone', 'email',
          // Education 
          'collegeAttending', 'currentlyEnrolled',
          // Career
          'employed', 'employerName'
        ];
        break;
      case 'expanded':
        columnKeys = [
          // Present (core identity, contact, tracking, sensitive/admin)
          'firstName', 'lastName', 'cohortYear', 'contactId', 'pathType', 'currentStage', 'trackingStatus', 'supportCategory', 'lastContactDate', 
          'phone', 'personalEmail', 'compSciHighEmail', 'instagramHandle', 'linkedinHandle',
          'dateOfBirth', 'highSchoolGpa',
          
          // Education (comprehensive + support/scholarships)
          'collegeAttending', 'collegeProgram', 'collegeMajor', 'collegeGpa', 'collegeMinor', 'currentlyEnrolled', 'enrollmentStatus', 'expectedGraduationDate', 'transferStudentStatus',
          'receivedScholarships', 'scholarshipsRequiringRenewal',
          
          // Career (employment + job training)
          'employed', 'employerName', 'employmentType', 'currentSalary', 'latestAnnualIncome',
          'trainingProgramName', 'trainingProgramType', 'trainingProgramLocation', 'trainingStartDate', 'trainingEndDate',
          
          // Notes
          'notes'
        ];
        break;
      case 'all':
      default:
        // All available columns - full comprehensive set
        columnKeys = [
          'contactId', 'firstName', 'lastName', 'cohortYear', 'phone', 'compSciHighEmail', 'personalEmail', 'email', 'connected', 'instagramHandle', 'twitterHandle', 'linkedinHandle', 'tiktokHandle', 'dateOfBirth', 'highSchoolGpa', 'supportCategory', 'pathType', 'currentStage', 'lastContactDate', 'needsFollowUp', 'trackingStatus', 'dropoutDate', 'matriculation', 'transcriptCollected',
          'collegeAttending', 'collegeProgram', 'collegeMajor', 'collegeMinor', 'degreeTrack', 'intendedCareerPath', 'collegeGpa', 'enrollmentStatus', 'expectedGraduationDate', 'transferStudentStatus', 'currentlyEnrolled', 'receivedScholarships', 'scholarshipsRequiringRenewal',
          'employed', 'employerName', 'employmentType', 'currentSalary', 'latestAnnualIncome', 'latestIncomeDate', 'trainingProgramName', 'trainingProgramType', 'trainingProgramLocation', 'trainingStartDate', 'trainingEndDate',
          'notes'
        ];
        break;
    }
    
    // Map column keys to export column definitions
    return columnKeys.map(key => columnMap[key]).filter(Boolean);
  }

  // Grid/List fallback (standard default set)
  return [
    { key: 'name', label: 'Name', getValue: (alum: any) => `${alum.firstName} ${alum.lastName}` },
    { key: 'cohortYear', label: 'Cohort Year', getValue: (alum: any) => alum.cohortYear },
    { key: 'collegeAttending', label: 'College Attending', getValue: (alum: any) => alum.collegeAttending || '' },
    { key: 'collegeMajor', label: 'Major', getValue: (alum: any) => alum.collegeMajor || '' },
    { key: 'trackingStatus', label: 'Tracking Status', getValue: (alum: any) => alum.trackingStatus || '' },
    { key: 'currentlyEnrolled', label: 'Currently Enrolled', getValue: (alum: any) => alum.currentlyEnrolled ? 'Yes' : 'No' },
    { key: 'employed', label: 'Employed', getValue: (alum: any) => alum.employed ? 'Yes' : 'No' },
    { key: 'employerName', label: 'Employer Name', getValue: (alum: any) => alum.employerName || '' },
    { key: 'latestAnnualIncome', label: 'Latest Income', getValue: (alum: any) => alum.latestAnnualIncome || '' },
    { key: 'lastContactDate', label: 'Last Contact Date', getValue: (alum: any) => alum.lastContactDate || '' },
    { key: 'personalEmail', label: 'Email', getValue: (alum: any) => alum.personalEmail || alum.compSciHighEmail || '' },
    { key: 'phone', label: 'Phone', getValue: (alum: any) => alum.phone || '' }
  ];
};

/**
 * Escapes a value for CSV export by wrapping in quotes and escaping internal quotes
 * @param val - Value to escape
 * @returns Escaped CSV value
 */
export const escapeCsv = (val: any): string => {
  const s = `${val ?? ''}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point  
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in miles
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Filters alumni by geographic location
 * @param alumni - Array of alumni with location data
 * @param centerLat - Center latitude for filtering
 * @param centerLng - Center longitude for filtering
 * @param radiusMiles - Radius in miles
 * @returns Filtered array of alumni within the radius
 */
export const filterAlumniByLocation = (alumni: any[], centerLat: number, centerLng: number, radiusMiles: number): any[] => {
  return alumni.filter(alum => {
    // Check if alumni has location data
    if (!alum.latitude || !alum.longitude) {
      return false;
    }
    
    const lat = typeof alum.latitude === 'string' ? parseFloat(alum.latitude) : alum.latitude;
    const lng = typeof alum.longitude === 'string' ? parseFloat(alum.longitude) : alum.longitude;
    
    if (isNaN(lat) || isNaN(lng)) {
      return false;
    }
    
    const distance = calculateDistance(centerLat, centerLng, lat, lng);
    return distance <= radiusMiles;
  });
};

/**
 * Filters alumni by specific IDs
 * @param alumni - Array of alumni
 * @param ids - Array of alumni IDs to include
 * @returns Filtered array of alumni matching the IDs
 */
export const filterAlumniByIds = (alumni: any[], ids: number[]): any[] => {
  console.log('🎯 FILTERING ALUMNI BY IDS:', {
    totalAlumni: alumni.length,
    targetIds: ids,
    idCount: ids.length
  });
  
  const filtered = alumni.filter(alum => ids.includes(alum.id));
  
  console.log('✅ IDS FILTER RESULT:', {
    beforeCount: alumni.length,
    afterCount: filtered.length,
    matchedAlumni: filtered.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))
  });
  
  return filtered;
};

/**
 * Gets the avatar ring class for an alumni based on their contact recency
 * @param alumnus - The alumni record
 * @param getContactRecencyRingClass - Function to get ring class from contact date
 * @param calculateLastContactDate - Function to calculate last contact date
 * @returns CSS class for avatar ring
 */
export const getAvatarRingClassForAlumni = (
  alumnus: Alumni,
  getContactRecencyRingClass: (lastContactDate: Date | null, size?: "small" | "large") => string,
  calculateLastContactDate: (alumnus: Alumni, interactions: any[]) => Date | null
): string => {
  // For now, use the fallback fields until we can fetch interactions efficiently
  // This will use: lastContactDate -> connectedAsOf -> cohortYear graduation date  
  const lastContactDate = calculateLastContactDate(alumnus, []);
  return getContactRecencyRingClass(lastContactDate, 'small');
};

/**
 * Parses URL search parameters into a FilterState object
 * @param searchParams - URL search parameters string
 * @param currentSort - Current sort configuration to maintain
 * @returns Parsed FilterState object
 */
export const parseUrlParamsToFilterState = (searchParams: string, currentSort: { field: SortField; direction: SortDirection }): FilterState => {
  const urlParams = new URLSearchParams(searchParams);
  
  // Parse location filter with debugging
  const lat = urlParams.get('lat');
  const lng = urlParams.get('lng');
  const radius = urlParams.get('radius');
  
  
  const location = (lat && lng) ? {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    radius: radius ? parseFloat(radius) : 10 // default 10 miles
  } : null;
  
  if (location) {
  }
  
  // Parse IDs filter with debugging
  const idsParam = urlParams.get('ids');
  
  const ids = idsParam ? 
    idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) 
    : null;
  
  if (ids && ids.length > 0) {
  }
  
  // Parse sort parameters from URL
  const sortField = urlParams.get('sortField') as SortField;
  const sortDirection = urlParams.get('sortDirection') as SortDirection;
  const sort = (sortField && sortDirection) ? 
    { field: sortField, direction: sortDirection } : 
    currentSort;
  
  // Parse state filter with normalization
  const stateParams = urlParams.getAll('state')
    .map(s => normalizeStateCode(s))
    .filter(Boolean) as string[];

  const result = {
    sort,
    filters: {
      cohortYear: urlParams.getAll('cohortYear').map(y => parseInt(y)),
      trackingStatus: urlParams.getAll('trackingStatus'),
      contactRecency: urlParams.getAll('contactRecency'),
      supportCategory: urlParams.getAll('supportCategory'),
      collegeAttending: urlParams.getAll('collegeAttending'),
      employed: urlParams.has('employed') ? urlParams.get('employed') === 'true' : null,
      receivedScholarships: urlParams.has('receivedScholarships') ? urlParams.get('receivedScholarships') === 'true' : null,
      currentStage: urlParams.getAll('currentStage'),
      attritionType: urlParams.get('attritionType') || 'all',
      // New filterable columns for sheets view
      connected: urlParams.getAll('connected'),
      matriculation: urlParams.getAll('matriculation'),
      currentlyEnrolled: urlParams.getAll('currentlyEnrolled'),
      needsFollowUp: urlParams.getAll('needsFollowUp'),
      enrollmentStatus: urlParams.getAll('enrollmentStatus'),
      employmentType: urlParams.getAll('employmentType'),
      employmentStatus: urlParams.getAll('employmentStatus'),
      scholarships: urlParams.getAll('scholarships'),
      // Geographic filters
      location: location,
      state: stateParams,
      // Alumni IDs filter
      ids: ids,
    }
  };
  
  
  return result;
};

/**
 * Builds URL search parameters from filter state, search term, and page
 * @param page - Current page number
 * @param searchTerm - Search term (optional)
 * @param filterState - Filter state object
 * @returns URLSearchParams object
 */
export const buildUrlSearchParams = (
  page: number, 
  searchTerm: string = '', 
  filterState: FilterState
): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (page > 1) params.set('page', page.toString());
  if (searchTerm) params.set('search', searchTerm);
  
  // Add sort parameters
  if (filterState.sort) {
    params.set('sortField', filterState.sort.field);
    params.set('sortDirection', filterState.sort.direction);
  }
  
  // Add advanced filter parameters
  if (filterState.filters.cohortYear.length > 0) {
    filterState.filters.cohortYear.forEach(year => params.append('cohortYear', year.toString()));
  }
  if (filterState.filters.trackingStatus.length > 0) {
    filterState.filters.trackingStatus.forEach(filter => params.append('trackingStatus', filter));
  }
  if (filterState.filters.contactRecency.length > 0) {
    filterState.filters.contactRecency.forEach(filter => params.append('contactRecency', filter));
  }
  if (filterState.filters.supportCategory.length > 0) {
    filterState.filters.supportCategory.forEach(filter => params.append('supportCategory', filter));
  }
  if (filterState.filters.currentStage.length > 0) {
    filterState.filters.currentStage.forEach(filter => params.append('currentStage', filter));
  }
  if (filterState.filters.collegeAttending.length > 0) {
    filterState.filters.collegeAttending.forEach(filter => params.append('collegeAttending', filter));
  }
  if (filterState.filters.employed !== null) {
    params.append('employed', filterState.filters.employed.toString());
  }
  if (filterState.filters.receivedScholarships !== null) {
    params.append('receivedScholarships', filterState.filters.receivedScholarships.toString());
  }
  if (filterState.filters.attritionType !== 'all') {
    params.append('attritionType', filterState.filters.attritionType);
  }
  
  // Add location filter parameters
  if (filterState.filters.location) {
    params.append('lat', filterState.filters.location.latitude?.toString() || '');
    params.append('lng', filterState.filters.location.longitude?.toString() || '');
    params.append('radius', filterState.filters.location.radius.toString());
  }
  
  // Add state filter parameters
  if (filterState.filters.state.length > 0) {
    filterState.filters.state.forEach(state => params.append('state', state));
  }
  
  // Add IDs filter parameters
  if (filterState.filters.ids && filterState.filters.ids.length > 0) {
    params.append('ids', filterState.filters.ids.join(','));
  }
  
  return params;
};

/**
 * Builds URL search parameters for API queries (includes pagination and sort)
 * @param page - Current page number
 * @param limit - Items per page
 * @param searchTerm - Search term (optional)  
 * @param filterState - Filter state object
 * @returns URLSearchParams object
 */
export const buildApiQueryParams = (
  page: number,
  limit: number,
  searchTerm: string = '',
  filterState: FilterState
): URLSearchParams => {
  const params = new URLSearchParams();
  
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (searchTerm) params.set('search', searchTerm);
  
  // Add sort parameters
  if (filterState.sort) {
    params.set('sortField', filterState.sort.field);
    params.set('sortDirection', filterState.sort.direction);
  }
  
  // Add all filter parameters
  if (filterState.filters.cohortYear.length > 0) {
    filterState.filters.cohortYear.forEach(year => 
      params.append('cohortYear', year.toString())
    );
  }
  if (filterState.filters.trackingStatus.length > 0) {
    filterState.filters.trackingStatus.forEach(status => 
      params.append('trackingStatus', status)
    );
  }
  if (filterState.filters.contactRecency.length > 0) {
    filterState.filters.contactRecency.forEach(recency => 
      params.append('contactRecency', recency)
    );
  }
  if (filterState.filters.supportCategory.length > 0) {
    filterState.filters.supportCategory.forEach(category => 
      params.append('supportCategory', category)
    );
  }
  if (filterState.filters.collegeAttending.length > 0) {
    filterState.filters.collegeAttending.forEach(college => 
      params.append('collegeAttending', college)
    );
  }
  if (filterState.filters.employed !== null) {
    params.append('employed', filterState.filters.employed.toString());
  }
  if (filterState.filters.receivedScholarships !== null) {
    params.append('receivedScholarships', filterState.filters.receivedScholarships.toString());
  }
  if (filterState.filters.currentStage.length > 0) {
    filterState.filters.currentStage.forEach(stage => 
      params.append('currentStage', stage)
    );
  }
  if (filterState.filters.attritionType !== 'all') {
    params.append('attritionType', filterState.filters.attritionType);
  }

  return params;
};

/**
 * Builds URL search parameters for export queries (similar to API but for export endpoints)
 * @param searchTerm - Search term (optional)
 * @param filterState - Filter state object
 * @returns URLSearchParams object
 */
export const buildExportQueryParams = (
  searchTerm: string = '',
  filterState: FilterState
): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Add search term
  if (searchTerm) {
    params.append('search', searchTerm);
  }
  
  // Add all current filters
  filterState.filters.cohortYear.forEach(year => params.append('cohortYear', year.toString()));
  filterState.filters.trackingStatus.forEach(status => params.append('trackingStatus', status));
  filterState.filters.contactRecency.forEach(recency => params.append('contactRecency', recency));
  filterState.filters.supportCategory.forEach(category => params.append('supportCategory', category));
  filterState.filters.collegeAttending.forEach(college => params.append('collegeAttending', college));
  filterState.filters.currentStage.forEach(stage => params.append('currentStage', stage));
  filterState.filters.state.forEach(state => params.append('state', state));
  
  if (filterState.filters.employed !== null) {
    params.append('employed', filterState.filters.employed.toString());
  }
  if (filterState.filters.receivedScholarships !== null) {
    params.append('receivedScholarships', filterState.filters.receivedScholarships.toString());
  }
  if (filterState.filters.attritionType !== 'all') {
    params.append('attritionType', filterState.filters.attritionType);
  }
  
  // Add sort parameters
  params.append('sortField', filterState.sort.field);
  params.append('sortDirection', filterState.sort.direction);
  
  return params;
};

/**
 * Formats the current filter state into human-readable text for export
 * @param searchTerm - Current search term
 * @param filterState - Current filter state
 * @returns Formatted string describing applied filters
 */
export const formatFiltersForExport = (
  searchTerm: string = '',
  filterState: FilterState
): string => {
  const filterDescriptions: string[] = [];
  
  // Search term
  if (searchTerm) {
    filterDescriptions.push(`Search: "${searchTerm}"`);
  }
  
  // Cohort years
  if (filterState.filters.cohortYear.length > 0) {
    const years = filterState.filters.cohortYear.sort((a, b) => b - a);
    filterDescriptions.push(`Cohort Years: ${years.join(', ')}`);
  }
  
  // Tracking status
  if (filterState.filters.trackingStatus.length > 0) {
    filterDescriptions.push(`Tracking Status: ${filterState.filters.trackingStatus.join(', ')}`);
  }
  
  // Contact recency
  if (filterState.filters.contactRecency.length > 0) {
    filterDescriptions.push(`Contact Recency: ${filterState.filters.contactRecency.join(', ')}`);
  }
  
  // Support category
  if (filterState.filters.supportCategory.length > 0) {
    filterDescriptions.push(`Support Category: ${filterState.filters.supportCategory.join(', ')}`);
  }
  
  // College attending
  if (filterState.filters.collegeAttending.length > 0) {
    const colleges = filterState.filters.collegeAttending.length > 3 
      ? `${filterState.filters.collegeAttending.slice(0, 3).join(', ')} and ${filterState.filters.collegeAttending.length - 3} more`
      : filterState.filters.collegeAttending.join(', ');
    filterDescriptions.push(`Colleges: ${colleges}`);
  }
  
  // Current stage
  if (filterState.filters.currentStage.length > 0) {
    filterDescriptions.push(`Current Stage: ${filterState.filters.currentStage.join(', ')}`);
  }
  
  // States
  if (filterState.filters.state.length > 0) {
    const states = filterState.filters.state.length > 5
      ? `${filterState.filters.state.slice(0, 5).join(', ')} and ${filterState.filters.state.length - 5} more`
      : filterState.filters.state.join(', ');
    filterDescriptions.push(`States: ${states}`);
  }
  
  // Employment status
  if (filterState.filters.employed !== null) {
    filterDescriptions.push(`Employment: ${filterState.filters.employed ? 'Employed' : 'Not Employed'}`);
  }
  
  // Scholarships
  if (filterState.filters.receivedScholarships !== null) {
    filterDescriptions.push(`Scholarships: ${filterState.filters.receivedScholarships ? 'Received' : 'Not Received'}`);
  }
  
  // Attrition type
  if (filterState.filters.attritionType !== 'all') {
    filterDescriptions.push(`Attrition Type: ${filterState.filters.attritionType}`);
  }
  
  // Location filter
  if (filterState.filters.location) {
    filterDescriptions.push(`Location: Within ${filterState.filters.location.radius} miles of (${filterState.filters.location.latitude}, ${filterState.filters.location.longitude})`);
  }
  
  // Alumni IDs filter (from map clusters)
  if (filterState.filters.ids && filterState.filters.ids.length > 0) {
    filterDescriptions.push(`Selected Alumni: ${filterState.filters.ids.length} specific records`);
  }
  
  // Sort order
  const sortField = filterState.sort.field === 'lastName' ? 'Last Name' : 
                   filterState.sort.field === 'firstName' ? 'First Name' :
                   filterState.sort.field === 'cohortYear' ? 'Cohort Year' :
                   filterState.sort.field === 'lastContactDate' ? 'Last Contact Date' :
                   filterState.sort.field;
  filterDescriptions.push(`Sort: ${sortField} (${filterState.sort.direction === 'asc' ? 'A-Z' : 'Z-A'})`);
  
  return filterDescriptions.length > 0 ? filterDescriptions.join(' | ') : 'No filters applied';
};

/**
 * Creates a filter state updater function for array filters (cohortYear, trackingStatus, etc.)
 * @param filterKey - The key of the filter to update
 * @param value - The value to add/remove from the array
 * @param checked - Whether to add (true) or remove (false) the value
 * @returns Function that updates the filter state
 */
export const createArrayFilterUpdater = (
  filterKey: keyof FilterState['filters'], 
  value: any, 
  checked: boolean
) => (prev: FilterState): FilterState => ({
  ...prev,
  filters: {
    ...prev.filters,
    [filterKey]: checked
      ? [...(prev.filters[filterKey] as any[]), value]
      : (prev.filters[filterKey] as any[]).filter(item => item !== value)
  }
});

/**
 * Creates a filter state updater function for boolean filters (employed, receivedScholarships)
 * @param filterKey - The key of the filter to update
 * @param value - The boolean value to set
 * @returns Function that updates the filter state
 */
export const createBooleanFilterUpdater = (
  filterKey: 'employed' | 'receivedScholarships', 
  value: boolean | null
) => (prev: FilterState): FilterState => ({
  ...prev,
  filters: {
    ...prev.filters,
    [filterKey]: value
  }
});

/**
 * Creates a filter state updater function for clearing all filters of a specific type
 * @param filterKey - The key of the filter to clear
 * @returns Function that clears the filter state
 */
export const createFilterClearer = (filterKey: keyof FilterState['filters']) => 
  (prev: FilterState): FilterState => ({
    ...prev,
    filters: {
      ...prev.filters,
      [filterKey]: Array.isArray(prev.filters[filterKey]) ? [] : null
    }
  });

/**
 * Creates a complete filter state clearer
 * @returns Function that clears all filters
 */
export const createAllFiltersClearer = () => (prev: FilterState): FilterState => ({
  ...prev,
  filters: {
    ...prev.filters,
    state: [],
    cohortYear: [],
    trackingStatus: [],
    contactRecency: [],
    supportCategory: [],
    collegeAttending: [],
    employed: null,
    receivedScholarships: null,
    currentStage: [],
    attritionType: "all",
    // New filterable columns for sheets view
    connected: [],
    matriculation: [],
    currentlyEnrolled: [],
    needsFollowUp: [],
    enrollmentStatus: [],
    employmentType: [],
    employmentStatus: [],
    scholarships: [],
    // Geographic location filter
    location: null,
    // Alumni IDs filter
    ids: null,
  }
});