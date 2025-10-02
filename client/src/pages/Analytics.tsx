import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getStateFromCoordinates, US_STATE_CENTROIDS } from '../utils/geo';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, TrendingUp, MapPin, ChevronRight, ChevronDown, Filter, Download, DollarSign, X } from "lucide-react";
import { Alumni } from "@shared/schema";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';
import PendingResolutionModal from '@/components/PendingResolutionModal';
import { GradRadarBrandCard } from '@/components/GradRadarBrandCard';
import { CopyToImageButton } from '@/components/CopyToImageButton';
import { FloatingReportsPanel } from '@/components/FloatingReportsPanel';
import { calculateExpectedStage, calculateCurrentStage, getTrackingStatus, type PathType, type CurrentStage } from "@shared/liberationPath";
import { calculateLastContactDate, getDaysSinceLastContact, getContactRecencyStatus } from "@/utils/contactRecency";
import { createCustomIcon, createClusterIcon } from "@/components/maps/icons";
import MapViewController from "@/components/maps/MapViewController";
import SharedAlumniListModal from "@/components/analytics/SharedAlumniListModal";
import AlumniMapByState from "@/components/maps/AlumniMapByState";
import FunnelGraphComponent from "@/components/analytics/FunnelGraph";
import AlumniMap from "@/components/maps/AlumniMap";
import AlumniMapClustered from "@/components/maps/AlumniMapClustered";

// Feature-flagged map selector with aggregation mode support
function AlumniMapSelector({ 
  data, 
  viewMode, 
  mapAggregationMode 
}: { 
  data: any[]; 
  viewMode: 'us' | 'world';
  mapAggregationMode: 'individuals' | 'states';
}) {
  // If states mode, use the new state-aggregated component
  if (mapAggregationMode === 'states') {
    return <AlumniMapByState data={data} viewMode={viewMode} />;
  }
  
  // Otherwise use existing individual maps with feature flag
  const params = new URLSearchParams(window.location.search);
  const useOldMap = params.get('old') === '1' || import.meta.env.VITE_USE_OLD_MAP === 'true';
  
  return useOldMap ? 
    <AlumniMap data={data} viewMode={viewMode} /> : 
    <AlumniMapClustered data={data} viewMode={viewMode} />;
}

interface PathStatusData {
  enrollment: "on-track" | "near-track" | "off-track" | "not-reached";
  retainedYr1: "on-track" | "near-track" | "off-track" | "not-reached";
  persistYr2: "on-track" | "near-track" | "off-track" | "not-reached";
  credential: "on-track" | "near-track" | "off-track" | "not-reached";
}



// Helper function to determine path status for each milestone using Liberation Path framework
function getPathStatus(alumni: Alumni, milestone: string): "on-track" | "near-track" | "off-track" | "not-reached" {
  const debugId = `${alumni.firstName} ${alumni.lastName}`;
  
  // NEW ➜ if the import / admin UI has already stored a stage, trust it
  const storedStage = alumni.currentStage as CurrentStage | undefined;

  // Fallback to the calculator only when the record is blank
  const effectiveCurrentStage = storedStage ?? (calculateCurrentStage(alumni) as CurrentStage);
  
  // If no stage available, they haven't reached any milestones
  if (!effectiveCurrentStage) {
    return "not-reached";
  }
  
  // EMPLOYMENT MILESTONE: Check if alumni is actually employed (works for all path types)
  if (milestone === "employment") {
    // Must check alumni.employed flag directly, don't rely on stage alone
    // because calculateEmploymentStage returns "25-percent" even for unemployed alumni
    if (alumni.employed) {
      return "on-track";
    }
    // Check if they've reached employment stage but aren't currently employed
    const employedStages = ["employed", "above-median", "25-percent", "50-percent", "75-percent"];
    if (employedStages.includes(effectiveCurrentStage)) {
      return "off-track"; // Was employed or should be employed
    }
    return "not-reached";
  }
  
  // SALARY MILESTONE: Check if alumni is above national median (works for all path types)
  if (milestone === "salary") {
    // Must be actually employed first
    if (!alumni.employed) {
      return "not-reached";
    }
    
    // Above-median stages from different paths
    if (effectiveCurrentStage === "above-median" || alumni.onCourseEconomicLiberation) {
      return "on-track";
    }
    
    // Employed but not above median
    return "near-track";
  }
  
  // Define stage progression order for college path milestones
  const stageOrder = ["yr1-enrolled", "yr2", "yr3", "yr4", "yr5-plus", "graduated", "employed", "above-median"];
  
  // Map milestones to minimum required stage - FIXED to use only correct field names
  const milestoneToStage: Record<string, string> = {
    // Heat map milestone names
    "enrollment": "yr1-enrolled",
    "retainedYr1": "yr2",
    "persistYr2": "yr3", 
    "persistYr3": "yr4",
    "credential": "graduated",
    
    // Funnel milestone aliases - so both heat map and funnels can use same helper
    "year1": "yr1-enrolled",
    "year2": "yr2",
    "year3": "yr3",
    "year4": "yr4",
    "graduation": "graduated"
  };
  
  const requiredStage = milestoneToStage[milestone];
  if (!requiredStage) return "not-reached";
  
  // Check if alumni has reached at least the required stage (college path only)
  const currentIndex = stageOrder.indexOf(effectiveCurrentStage || "");
  const requiredIndex = stageOrder.indexOf(requiredStage);
  
  if (currentIndex === -1) return "not-reached"; // Invalid current stage for this milestone
  if (currentIndex < requiredIndex) return "not-reached"; // Haven't reached this milestone yet
  
  // For academic milestones, use tracking status
  const result = alumni.trackingStatus === "on-track" ? "on-track" : 
                 alumni.trackingStatus === "near-track" ? "near-track" : "off-track";
  
  // Debug logging disabled to prevent console spam
  
  return result;
}

