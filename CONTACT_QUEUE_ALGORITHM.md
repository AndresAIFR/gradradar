# Contact Queue Algorithm - Plain English Guide

*A 12-year-old should be able to follow this logic*

## What This System Does
The Contact Queue automatically creates a prioritized list of alumni who need attention. Think of it like a smart to-do list that puts the most important contacts at the top.

**Recent Enhancements**: Now includes flowchart-based logic for smarter contact outcome tracking, flexible snooze options, and a 100-day safety net to prevent anyone from falling through the cracks.

## The 4-Level Priority System

### Level 1: Manual Follow-ups (Highest Priority)
**What it is**: Alumni you specifically flagged to contact on certain dates.

**The Rule**:
- **Urgent contacts**: Always show at the very top (these are emergencies)
- **High/Normal/Low contacts**: Only show when their scheduled date arrives
- **Sort order**: Urgent → High → Normal → Low

**Special Case - 100-Day Safety Net (Priority 1050)**: Previously contacted alumni who haven't been reached in 100+ days get automatic top priority but appear as "contact-slip" category to correctly identify them as severe contact issues.

**Example**: If you marked Sarah as "High Priority - follow up March 15th" and today is March 15th, she appears in Level 1.

### Level 2: Contact Slip (Second Priority) 
**What it is**: Alumni you used to talk to regularly, but haven't contacted lately.

**The Rule**: Show alumni who are "slipping away" in order of urgency:
1. **Recent → Moderate**: Talked 0-7 days ago, now it's been 8-21 days (catching them early)
2. **Moderate → Distant**: Talked 8-21 days ago, now it's been 22+ days (getting worse)  
3. **Distant → Stale**: Talked 22+ days ago, now it's been 46+ days (almost lost)

**Example**: You talked to Mike 10 days ago (was "Recent"), but now it's been 25 days (he's "Distant"). This is a slip from Recent → Distant.

### Level 3: Track Slip (Third Priority)
**What it is**: Alumni whose success status is getting worse.

**The Rule**: Show alumni whose tracking status dropped:
1. **On-track → Near-track**: Were doing well, now struggling (needs help staying on course)
2. **Near-track → Off-track**: Were struggling, now failing (damage likely done, but try anyway)

**Example**: Jessica was "On-track" last month but now shows "Near-track" - she needs support before things get worse.

### Level 4: First Touch (Lowest Priority)
**What it is**: Alumni you've never contacted before.

**The Rule**: Show new alumni by who's easiest to help:

**First, by support needs**:
1. **Medium support**: Not too easy, not too hard (most actionable)
2. **High support**: Might be overwhelming to help
3. **Low support**: Probably doing fine without you

**Then within each support level, by school status**:
1. **In school**: Easiest to help (structured environment)
2. **Vocational training**: Moderate difficulty  
3. **No school**: Hardest to help (no structure)

**Example**: Among "Medium support" alumni, contact those "In school" before those with "No school".

## How The Queue Works

### What You See
A list of alumni names in priority order. The algorithm automatically:
1. Puts Level 1 alumni at the top
2. Then Level 2 alumni  
3. Then Level 3 alumni
4. Then Level 4 alumni at the bottom

### Within Each Level
Alumni are sorted by:
1. **Overdue first**: If someone was supposed to be contacted yesterday, they come before someone due today
2. **Longest time since last contact**: If two people are both overdue, the one you haven't talked to longer comes first
3. **Highest risk first**: People more likely to fall through the cracks come first
4. **Alphabetical by name**: If everything else is equal, sort A to Z

## Enhanced Contact Logic (NEW)

### Smart Contact Outcome Tracking
The system now tracks whether contact attempts were successful:
- **Successful Contact** (connected=true): Gets longer cooldown period (7 days)
- **Failed Contact** (connected=false): Gets shorter cooldown, higher priority for retry (3→5 days)
- **Recent Failed Attempts**: Get immediate priority boost for quick retry

### 100-Day Safety Net
Anyone who was previously contacted but hasn't been reached in 100+ days automatically gets bumped to top priority (1050) and categorized as "contact-slip". This prevents alumni from disappearing forever while correctly identifying them as severe contact issues rather than user-flagged items.

### Flexible Snooze Options
Instead of fixed 1-day snooze, users can now select:
- 1 day (quick delay)
- 3 days (short break)
- 5 days (medium break)  
- 10 days (longer break)
- 30 days (extended break)

## Special Rules

### Hard Gates (Never Show)
Some alumni never appear in the queue:
- **Do Not Contact (DNC)**: They asked not to be contacted
- **Snoozed**: You selected a snooze duration (1-30 days)
- **On Dynamic Cooldown**: Recently contacted with smart timing:
  - Successful contact: 7 days cooldown
  - Failed first attempt: 5 days cooldown  
  - Other attempts: 3 days cooldown

### Manual Overrides & System Safety Nets
- **Pinned**: You can manually pin someone to the top of Level 1
- **Snoozed**: You can temporarily remove someone from the queue (1, 3, 5, 10, or 30 days)
- **100-Day Safety Net**: Previously contacted alumni not reached in 100+ days get automatic top priority (1050) and appear as "contact-slip" category

## Example Queue Output

```
📌 PINNED
1. Sarah Johnson (Pinned by user)

🚨 MANUAL FOLLOW-UPS  
2. Mike Chen (Urgent - flagged yesterday)
3. Emma Davis (High - due today)

📉 CONTACT SLIPS
3. Linda Chen (⚠️ 100+ day safety net - needs immediate review)
4. Jessica Wong (Recent → Distant, 25 days since contact)
5. Alex Rivera (Moderate → Stale, 50 days since contact)

📊 TRACK SLIPS  
6. David Kim (On-track → Near-track)
7. Lisa Martinez (Near-track → Off-track)

👋 FIRST TOUCH
8. Ryan Thompson (Medium support, In school)
9. Maya Patel (Medium support, Vocational)
10. Carlos Rodriguez (High support, In school)
```

## Key Principles

1. **Time-Aware**: The system knows what day it is and adjusts priorities accordingly
2. **Relationship-Focused**: Prioritizes maintaining existing relationships over starting new ones
3. **Actionable**: Puts the most "doable" contacts at the top
4. **Forgiving**: Gives you manual controls (pin, snooze, skip) when the algorithm isn't perfect

This system ensures you never miss important follow-ups and always work on the most impactful contacts first.