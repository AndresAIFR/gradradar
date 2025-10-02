import type { Alumni } from "@shared/schema";

// Calculate the most recent contact date for an alumni
export function calculateLastContactDate(alumni: Alumni, interactions: any[] = []): Date | null {
  // 1. Check for most recent successful interaction (where studentResponded = true)
  if (interactions && interactions.length > 0) {
    const successfulInteractions = interactions
      .filter(interaction => interaction.date && interaction.studentResponded === true) // Only successful connections
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (successfulInteractions.length > 0) {
      const date = new Date(successfulInteractions[0].date);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  // 2. Check manually entered lastContactDate (from inline editing or populated from interactions)
  if (alumni.lastContactDate) {
    const date = new Date(alumni.lastContactDate);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Check connectedAsOf date from CSV import (if alumni had "Yes" in that column)
  if (alumni.connectedAsOf) {
    const date = new Date(alumni.connectedAsOf);
    if (!isNaN(date.getTime())) return date;
  }

  // 4. Fallback to graduation date (June 1st + cohort year)
  if (alumni.cohortYear) {
    const date = new Date(alumni.cohortYear, 5, 1); // June 1st (month 5 = June in 0-indexed)
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// Calculate days since last contact
export function getDaysSinceLastContact(lastContactDate: Date | null): number | null {
  if (!lastContactDate) return null;
  
  const now = new Date();
  const diffTime = now.getTime() - lastContactDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Get avatar ring class based on contact recency
export function getContactRecencyRingClass(lastContactDate: Date | null, size: 'small' | 'large' = 'small'): string {
  const days = getDaysSinceLastContact(lastContactDate);
  
  if (days === null) {
    return size === 'small' ? 'ring-4 ring-gray-400' : 'ring-6 ring-gray-400';
  }

  const ringSize = size === 'small' ? 'ring-4' : 'ring-6';

  if (days <= 30) {
    return `${ringSize} ring-green-500`; // 0-30 days = green
  } else if (days <= 90) {
    return `${ringSize} ring-yellow-500`; // 31-90 days = yellow
  } else if (days <= 180) {
    return `${ringSize} ring-orange-500`; // 91-180 days = orange
  } else {
    return `${ringSize} ring-red-500`; // 180+ days = red
  }
}

// Get tooltip text for contact recency
export function getContactRecencyTooltip(lastContactDate: Date | null): string {
  const days = getDaysSinceLastContact(lastContactDate);
  
  if (days === null) {
    return 'No contact recorded';
  }

  if (days === 0) {
    return 'Last contact: Today';
  } else if (days === 1) {
    return 'Last contact: Yesterday';
  } else if (days < 7) {
    return `Last contact: ${days} days ago`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Last contact: ${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `Last contact: ${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(days / 365);
    return `Last contact: ${years} year${years > 1 ? 's' : ''} ago`;
  }
}

// Get contact recency status for display
export function getContactRecencyStatus(lastContactDate: Date | null): 'recent' | 'moderate' | 'stale' | 'none' | 'unknown' {
  const days = getDaysSinceLastContact(lastContactDate);
  
  if (days === null) return 'unknown';
  
  if (days <= 30) return 'recent';
  if (days <= 90) return 'moderate';  
  if (days <= 180) return 'stale';
  return 'none';
}