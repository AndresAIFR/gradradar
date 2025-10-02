// Adapter to switch between server API and client-side college service
// This allows safe A/B testing and atomic switching

import { searchCollegesClient, checkStandardizedCollegesClient } from './clientCollegeService';

// Feature flag - set to true to use client-side, false to use server API
// TODO: Change to true after testing shows client-side service works correctly
const USE_CLIENT_SIDE_COLLEGES = true; // Testing client-side mode

// Types for consistency
export interface CollegeSearchResult {
  results: string[];
  source: 'server' | 'client';
}

export interface CollegeMappingResult {
  mappings: Record<string, string | null>;
  source: 'server' | 'client';
}

export interface CollegeMatch {
  standardName: string;
  latitude?: number;
  longitude?: number;
}

// Adapter for college search (replaces /api/all-colleges)
export async function searchColleges(query: string): Promise<string[]> {
  if (USE_CLIENT_SIDE_COLLEGES) {
    // Use client-side service
    
    const startTime = performance.now();
    const results = await searchCollegesClient(query);
    const endTime = performance.now();
    
    return results;
  } else {
    // Use existing server API
    
    const startTime = performance.now();
    const response = await fetch(`/api/all-colleges?search=${encodeURIComponent(query)}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to search colleges');
    }
    
    const results = await response.json();
    const endTime = performance.now();
    
    return results;
  }
}

// Adapter for college mapping (replaces /api/check-standardized-colleges)
export async function checkStandardizedColleges(collegeNames: string[]): Promise<Record<string, CollegeMatch | null>> {
  if (USE_CLIENT_SIDE_COLLEGES) {
    // Use client-side service
    
    const startTime = performance.now();
    const results = await checkStandardizedCollegesClient(collegeNames);
    const endTime = performance.now();
    
    return results;
  } else {
    // Use existing server API
    
    const startTime = performance.now();
    const response = await fetch('/api/check-standardized-colleges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collegeNames })
    });
    
    if (!response.ok) {
      throw new Error('Failed to check standardized colleges');
    }
    
    const results = await response.json();
    const endTime = performance.now();
    
    // Convert server response to new format (server only returns names)
    const convertedResults: Record<string, CollegeMatch | null> = {};
    Object.entries(results).forEach(([key, value]) => {
      if (value) {
        convertedResults[key] = { standardName: value as string };
      } else {
        convertedResults[key] = null;
      }
    });
    
    return convertedResults;
  }
}

// Function to enable client-side mode (for testing)
export function enableClientSideColleges() {
  
  // We can't modify the const at runtime, but we can create a version that allows this
  // For now, this is a placeholder for the atomic switch
}

// Function to check which mode we're in
export function getCollegeServiceMode(): 'server' | 'client' {
  return USE_CLIENT_SIDE_COLLEGES ? 'client' : 'server';
}