import { format, differenceInDays, parseISO, isAfter } from 'date-fns';

// Import Alumni type from schema
import type { Alumni } from '@shared/schema';

// Extended Alumni type for queue with additional computed fields
export interface QueueAlumni extends Alumni {
  // Latest interaction data for follow-ups
  latestFollowUpPriority: string | null;
  latestFollowUpDate: string | null;
  // Historical tracking status for slip detection
  previousTrackingStatus?: string;
  lastTrackingStatusChange?: string;
  // Contact outcome tracking (from flowchart logic)
  lastContactConnected?: boolean | null;
}

export interface QueueItem {
  alumni: QueueAlumni;
  priority: number;
  priorityLevel: 'birthday' | 'manual-followup' | 'contact-slip' | 'track-slip' | 'first-touch';
  priorityReason: string;
  daysSinceLastContact: number;
  isOverdue: boolean;
  riskScore: number;
}

// Contact recency categories in days
const CONTACT_RECENCY = {
  RECENT: { min: 0, max: 7 },
  MODERATE: { min: 8, max: 21 },
  DISTANT: { min: 22, max: 45 },
  STALE: { min: 46, max: Infinity }
} as const;

/**
 * Calculate contact recency category based on days since last contact
 */
export function calculateContactRecency(daysSinceContact: number): keyof typeof CONTACT_RECENCY {
  if (daysSinceContact <= CONTACT_RECENCY.RECENT.max) return 'RECENT';
  if (daysSinceContact <= CONTACT_RECENCY.MODERATE.max) return 'MODERATE';
  if (daysSinceContact <= CONTACT_RECENCY.DISTANT.max) return 'DISTANT';
  return 'STALE';
}

/**
 * Detect if alumni has had a contact slip (moved to worse recency category)
 * Enhanced with connected/not connected logic from flowchart
 */
export function detectContactSlip(alumni: QueueAlumni): { hasSlipped: boolean; slipType: string | null; urgency: number } {
  if (!alumni.lastContactDate) {
    return { hasSlipped: false, slipType: null, urgency: 0 };
  }

  const daysSince = differenceInDays(new Date(), parseISO(alumni.lastContactDate));
  const currentCategory = calculateContactRecency(daysSince);

  // Enhanced slip logic - factor in contact success (connected field)
  const wasRecentContactUnsuccessful = alumni.lastContactConnected === false && daysSince <= 5;
  
  // Define slip transitions and their urgency (higher = more urgent)
  const slips = {
    'RECENT_TO_MODERATE': { urgency: 3, description: 'Contact frequency declining - reach out soon' },
    'MODERATE_TO_DISTANT': { urgency: 2, description: 'Haven\'t connected in a while - needs outreach' },
    'DISTANT_TO_STALE': { urgency: 1, description: 'Long gap in communication - urgent reconnection needed' },
    'FAILED_CONTACT_BOOST': { urgency: 4, description: 'Recent contact attempt failed - retry needed' }
  };

  // Boost priority for recent failed contact attempts
  if (wasRecentContactUnsuccessful) {
    return { hasSlipped: true, slipType: slips.FAILED_CONTACT_BOOST.description, urgency: slips.FAILED_CONTACT_BOOST.urgency };
  }

  // Standard slip detection based on time categories
  if (currentCategory === 'MODERATE' && daysSince >= CONTACT_RECENCY.MODERATE.min) {
    return { hasSlipped: true, slipType: slips.RECENT_TO_MODERATE.description, urgency: slips.RECENT_TO_MODERATE.urgency };
  }
  if (currentCategory === 'DISTANT' && daysSince >= CONTACT_RECENCY.DISTANT.min) {
    return { hasSlipped: true, slipType: slips.MODERATE_TO_DISTANT.description, urgency: slips.MODERATE_TO_DISTANT.urgency };
  }
  if (currentCategory === 'STALE') {
    return { hasSlipped: true, slipType: slips.DISTANT_TO_STALE.description, urgency: slips.DISTANT_TO_STALE.urgency };
  }

  return { hasSlipped: false, slipType: null, urgency: 0 };
}

/**
 * Detect if alumni has had a tracking status slip
 */
