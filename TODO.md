# GradRadar - TODO List

## Current Implementation - Smart Contact Queue

### Contact Queue Page Implementation Plan

**Three-panel layout:**
- **Left Panel** (25%): Task queue list
- **Middle Panel** (35%): Contact workspace with note form  
- **Right Panel** (40%): Alumni detail view

**Component Architecture:**
```
/client/src/pages/ContactQueue.tsx           // Main page
/client/src/components/ContactQueueItem.tsx  // Individual queue item
/client/src/components/ContactWorkspace.tsx  // Middle panel workspace
/client/src/utils/contactQueueAlgorithm.ts   // Priority sorting logic
```

**Reused Components:**
- `AlumniDetail.tsx` (right panel, width-adjusted)
- `InlineNoteForm.tsx` (middle panel)
- `InteractionCard.tsx` (recent notes display)

**Priority Algorithm (Final Version):**
1. **Hard Gates:** DNC, Snoozed, Cooldown
2. **Due Gate:** High/Normal/Low only when due; Urgent always due
3. **Priority Stack:**
   - Pinned & Due → Fix Info → Manual Follow-ups (Urgent→High→Normal→Low) → Contact Slip → Track Slip → First Touch
4. **Sort Keys:** Overdue ↓, Since-last ↓, Risk ↓, A→Z

**Implementation Steps:**
1. Fix/improve note components first for reusability
2. Create basic page structure and algorithm
3. Integrate existing components with width adjustments
4. Add complete/snooze/skip actions

## Major UI/UX Redesign Ideas

### Dashboard-First Approach
**Philosophy**: Transform from "student list with features" to "business intelligence platform for tutors"

**Main Dashboard Structure**:
- **Today's Focus Section**
  - Today's Sessions (live cards with quick-access session notes)
  - Action Items (overdue homework, students needing follow-up, pending parent responses)
  - Quick Stats (weekly revenue, active students, average score improvements)

- **Performance Overview Section**
  - Business Health Dashboard (MRR, retention rates, session completion)
  - Student Progress Heat Map (visual grid with color-coded progress indicators)
  - Trending Insights ("Emma's SAT up 150 points", "3 students ready for real exams")

- **Recent Activity Section**
  - Session Notes Feed (recent sessions with quick preview/editing)
  - Communication Queue (pending emails, text confirmations, follow-ups)
  - Upcoming Deadlines (test dates, homework due dates, payments)

**Secondary Dashboards**:
- Student Overview Dashboard (smart cards with priority sorting, quick actions)
- Analytics Dashboard (revenue trends, teaching effectiveness, success patterns)
- Communications Dashboard (parent relationship health, message templates, feedback)

**Key UX Principles**:
- Contextual Intelligence (adapts based on time/day/events)
- One-Click Actions (start notes, send updates, schedule - all from dashboard)
- Progressive Disclosure (overview → details → editing)
- Proactive Insights (plateau warnings, response tracking, scheduling gaps)

**Mental Model Shift**: From "I have students to manage" to "I run a tutoring business to optimize"

## Deferred Features (Nice-to-Have)

### 📊 Floating Reports Panel (Hidden August 13, 2025)
- [ ] **Re-enable FloatingReportsPanel component**
  - Currently hidden with `{false &&}` wrapper in FloatingReportsPanel.tsx
  - Full floating action button with reports generation functionality
  - Includes CSV/Excel/PDF export, report templates, and advanced options
  - **Note**: Feature is complete but hidden per user request until needed

### 🤖 AI Integration
- [ ] **Auto-log button**: Call OpenAI API to draft parent-friendly session recap
  - Integrate with OpenAI API to generate professional session summaries
  - Button in session notes to "Generate AI Summary"
  - Use session content to create parent-appropriate language

### 📧 Email Features
- [ ] **Email recap endpoint** (`/api/email/recap`) using Resend
  - Send weekly/monthly progress reports to parents
  - Include mock score improvements, session highlights, and upcoming goals
  - Automated scheduling system

### 👨‍🎓 Student Self-Service
- [ ] **Study-hours self-log form** under student role
  - Allow students to log their own study time
  - Simple form with activity type, duration, and optional notes
  - Dashboard view for students to track their own progress