// Color mapping based on percentage (red to green spectrum)
const getBarColorByPercentage = (percentage: number) => {
  if (percentage === 0) return "bg-gray-300";
  
  // Map percentage to red-yellow-green spectrum
  if (percentage <= 25) return "bg-red-600";
  if (percentage <= 40) return "bg-red-500";
  if (percentage <= 55) return "bg-orange-500";
  if (percentage <= 70) return "bg-yellow-500";
  if (percentage <= 85) return "bg-lime-500";
  return "bg-green-500";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "on-track": return "🟢";
    case "near-track": return "🟡";
    case "off-track": return "🔴";
    case "not-reached": return "⬜";
    default: return "⬜";
  }
};

function ContactStatusHeatMap() {
  const [, setLocation] = useLocation();
  const heatMapRef = useRef<HTMLDivElement>(null);

  // Get alumni data
  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["contact-status-alumni"],
    queryFn: async () => {
      const response = await fetch("/api/alumni/paginated?limit=1000", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch alumni");
      const data = await response.json();
      
      
      return data.alumni || [];
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-xl w-full">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600 mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-gray-700">Loading contact status data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get available cohorts and sort them
  const cohorts = Array.from(new Set(alumni.map((a: Alumni) => a.cohortYear)))
    .filter((year): year is number => year !== null && year !== undefined) // Remove null/undefined
    .sort((a, b) => a - b);

  // Contact status categories matching the contact recency system
  const contactStatuses = [
    { key: 'recent', label: 'Recent', days: 30, color: 'bg-green-500' },
    { key: 'moderate', label: 'Moderate', days: 90, color: 'bg-yellow-500' },
    { key: 'stale', label: 'Stale', days: 180, color: 'bg-orange-400' },
    { key: 'none', label: 'No Recent Contact', days: Infinity, color: 'bg-red-500' }
  ];

  // Use the pre-populated lastContactDate field directly
  const getContactStatus = (alumnus: Alumni) => {
    // Use the already-populated lastContactDate field from the database
    const lastContactDate = alumnus.lastContactDate ? new Date(alumnus.lastContactDate) : null;
    const ringStatus = getContactRecencyStatus(lastContactDate);
    
    // Direct mapping from contact recency status to heat map categories
    let heatMapStatus = 'none'; // Default
    if (ringStatus === 'recent') heatMapStatus = 'recent';       // Green (0-30 days)
    if (ringStatus === 'moderate') heatMapStatus = 'moderate';   // Yellow (31-90 days) 
    if (ringStatus === 'stale') heatMapStatus = 'stale';         // Orange (91-180 days)
    if (ringStatus === 'none' || ringStatus === 'unknown') heatMapStatus = 'none';  // Red
    
    return heatMapStatus;
  };

  // Calculate percentage data for each cohort
  const cohortData = cohorts.map(cohortYear => {
    const cohortAlumni = alumni.filter((a: Alumni) => a.cohortYear === cohortYear);
    const total = cohortAlumni.length;
    
    
    
    if (total === 0) {
      return {
        cohortYear,
        total: 0,
        percentages: contactStatuses.reduce((acc, status) => {
          acc[status.key] = 0;
          return acc;
        }, {} as Record<string, number>),
        counts: contactStatuses.reduce((acc, status) => {
          acc[status.key] = 0;
          return acc;
        }, {} as Record<string, number>)
      };
    }

    // Count alumni in each contact status
    const counts = contactStatuses.reduce((acc, status) => {
      acc[status.key] = 0;
      return acc;
    }, {} as Record<string, number>);

    cohortAlumni.forEach((alumnus: Alumni) => {
      const status = getContactStatus(alumnus);
      counts[status]++;
    });

    // Convert to percentages (ensure they add up to 100%)
    const percentages = contactStatuses.reduce((acc, status) => {
      acc[status.key] = Math.round((counts[status.key] / total) * 100);
      return acc;
    }, {} as Record<string, number>);
    
    

    // Adjust for rounding errors to ensure total is 100%
    const totalPercentage = Object.values(percentages).reduce((sum, pct) => sum + pct, 0);
    if (totalPercentage !== 100 && total > 0) {
      // Add/subtract the difference to the largest category
      const largestKey = Object.keys(percentages).reduce((a, b) => 
        percentages[a] > percentages[b] ? a : b
      );
      percentages[largestKey] += (100 - totalPercentage);
    }


    return {
      cohortYear,
      total,
      percentages,
      counts
    };
  });


  // Handle clicking on cells to navigate to filtered alumni
  const handleCellClick = (contactStatus: string, cohortYear: number) => {
    const params = new URLSearchParams();
    params.append('cohortYear', String(cohortYear));
    
    // Map contact status to contactRecency filter (direct mapping)
    switch (contactStatus) {
      case 'recent':
        params.append('contactRecency', 'recent');
        break;
      case 'moderate':
        params.append('contactRecency', 'moderate');
        break;
      case 'stale':
        params.append('contactRecency', 'stale');
        break;
      case 'none':
        params.append('contactRecency', 'none');
        break;
    }
    
    console.log('📊 ANALYTICS NAVIGATION:', {
      clickedStatus: contactStatus,
      clickedCohort: cohortYear,
      newUrl: `/alumni?${params.toString()}`,
      params: Object.fromEntries(params.entries())
    });
    
    setLocation(`/alumni?${params.toString()}`);
  };

  // Get color class based on percentage - using only dark colors that work with white text
  const getColorClass = (percentage: number, baseColor: string) => {
    if (percentage === 0) return 'bg-gray-200 text-gray-600'; // Light gray with dark text for empty cells
    
    // Extract color name from base color class
    const colorName = baseColor.replace('bg-', '').split('-')[0];
    
    // Special handling for orange to keep it bright instead of brownish
    if (colorName === 'orange') {
      if (percentage <= 25) return 'bg-orange-400';
      if (percentage <= 50) return 'bg-orange-500';
      if (percentage <= 75) return 'bg-orange-600';
      return 'bg-orange-600'; // Keep it orange-600 max to avoid brown
    }
    
    // Use only dark color variants (500-800) that provide good contrast with white text
    if (percentage <= 25) return `bg-${colorName}-500`;
    if (percentage <= 50) return `bg-${colorName}-600`;
    if (percentage <= 75) return `bg-${colorName}-700`;
    return `bg-${colorName}-800`; // Darkest for highest percentages
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">Contact Status by Cohort</h2>
          <div className="flex items-center gap-2">
            <CopyToImageButton 
              elementRef={heatMapRef} 
              filename="contact-status-heatmap"
              className="data-html2canvas-ignore"
            />
          </div>
        </div>
      </div>

      {/* Heat Map Grid */}
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100" ref={heatMapRef}>
        {/* Column Headers - Cohort Years */}
        <div className="bg-gray-50 border-b border-gray-100">
          <div className={`grid text-center`} style={{gridTemplateColumns: `180px repeat(${cohorts.length}, 1fr)`}}>
            <div className="py-3 px-4 text-left">
            </div>
            {cohorts.map((year: number) => (
              <div key={year} className="py-3 px-4 border-l border-gray-100">
                <div className="text-sm font-semibold text-gray-900">{year}</div>
                <div className="text-xs text-gray-500">
                  {cohortData.find(d => d.cohortYear === year)?.total || 0} alumni
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Data Rows */}
        <div className="divide-y divide-gray-100">
          {contactStatuses.map((status, index) => (
            <div key={status.key} className={`grid`} style={{gridTemplateColumns: `180px repeat(${cohorts.length}, 1fr)`}}>
              {/* Row Label */}
              <div className="py-4 px-4 flex items-center">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${status.color}`}></div>
                  <span className="font-semibold text-gray-900">{status.label}</span>
                </div>
              </div>
              
              {/* Data Cells */}
              {cohorts.map((year: number) => {
                const data = cohortData.find(d => d.cohortYear === year);
                const percentage = data?.percentages[status.key] || 0;
                const count = data?.counts[status.key] || 0;
                
                return (
                  <div 
                    key={year}
                    className="py-1 px-1 border-l border-gray-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleCellClick(status.key, year)}
                  >
                    <div 
                      className={`w-full h-16 ${getColorClass(percentage, status.color)} relative flex flex-col items-center justify-center text-white font-semibold transition-all duration-200`}
                      title={`${status.label} (${year}): ${count} alumni (${percentage}%)`}
                    >
                      {percentage > 0 && (
                        <>
                          <div className="text-lg">{percentage}%</div>
                          <div className="text-xs opacity-90">{count}</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>0-30 days</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>31-90 days</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
          <span>91-180 days</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>180+ days</span>
        </div>
      </div>
    </div>
  );
}

function TwinFunnels() {
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [activeView, setActiveView] = useState<'overall' | 'success' | 'attrition'>('overall');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [, setLocation] = useLocation();
  const funnelsRef = useRef<HTMLDivElement>(null);

  // Handle clicking on liberation status items
  const handleLiberationClick = (status: string) => {
    const params = new URLSearchParams();
    
    // Add cohort filter if one is selected
    if (selectedCohort !== "all") {
      params.append('cohortYear', selectedCohort);
    }
    
    // Map liberation status to tracking status for blue pill filters
    if (status === 'true') {
      params.append('trackingStatus', 'on-track');
    } else if (status === 'near') {
      params.append('trackingStatus', 'near-track');
    } else if (status === 'false') {
      params.append('trackingStatus', 'off-track');
    } else if (status === 'unknown') {
      params.append('trackingStatus', 'unknown');
    }
    
    setLocation(`/alumni?${params.toString()}`);
  };
  
  const { data: alumni = [], isLoading } = useQuery<Alumni[]>({
    queryKey: ["funnel-alumni", selectedCohort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCohort !== "all") {
        params.append("cohortYear", selectedCohort);
      }
      params.append("limit", "1000"); // Get all alumni, not paginated
      
      const response = await fetch(`/api/alumni/paginated?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch alumni");
      const data = await response.json();
      
      return data.alumni || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 shadow-xl border border-blue-100">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600"></div>
        </div>
      </div>
    );
  }

  // Get available cohorts
  const cohorts = Array.from(new Set(alumni.map(a => a.cohortYear))).sort((a, b) => b - a);
  
  // Use the same data (already filtered by cohort in the query)
  const filteredAlumni = alumni;
  const totalGraduates = filteredAlumni.length;
  const currentYear = new Date().getFullYear(); // Still needed for some calculations
  
  // Calculate funnel data - count alumni who are successfully progressing (on-track or near-track) at each milestone
  // Success Funnel should show success rates, not just "reached" counts
  const year1 = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "year1");
    return status === "on-track" || status === "near-track";
  }).length;
  
  const year2 = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "year2");
    return status === "on-track" || status === "near-track";
  }).length;
  
  const year3 = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "year3");
    return status === "on-track" || status === "near-track";
  }).length;
  
  const year4 = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "year4");
    return status === "on-track" || status === "near-track";
  }).length;
  
  const graduated = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "graduation");
    return status === "on-track" || status === "near-track";
  }).length;
  
  const employed = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "employment");
    return status === "on-track" || status === "near-track";
  }).length;

  // Get national median income from settings (default to $74,580)
  const nationalMedianIncome = settings?.nationalMedianIncome || 74580;

  // Salary Comparison: Use same logic as heat map
  const aboveMedianSalary = filteredAlumni.filter(a => {
    const status = getPathStatus(a, "salary");
    return status === "on-track" || status === "near-track";
  }).length;

  // Alumni with salary data
  const employedWithSalaryData = filteredAlumni.filter(a => {
    const yearsPostGrad = currentYear - a.cohortYear;
    return yearsPostGrad >= 2 && a.employed && a.currentSalary && a.salaryDataConsent;
  });

  // Alumni employed but missing salary data
  const employedMissingSalaryData = filteredAlumni.filter(a => {
    const yearsPostGrad = currentYear - a.cohortYear;
    return yearsPostGrad >= 2 && a.employed && (!a.currentSalary || !a.salaryDataConsent);
  });
  
  // Not in funnel: Those who dropped out or are off-track
  const notInFunnel = filteredAlumni.filter(a => {
    const yearsPostGrad = currentYear - a.cohortYear;
    return yearsPostGrad >= 2 && !a.currentlyEnrolled && !a.employed;
  }).length;

  // Calculate tracking status for donut chart (filtered by cohort)
  const onTrack = filteredAlumni.filter(a => a.trackingStatus === "on-track").length;
  const nearTrack = filteredAlumni.filter(a => a.trackingStatus === "near-track").length;
  const offTrack = filteredAlumni.filter(a => a.trackingStatus === "off-track").length;
  const unknown = filteredAlumni.filter(a => !a.trackingStatus || a.trackingStatus === "unknown").length;

  // Calculate cohort-appropriate attrition (only count dropouts from cohorts that have had time to progress)
  
  // Never enrolled - all cohorts should have had opportunity to enroll
  const neverEnrolled = totalGraduates - year1;
  
  // Year 1 dropouts - only count cohorts that have had time to reach Year 2 (all cohorts except current year)
  const eligibleForYear2 = filteredAlumni.filter(a => a.cohortYear < currentYear);
  const reachedYear1InEligible = eligibleForYear2.filter(a => {
    const status = getPathStatus(a, "year1");
    return status !== "not-reached";
  }).length;
  const reachedYear2InEligible = eligibleForYear2.filter(a => {
    const status = getPathStatus(a, "year2");
    return status !== "not-reached";
  }).length;
  const year1Dropouts = reachedYear1InEligible - reachedYear2InEligible;
  
  // Year 2 dropouts - only count cohorts that have had time to reach Year 3 (2023 and earlier)
  const eligibleForYear3 = filteredAlumni.filter(a => a.cohortYear <= currentYear - 2);
  const reachedYear2InY3Eligible = eligibleForYear3.filter(a => {
    const status = getPathStatus(a, "year2");
    return status !== "not-reached";
  }).length;
  const reachedYear3InEligible = eligibleForYear3.filter(a => {
    const status = getPathStatus(a, "year3");
    return status !== "not-reached";
  }).length;
  const year2Dropouts = reachedYear2InY3Eligible - reachedYear3InEligible;
  
  // Year 3 dropouts - only count cohorts that have had time to reach Year 4 (2022 and earlier)
  const eligibleForYear4 = filteredAlumni.filter(a => a.cohortYear <= currentYear - 3);
  const reachedYear3InY4Eligible = eligibleForYear4.filter(a => {
    const status = getPathStatus(a, "year3");
    return status !== "not-reached";
  }).length;
  const reachedYear4InEligible = eligibleForYear4.filter(a => {
    const status = getPathStatus(a, "year4");
    return status !== "not-reached";
  }).length;
  const year3Dropouts = reachedYear3InY4Eligible - reachedYear4InEligible;
  
  // Year 4 dropouts - only count cohorts that have had time to graduate (2021 and earlier)
  const eligibleForGraduation = filteredAlumni.filter(a => a.cohortYear <= currentYear - 4);
  const reachedYear4InGradEligible = eligibleForGraduation.filter(a => {
    const status = getPathStatus(a, "year4");
    return status !== "not-reached";
  }).length;
  const graduatedInEligible = eligibleForGraduation.filter(a => {
    const status = getPathStatus(a, "graduation");
    return status !== "not-reached";
  }).length;
  const year4Dropouts = reachedYear4InGradEligible - graduatedInEligible;
  
  // Graduation dropouts - only count cohorts that have had time to find employment (2020 and earlier)
  const eligibleForEmployment = filteredAlumni.filter(a => a.cohortYear <= currentYear - 5);
  const graduatedInEmpEligible = eligibleForEmployment.filter(a => {
    const status = getPathStatus(a, "graduation");
    return status !== "not-reached";
  }).length;
  const employedInEligible = eligibleForEmployment.filter(a => {
    const status = getPathStatus(a, "employment");
    return status !== "not-reached";
  }).length;
  const gradDropouts = graduatedInEmpEligible - employedInEligible;
  
  // Salary dropouts - only count employed who have had time to reach median salary
  const employedInSalaryEligible = eligibleForEmployment.filter(a => {
    const status = getPathStatus(a, "employment");
    return status !== "not-reached";
  }).length;
  const aboveMedianInEligible = eligibleForEmployment.filter(a => {
    const status = getPathStatus(a, "salary");
    return status !== "not-reached";
  }).length;
  const salaryDropouts = employedInSalaryEligible - aboveMedianInEligible;

  // Ensure no negative dropout counts
  const correctedYear1Dropouts = Math.max(0, year1Dropouts);
  const correctedYear2Dropouts = Math.max(0, year2Dropouts);
  const correctedYear3Dropouts = Math.max(0, year3Dropouts);
  const correctedYear4Dropouts = Math.max(0, year4Dropouts);
  const correctedGradDropouts = Math.max(0, gradDropouts);
  const correctedSalaryDropouts = Math.max(0, salaryDropouts);

  // Structure data for responsive funnels
  type Stage = { label: string; count: number };

  const successStages: Stage[] = [
    { label: "HS Graduates", count: totalGraduates },
    { label: "College / Training Year 1", count: year1 },
    { label: "Year 2", count: year2 },
    { label: "Year 3", count: year3 },
    { label: "Year 4", count: year4 },
    { label: "Graduation", count: graduated },
    { label: "Employment", count: employed },
    { label: "> Nat'l Median Salary", count: aboveMedianSalary },
  ];

  const attritionStages: Stage[] = [
    { label: "Never Enrolled", count: neverEnrolled },
    { label: "College Year 1 Dropouts", count: correctedYear1Dropouts },
    { label: "College Year 2 Dropouts", count: correctedYear2Dropouts },
    { label: "College Year 3 Dropouts", count: correctedYear3Dropouts },
    { label: "College Year 4 Dropouts", count: correctedYear4Dropouts },
    { label: "Grad Dropouts", count: correctedGradDropouts },
    { label: "< Nat'l Median Salary", count: correctedSalaryDropouts },
  ];

  // Convert to Recharts format
  const successData = successStages.map((s, i) => ({
    value: s.count,
    name: s.label,
    fill: `hsl(152, 85%, ${65 - i * 5}%)`,
  }));

  const attritionData = attritionStages.map((s, i) => ({
    value: s.count,
    name: s.label,
    fill: `hsl(0, 85%, ${45 + i * 5}%)`,
  }));

  return (
    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl p-8 shadow-xl border border-green-100" ref={funnelsRef}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-green-600 rounded-2xl p-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Economic Liberation</h2>
            </div>
          </div>
          
          {/* Cohort Filter and Copy Button */}
          <div className="flex items-center space-x-2">
            <Select value={selectedCohort} onValueChange={setSelectedCohort}>
              <SelectTrigger className="w-40 h-8 text-sm border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map(year => (
                  <SelectItem key={year} value={String(year ?? 'all')}>
                    Class of {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CopyToImageButton 
              elementRef={funnelsRef} 
              filename={`economic-liberation-${activeView}`}
              className="data-html2canvas-ignore"
            />
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-green-100">
        {/* Pill Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('overall')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'overall' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overall Status
          </button>
          <button
            onClick={() => setActiveView('success')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'success' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Success Funnel
          </button>
          <button
            onClick={() => setActiveView('attrition')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'attrition' 
                ? 'bg-white text-red-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Attrition Funnel
          </button>
        </div>

        {/* View Content */}
        <div className="min-h-[450px] flex items-center justify-center">
          {/* Overall Status View - Only Donut Chart */}
          {activeView === 'overall' ? (
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">Overall Status</h3>
                <div className="relative w-64 h-64 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {/* Calculate percentages and angles */}
                    {(() => {
                      const total = onTrack + nearTrack + offTrack + unknown;
                      if (total === 0) return <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />;
                      
                      const onTrackPercent = (onTrack / total) * 100;
                      const nearTrackPercent = (nearTrack / total) * 100;
                      const offTrackPercent = (offTrack / total) * 100;
                      const unknownPercent = (unknown / total) * 100;
                      
                      let cumulativePercent = 0;
                      const radius = 40;
                      const circumference = 2 * Math.PI * radius;
                      
                      return (
                        <>
                          {/* On Track */}
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="12"
                            strokeDasharray={`${(onTrackPercent / 100) * circumference} ${circumference}`}
                            strokeDashoffset={-cumulativePercent / 100 * circumference}
                            strokeLinecap="round"
                          />
                          {/* Near Track */}
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="#eab308"
                            strokeWidth="12"
                            strokeDasharray={`${(nearTrackPercent / 100) * circumference} ${circumference}`}
                            strokeDashoffset={-((cumulativePercent += onTrackPercent) / 100) * circumference}
                            strokeLinecap="round"
                          />
                          {/* Off Track */}
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="12"
                            strokeDasharray={`${(offTrackPercent / 100) * circumference} ${circumference}`}
                            strokeDashoffset={-((cumulativePercent += nearTrackPercent) / 100) * circumference}
                            strokeLinecap="round"
                          />
                          {/* Unknown */}
                          {unknownPercent > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#9ca3af"
                              strokeWidth="12"
                              strokeDasharray={`${(unknownPercent / 100) * circumference} ${circumference}`}
                              strokeDashoffset={-((cumulativePercent += offTrackPercent) / 100) * circumference}
                              strokeLinecap="round"
                            />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">On Track</div>
                      <div className="text-xl text-gray-600">{filteredAlumni.length > 0 ? Math.round((onTrack / filteredAlumni.length) * 100) : 0}%</div>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between cursor-pointer hover:bg-green-50 p-2 rounded-lg transition-colors" onClick={() => handleLiberationClick('true')}>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">On Track</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{onTrack}</span>
                  </div>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-yellow-50 p-2 rounded-lg transition-colors" onClick={() => handleLiberationClick('near')}>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Near Track</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{nearTrack}</span>
                  </div>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-red-50 p-2 rounded-lg transition-colors" onClick={() => handleLiberationClick('false')}>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Off Track</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{offTrack}</span>
                  </div>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors" onClick={() => handleLiberationClick('unknown')}>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">Unknown</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{unknown}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Success Funnel View */}
          {activeView === 'success' ? (
            <div className="flex justify-center">
              <FunnelGraphComponent 
                data={successStages.map(stage => ({ label: stage.label, value: stage.count }))}
                title="Success Funnel"
                inverted={false}
                onStageClick={(stageName) => {
                  if (stageName === "> Nat'l Median Salary") {
                    setShowSalaryModal(true);
                  } else {
                    // Navigate to Alumni page showing students who REACHED this stage
                    const params = new URLSearchParams();
                    
                    // Add cohort filter if selected
                    if (selectedCohort !== "all") {
                      params.set('cohortYear', selectedCohort);
                    }
                    
                    // Map success stage to appropriate filter
                    switch (stageName) {
                      case 'HS Graduates':
                        // Show all alumni - no additional filter needed
                        break;
                      case 'College / Training Year 1':
                        params.set('currentStage', 'Year 1,Year 2,Year 3,Year 4,Year 5+,Graduated,Employed');
                        break;
                      case 'Year 2':
                        params.set('currentStage', 'Year 2,Year 3,Year 4,Year 5+,Graduated,Employed');
                        break;
                      case 'Year 3':
                        params.set('currentStage', 'Year 3,Year 4,Year 5+,Graduated,Employed');
                        break;
                      case 'Year 4':
                        params.set('currentStage', 'Year 4,Year 5+,Graduated,Employed');
                        break;
                      case 'Graduated':
                        params.set('currentStage', 'Graduated,Employed');
                        break;
                      case 'Employed':
                        params.set('employed', 'true');
                        break;
                    }
                    
                    setLocation(`/alumni${params.toString() ? `?${params.toString()}` : ''}`);
                  }
                }}
              />
            </div>
          ) : null}

          {/* Attrition Funnel View */}
          {activeView === 'attrition' ? (
            <div className="flex justify-center">
              <FunnelGraphComponent 
                data={attritionStages.map(stage => ({ label: stage.label, value: stage.count }))}
                title="Attrition Funnel"
                inverted={false}
                isRed={true}
                onStageClick={(stageName) => {
                  // Map stage names to attrition types and navigate to Alumni page
                  let attritionType = 'all';
                  switch (stageName) {
                    case 'Never Enrolled':
                      attritionType = 'never-enrolled';
                      break;
                    case 'College Year 1 Dropouts':
                      attritionType = 'year1-dropouts';
                      break;
                    case 'College Year 2 Dropouts':
                      attritionType = 'year2-dropouts';
                      break;
                    case 'College Year 3 Dropouts':
                      attritionType = 'year3-dropouts';
                      break;
                    case 'College Year 4 Dropouts':
                      attritionType = 'year4-dropouts';
                      break;
                    case 'Grad Dropouts':
                      attritionType = 'grad-dropouts';
                      break;
                    case "< Nat'l Median Salary":
                      attritionType = 'below-median-salary';
                      break;
                    default:
                      attritionType = 'all';
                  }
                  
                  // Navigate to Alumni page with attrition filter
                  const params = new URLSearchParams();
                  if (attritionType !== 'all') {
                    params.set('attritionType', attritionType);
                  }
                  if (selectedCohort !== "all") {
                    params.set('cohortYear', selectedCohort);
                  }
                  
                  setLocation(`/alumni${params.toString() ? `?${params.toString()}` : ''}`);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Salary Comparison Modal */}
      {showSalaryModal && (
        <Dialog open={showSalaryModal} onOpenChange={setShowSalaryModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                <span>Salary Comparison Analysis</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{aboveMedianSalary}</div>
                  <div className="text-sm text-green-600">Above Median Salary</div>
                  <div className="text-xs text-gray-500">≥ ${nationalMedianIncome.toLocaleString()}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{employed - aboveMedianSalary}</div>
                  <div className="text-sm text-red-600">Below Median Salary</div>
                  <div className="text-xs text-gray-500">&lt; ${nationalMedianIncome.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-700">{employedMissingSalaryData.length}</div>
                  <div className="text-sm text-gray-600">Missing Salary Data</div>
                  <div className="text-xs text-gray-500">Not consented or recorded</div>
                </div>
              </div>

              {/* National Median Context */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">National Median Income Context</h3>
                <p className="text-blue-700 text-sm">
                  The current national median household income is <strong>${nationalMedianIncome.toLocaleString()}</strong>.
                  This benchmark helps measure economic success and upward mobility for our alumni.
                </p>
                {settings?.lastMedianIncomeUpdate && (
                  <p className="text-blue-600 text-xs mt-2">
                    Last updated: {new Date(settings.lastMedianIncomeUpdate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Alumni with Salary Data */}
              {employedWithSalaryData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Alumni with Salary Data ({employedWithSalaryData.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {employedWithSalaryData.map((alumni) => (
                      <div 
                        key={alumni.id} 
                        className={`p-3 rounded-lg border ${
                          alumni.currentSalary! >= nationalMedianIncome 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {alumni.firstName} {alumni.lastName}
                            </div>
                            <div className="text-sm text-gray-600">Class of {alumni.cohortYear}</div>
                            {alumni.employerName && (
                              <div className="text-xs text-gray-500">{alumni.employerName}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${
                              alumni.currentSalary! >= nationalMedianIncome 
                                ? 'text-green-700' 
                                : 'text-red-700'
                            }`}>
                              ${alumni.currentSalary!.toLocaleString()}
                            </div>
                            {alumni.salaryLastUpdated && (
                              <div className="text-xs text-gray-500">
                                Updated {new Date(alumni.salaryLastUpdated).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Salary Data */}
              {employedMissingSalaryData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Employed Alumni Missing Salary Data ({employedMissingSalaryData.length})</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      These alumni are employed but haven't provided salary information or haven't consented to salary tracking:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {employedMissingSalaryData.map((alumni) => (
                        <div key={alumni.id} className="text-sm text-gray-700">
                          {alumni.firstName} {alumni.lastName} ({alumni.cohortYear})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function GeoPinMap() {
  const [mapData, setMapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'us' | 'world'>('us');
  const [mapAggregationMode, setMapAggregationMode] = useState<'individuals' | 'states'>('individuals');
  const [stats, setStats] = useState({ total: 0, mapped: 0, unmapped: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 🔍 Use the same source as the modal for unmapped count
  const { data: unmappedSummary } = useQuery({
    queryKey: ['/api/unmapped-analysis'],
    queryFn: async () => {
      const res = await fetch('/api/unmapped-analysis', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch unmapped analysis');
      return res.json(); // { total, categories, allStudents }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // 🔥 PERFORMANCE FIX: Use React Query for cache sharing with Alumni page
  const { data: alumniLocationsData, isLoading: isMapLoading } = useQuery({
    queryKey: ['/api/alumni-locations'], // Same cache key as Alumni page!
    queryFn: async () => {
      const response = await fetch('/api/alumni-locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📍 ANALYTICS MAP DATA (FRESH):', {
        total: data.length,
        mapped: data.filter((a: any) => a.hasLocation).length,
        unmapped: data.filter((a: any) => !a.hasLocation).length,
        sampleWithLocation: data.filter((a: any) => a.hasLocation).slice(0, 3).map((a: any) => ({
          name: `${a.firstName} ${a.lastName}`,
          college: a.college,
          lat: a.latitude,
          lng: a.longitude
        }))
      });
      
      return data;
    },
    staleTime: 0, // 🔧 Force fresh data
    gcTime: 15 * 60 * 1000, // Keep in memory longer
  });

  // Update mapData when query data changes
  useEffect(() => {
    if (alumniLocationsData) {
      setMapData(alumniLocationsData);
      setStats({
        total: alumniLocationsData.length,
        mapped: alumniLocationsData.filter((person: any) => person.hasLocation).length,
        unmapped: alumniLocationsData.filter((person: any) => !person.hasLocation).length
      });
      setIsLoading(false);
    } else if (!isMapLoading) {
      setMapData([]);
      setStats({ total: 0, mapped: 0, unmapped: 0 });
      setIsLoading(false);
    }
  }, [alumniLocationsData, isMapLoading]);

  // Use authoritative backend count, falling back to client calculation
  const displayUnmapped = unmappedSummary?.total ?? stats.unmapped;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 shadow-xl border border-purple-100" ref={mapRef}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="bg-purple-600 rounded-2xl p-3">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">College Map</h2>
            <p className="text-gray-600 text-sm">
              {stats.mapped} of {stats.total} alumni locations mapped
              {displayUnmapped > 0 && (
                <>
                  {' • '}
                  <button 
                    onClick={() => setModalOpen(true)}
                    className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                  >
                    {displayUnmapped} unmapped students
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Data Mode Dropdown */}
          <Select 
            value={mapAggregationMode} 
            onValueChange={(value: 'individuals' | 'states') => {
              setMapAggregationMode(value);
              // Auto-switch to US view when states mode is selected
              if (value === 'states' && viewMode === 'world') {
                setViewMode('us');
              }
            }}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individuals">Individuals</SelectItem>
              <SelectItem value="states">States</SelectItem>
            </SelectContent>
          </Select>
          
          {/* View Mode Dropdown */}
          <Select 
            value={viewMode} 
            onValueChange={(value: 'us' | 'world') => setViewMode(value)}
            disabled={mapAggregationMode === 'states'}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">US</SelectItem>
              <SelectItem value="world" disabled={mapAggregationMode === 'states'}>World</SelectItem>
            </SelectContent>
          </Select>
          <CopyToImageButton 
            elementRef={mapRef} 
            filename={`geographic-distribution-${viewMode}`}
            className="data-html2canvas-ignore"
          />
        </div>
      </div>
      
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-300 border-t-purple-600 mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-gray-700">Loading map data...</p>
          </div>
        ) : (
          <AlumniMapSelector data={mapData} viewMode={viewMode} mapAggregationMode={mapAggregationMode} />
        )}
      </div>
      
      <PendingResolutionModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

export default function Analytics() {
  // Temporarily use mock data for testing hover effects
  const mockAlumni = [
    { id: 1, name: 'John Doe', class: 2022, track: 'CS', status: 'Employed' },
    { id: 2, name: 'Jane Smith', class: 2023, track: 'Design', status: 'Continuing Education' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="space-y-8">
        <GradRadarBrandCard />
        <GeoPinMap />
        <ContactStatusHeatMap />
        <TwinFunnels />
      </div>
      
      {/* Floating Reports Panel */}
      <FloatingReportsPanel data={mockAlumni} />
    </div>
  );
}