export function detectTrackSlip(alumni: QueueAlumni): { hasSlipped: boolean; slipType: string | null; urgency: number } {
  const currentStatus = alumni.trackingStatus?.toLowerCase();
  
  // Track slip detection (would be better with historical data)
  if (currentStatus === 'near-track') {
    return { 
      hasSlipped: true, 
      slipType: 'Academic progress declining - intervention needed', 
      urgency: 2 
    };
  }
  if (currentStatus === 'off-track') {
    return { 
      hasSlipped: true, 
      slipType: 'Academic progress at risk - immediate support required', 
      urgency: 1 
    };
  }

  return { hasSlipped: false, slipType: null, urgency: 0 };
}

/**
 * Calculate first touch priority based on support needs and school status
 */
export function calculateFirstTouchPriority(alumni: QueueAlumni): { priority: number; reason: string } {
  const supportCategory = alumni.supportCategory?.toLowerCase() || '';
  const isInSchool = alumni.currentlyEnrolled;
  const pathType = alumni.pathType;

  // Support level priority (medium = most actionable)
  let supportPriority = 2; // default medium
  let supportLabel = 'Medium support';
  
  if (supportCategory.includes('high')) {
    supportPriority = 1;
    supportLabel = 'High support';
  } else if (supportCategory.includes('low')) {
    supportPriority = 3;
    supportLabel = 'Low support';
  }

  // School status priority (in school = easiest to help)
  let schoolPriority = 3; // default no school
  let schoolLabel = 'No school';
  
  if (isInSchool) {
    schoolPriority = 1;
    schoolLabel = 'In school';
  } else if (pathType === 'vocation') {
    schoolPriority = 2;
    schoolLabel = 'Vocational training';
  }

  // Combined priority (lower number = higher priority)
  const combinedPriority = supportPriority * 10 + schoolPriority;
  const reason = `${supportLabel}, ${schoolLabel}`;

  return { priority: combinedPriority, reason };
}

/**
 * Check if alumni should be excluded from queue (hard gates)
 */
export function shouldExcludeFromQueue(alumni: QueueAlumni): boolean {
  const today = new Date();

  // Do Not Contact flag
  if (alumni.doNotContact) return true;

  // Birthday overrides snooze, so check birthday first
  if (isBirthday(alumni)) return false;

  // Snoozed until future date
  if (alumni.snoozedUntil && isAfter(parseISO(alumni.snoozedUntil), today)) return true;

  // Skipped until future date (daily skip)
  if (alumni.queueSkippedUntil && isAfter(parseISO(alumni.queueSkippedUntil), today)) return true;

  // Enhanced cooldown logic based on contact outcome (from flowchart)
  if (alumni.lastContactDate) {
    const daysSinceContact = differenceInDays(today, parseISO(alumni.lastContactDate));
    
    // Dynamic cooldown periods based on connection success
    let cooldownDays = 3; // Default
    
    if (alumni.lastContactConnected === true) {
      // Successful contact gets longer cooldown
      cooldownDays = 7;
    } else if (alumni.lastContactConnected === false) {
      // Failed contact gets shorter cooldown, but extend slightly on retry
      cooldownDays = daysSinceContact < 5 ? 5 : 3; // 3->5 days for first retry
    }
    
    if (daysSinceContact < cooldownDays) return true;
  }

  return false;
}

/**
 * Check if follow-up is due based on priority and scheduled date
 */
function isFollowUpDue(priority: string | null, followUpDate: string | null): boolean {
  if (!priority || !followUpDate) return false;

  const today = new Date();
  const dueDate = parseISO(followUpDate);

  // Urgent is always due
  if (priority === 'urgent') return true;

  // Others are due only when scheduled date arrives
  return !isAfter(dueDate, today);
}

/**
 * Check if today is alumni's birthday (month and day match)
 */