### 💬 Communication Features
- [ ] **Testimonial request modal** (manual trigger)
  - Easy way to request testimonials from satisfied parents
  - Template generation with student progress highlights
  - Integration with email system

### 📊 Advanced Analytics
- [ ] **Progress trend analysis**
  - Predict score improvements based on study patterns
  - Identify optimal study schedules for each student
  - Alert system for students falling behind targets

### 🔐 Enhanced Security
- [ ] **Role-based permissions refinement**
  - Granular permissions for different tutor levels
  - Parent portal with limited student data access
  - Student portal with homework and resource access

### 🎯 Test Prep Enhancements
- [ ] **Mock test scheduling system**
  - Calendar integration for test dates
  - Automated reminders for upcoming tests
  - Score tracking with detailed breakdowns by section

### 📱 Mobile Optimization
- [ ] **Mobile app considerations**
  - Progressive Web App (PWA) setup
  - Mobile-optimized session note entry
  - Push notifications for important updates

### 🔄 Workflow Automation
- [ ] **Automated homework reminders**
  - Email/SMS reminders for overdue assignments
  - Parent notifications for completed homework
  - Integration with calendar systems

### 📈 Reporting System
- [ ] **Comprehensive reporting dashboard**
  - Monthly progress reports
  - Parent-friendly summaries
  - Billing integration for session hours

## Implementation Priority

1. **High Priority**: AI session summaries (significant time-saver)
2. **Medium Priority**: Email system and student self-logging
3. **Low Priority**: Advanced analytics and mobile optimization

## SessionLogCard Feature Parity (July 2025)

**Goal**: Add all EditSessionModal features to SessionLogCard to enable deprecation of the old modal.

### Core Features Missing:
- [ ] **Delete Session Functionality**
  - Delete button with confirmation dialog
  - deleteSessionMutation with proper API calls
  - Cache invalidation after deletion

- [ ] **Email/SMS Sending Capabilities**
  - handleSendEmail() and handleSendText() functions
  - Email/SMS confirmation dialogs (SessionConfirmationDialogs)
  - API calls to /api/send-email and SMS endpoints
  - Notification tracking with sentNotifications state

- [ ] **Advanced Form Features**
  - Tags field (comma-separated input)
  - Show/hide toggles for Company Notes and Private Notes sections
  - Two-column layout for Overview/Company Notes vs Strengths & Weaknesses/Private Notes

- [ ] **AI Summary Management**
  - Lock/unlock buttons for preventing AI regeneration
  - Copy buttons for each summary tab
  - Send buttons (Email, Text, Company Summary)
  - Notification badges showing when summaries were sent
  - Integration with SessionSummaryTabs component

- [x] **Edit Mode Support** ✅ **COMPLETED July 7, 2025**
  - Support for editing existing sessions (vs. only creating new ones)
  - Pre-population of form fields from existing session data
  - Different button text and behavior for Add vs Edit modes

- [ ] **Session Management**
  - Proper mutation handling with React Query
  - Cache invalidation for multiple query keys
  - Error handling and loading states
  - Success/error toast notifications

- [ ] **Parent Communication Preferences**
  - Auto-selecting preferred communication tab based on student.parentPreferredCommunication
  - Smart defaulting to email or text based on parent preferences

- [ ] **Advanced UI Components**
  - Professional modal header with student/parent names
  - Action button layout (Cancel, Save, Save & Close)
  - Lock/unlock visual indicators

## Critical Bugs

- [ ] **Logan University Processing Issue** - Client-side college mapping stops processing partway through alphabetically after "NEW YORK UNIVERSITY", causing Logan University to never reach mapping logic despite existing in both CSV and IPEDS data. Root cause: Processing halt appears to be client-side synchronous processing issue, not API limits or data availability.

## Technical Debt

- [ ] Add comprehensive error boundaries
- [ ] Implement proper loading states for all async operations
- [ ] Add unit tests for critical business logic
- [ ] Optimize database queries with proper indexing
- [ ] Add API rate limiting and security headers
- [ ] Implement proper logging and monitoring

## Configuration Needed

- OpenAI API key for AI features
- Resend API key for email functionality
- SMS provider setup for notifications
- Calendar integration (Google Calendar, Outlook)