function isBirthday(alumni: QueueAlumni): boolean {
  if (!alumni.dateOfBirth) {
    return false;
  }
  
  const today = new Date();
  
  // Parse date safely without timezone issues
  // Expected format: "YYYY-MM-DD" 
  const dobString = alumni.dateOfBirth.toString();
  const [year, month, day] = dobString.split('-').map(num => parseInt(num, 10));
  
  // JavaScript months are 0-indexed, so subtract 1 from month
  const todayMonth = today.getMonth() + 1; // Convert to 1-indexed for comparison
  const todayDate = today.getDate();
  
  const isMatch = todayMonth === month && todayDate === day;
  
  return isMatch;
}

/**
 * Calculate risk score for sorting within priority levels
 */
function calculateRiskScore(alumni: QueueAlumni): number {
  let risk = 0;

  // Higher risk for worse tracking status
  if (alumni.trackingStatus === 'off-track') risk += 30;
  else if (alumni.trackingStatus === 'near-track') risk += 15;

  // Higher risk for longer time since contact
  if (alumni.lastContactDate) {
    const daysSince = differenceInDays(new Date(), parseISO(alumni.lastContactDate));
    risk += Math.min(daysSince, 100); // Cap at 100
  } else {
    risk += 50; // Never contacted
  }

  // Higher risk for certain support categories
  const supportCategory = alumni.supportCategory?.toLowerCase() || '';
  if (supportCategory.includes('high')) risk += 10;

  return risk;
}

/**
 * Generate prioritized contact queue from alumni data
 */
export function generatePriorityQueue(alumniList: QueueAlumni[]): QueueItem[] {
  const today = new Date();
  const queueItems: QueueItem[] = [];

  for (const alumni of alumniList) {
    // Apply hard gates - exclude if true
    if (shouldExcludeFromQueue(alumni)) continue;

    const daysSinceLastContact = alumni.lastContactDate 
      ? differenceInDays(today, parseISO(alumni.lastContactDate))
      : 999; // Never contacted

    const riskScore = calculateRiskScore(alumni);
    
    // Determine priority level and reason
    let priority = 4000; // Default to lowest priority
    let priorityLevel: QueueItem['priorityLevel'] = 'first-touch';
    let priorityReason = 'First contact needed';
    let isOverdue = false;

    // Level 0: Birthday Priority (Top priority - overrides everything including snooze)
    if (isBirthday(alumni)) {
      priority = 0;
      priorityLevel = 'birthday';
      priorityReason = 'Birthday contact needed';
      isOverdue = false;
    }
    // 100-Day Safety Net: Bump anyone who WAS contacted but not in 100+ days (exclude never contacted)
    else if (alumni.lastContactDate && daysSinceLastContact >= 100) {
      priority = 1050; // Just after urgent, before high manual follow-ups
      priorityLevel = 'contact-slip';
      priorityReason = '⚠️ 100+ day safety net - needs immediate review';
      isOverdue = true;
    }
    // Level 1: Manual Follow-ups (Priority 1000-1999)
    else if (alumni.latestFollowUpPriority && alumni.latestFollowUpPriority !== 'none') {
      if (isFollowUpDue(alumni.latestFollowUpPriority, alumni.latestFollowUpDate)) {
        priorityLevel = 'manual-followup';
        
        // Sub-priorities within follow-ups
        if (alumni.latestFollowUpPriority === 'urgent') {
          priority = 1000;
          priorityReason = 'Urgent follow-up';
        } else if (alumni.latestFollowUpPriority === 'high') {
          priority = 1100;
          priorityReason = 'High priority follow-up due';
        } else if (alumni.latestFollowUpPriority === 'normal') {
          priority = 1200;
          priorityReason = 'Normal follow-up due';
        } else if (alumni.latestFollowUpPriority === 'low') {
          priority = 1300;
          priorityReason = 'Low priority follow-up due';
        }

        // Check if overdue
        if (alumni.latestFollowUpDate && isAfter(today, parseISO(alumni.latestFollowUpDate))) {
          isOverdue = true;
          priority -= 50; // Bump up overdue items
        }
      }
    }
    
    // Level 2: Contact Slip (Priority 2000-2999)
    else {
      const contactSlip = detectContactSlip(alumni);
      if (contactSlip.hasSlipped) {
        priority = 2000 + (10 - contactSlip.urgency) * 100; // Higher urgency = lower priority number
        priorityLevel = 'contact-slip';
        priorityReason = contactSlip.slipType || 'Contact slip detected';
      }
      // Level 3: Track Slip (Priority 3000-3999)  
      else {
        const trackSlip = detectTrackSlip(alumni);
        if (trackSlip.hasSlipped) {
          priority = 3000 + (10 - trackSlip.urgency) * 100;
          priorityLevel = 'track-slip';
          priorityReason = trackSlip.slipType || 'Tracking status declining';
        }
        // Level 4: First Touch (Priority 4000+)
        else {
          const firstTouch = calculateFirstTouchPriority(alumni);
          priority = 4000 + firstTouch.priority;
          priorityLevel = 'first-touch';
          priorityReason = `First contact: ${firstTouch.reason}`;
        }
      }
    }

    // Pinned items get highest priority (but birthday is still higher)
    if (alumni.pinned && priorityLevel !== 'birthday') {
      priority = 10;
      priorityReason = `📌 Pinned - ${priorityReason}`;
    }

    queueItems.push({
      alumni,
      priority,
      priorityLevel,
      priorityReason,
      daysSinceLastContact,
      isOverdue,
      riskScore
    });
  }

  // Sort by priority, then by overdue, then by time since contact, then by risk, then alphabetically
  return queueItems.sort((a, b) => {
    // Primary: Priority level
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // Special handling for birthday priority: same day birthdays sorted by age (oldest first), then alphabetical
    if (a.priorityLevel === 'birthday' && b.priorityLevel === 'birthday') {
      // Sort by age (oldest first)
      if (a.alumni.dateOfBirth && b.alumni.dateOfBirth) {
        const ageComparison = new Date(a.alumni.dateOfBirth).getTime() - new Date(b.alumni.dateOfBirth).getTime();
        if (ageComparison !== 0) return ageComparison;
      }
      
      // Then alphabetical by name
      const nameA = `${a.alumni.lastName}, ${a.alumni.firstName}`;
      const nameB = `${b.alumni.lastName}, ${b.alumni.firstName}`;
      return nameA.localeCompare(nameB);
    }
    
    // Secondary: Overdue items first
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    
    // Tertiary: Longer time since contact first
    if (a.daysSinceLastContact !== b.daysSinceLastContact) {
      return b.daysSinceLastContact - a.daysSinceLastContact;
    }
    
    // Quaternary: Higher risk first  
    if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore;
    
    // Final: Alphabetical by name
    const nameA = `${a.alumni.lastName}, ${a.alumni.firstName}`;
    const nameB = `${b.alumni.lastName}, ${b.alumni.firstName}`;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Get priority level display information with Lucide icons and proper styling
 */
export function getPriorityLevelInfo(level: QueueItem['priorityLevel']) {
  const levelInfo = {
    'birthday': {
      label: 'Birthday',
      icon: 'Cake',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      description: 'Birthday contact due'
    },
    'manual-followup': {
      label: 'Manual',
      icon: 'AlertCircle',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      description: 'Scheduled follow-up due'
    },
    'contact-slip': {
      label: 'Contact', 
      icon: 'TrendingDown',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      description: 'Contact status slipped to lower tier'
    },
    'track-slip': {
      label: 'Track',
      icon: 'BarChart3',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      description: 'Track status slipped to lower tier'
    },
    'first-touch': {
      label: '1st Touch',
      icon: 'UserPlus',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      description: 'Make initial contact'
    }
  };

  return levelInfo[level];
}

/**
 * Debug function to explain queue position
 */
export function explainQueuePosition(queueItem: QueueItem): string {
  const { alumni, priority, priorityLevel, priorityReason, daysSinceLastContact, isOverdue } = queueItem;
  
  return `
Alumni: ${alumni.firstName} ${alumni.lastName}
Priority Level: ${priorityLevel} (${priority})
Reason: ${priorityReason}
Days Since Contact: ${daysSinceLastContact}
Overdue: ${isOverdue}
Tracking Status: ${alumni.trackingStatus}
${priorityLevel === 'birthday' ? '🎂 BIRTHDAY TODAY!' : ''}
${alumni.pinned ? '📌 PINNED' : ''}
  `.trim();
}