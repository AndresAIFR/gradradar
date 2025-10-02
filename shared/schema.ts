import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["alumni", "staff", "admin", "super_admin", "developer"]);

// Users table for app users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  fromEmail: varchar("from_email"),
  role: userRoleEnum("role").notNull().default("staff"),
  hashedPassword: text("hashed_password"),
  emailVerified: boolean("email_verified").default(false),
  authMethod: varchar("auth_method").default("email"), // 'email' authentication
  invitedBy: varchar("invited_by"), // Self-reference removed to fix circular dependency
  status: varchar("status").default("active"), // 'active' or 'suspended'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// College locations table for mapping
export const collegeLocations = pgTable("college_locations", {
  id: serial("id").primaryKey(),
  standardName: text("standard_name").notNull(),
  aliases: text("aliases").array().default([]),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  source: text("source").default("scorecard"), // scorecard, geocoded, manual
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unresolved colleges table for admin review
export const unresolvedColleges = pgTable("unresolved_colleges", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  alumniCount: integer("alumni_count").default(1),
  suggestedName: text("suggested_name"),
  suggestedLat: text("suggested_lat"),
  suggestedLon: text("suggested_lon"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alumni table
export const alumni = pgTable("alumni", {
  id: serial("id").primaryKey(),
  
  // Basic Profile (Tab 1)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  cohortYear: integer("cohort_year").notNull(),
  dateOfBirth: date("date_of_birth"),
  profileImageUrl: text("profile_image_url"),
  
  // Contact Information
  compSciHighEmail: text("comp_sci_high_email"),
  personalEmail: text("personal_email"),
  collegeEmail: text("college_email"),
  preferredEmail: text("preferred_email"),
  phone: text("phone"),
  
  // Social Media
  instagramHandle: text("instagram_handle"),
  twitterHandle: text("twitter_handle"),
  tiktokHandle: text("tiktok_handle"),
  linkedinHandle: text("linkedin_handle"),
  
  // Academic & Personal
  highSchoolGpa: text("high_school_gpa"),
  householdSize: integer("household_size"),
  householdIncome: text("household_income"),
  
  // Tracking Status
  trackingStatus: text("tracking_status").default("unknown"), // on-track, off-track, near-track, unknown
  trackingStatusModified: boolean("tracking_status_modified").default(false), // Tracks if tracking status was manually set by user
  supportCategory: text("support_category"), // Persistence-College, Persistence-Job Training, Success-Employed, Success-Seeking Employment
  dropoutDate: date("dropout_date"), // Date when student dropped out or went off track
  
  // Liberation Path tracking
  pathType: text("path_type").$type<"college" | "work" | "training" | "military" | "other" | "path not defined">().default("path not defined"),
  currentStage: text("current_stage"),
  militaryService: boolean("military_service").default(false),
  pathTypeModified: boolean("path_type_modified").default(false), // Tracks if path was manually set by user
  currentStageModified: boolean("current_stage_modified").default(false), // Tracks if stage was manually set by user
  
  // College Information (Tab 2)
  collegeAttending: text("college_attending"),
  collegeProgram: text("college_program"),
  collegeMajor: text("college_major"),
  collegeMinor: text("college_minor"),
  degreeTrack: text("degree_track"),
  intendedCareerPath: text("intended_career_path"),
  currentlyEnrolled: boolean("currently_enrolled").default(false),
  enrollmentStatus: text("enrollment_status"),
  enrollmentStatusModified: boolean("enrollment_status_modified").default(false), // Tracks if enrollment status was manually set by user
  expectedGraduationDate: date("expected_graduation_date"),
  receivedScholarships: boolean("received_scholarships").default(false),
  scholarships: jsonb("scholarships").$type<{ amount: number; provider: string; notes: string; }[]>().default([]),
  scholarshipsRequiringRenewal: text("scholarships_requiring_renewal"),
  enrolledInOpportunityProgram: boolean("enrolled_in_opportunity_program").default(false),
  transferStudentStatus: text("transfer_student_status"),
  collegeGpa: text("college_gpa"),
  
  // Job Training Program (Tab 3)
  trainingProgramName: text("training_program_name"),
  trainingProgramType: text("training_program_type"),
  trainingProgramLocation: text("training_program_location"),
  trainingProgramPay: text("training_program_pay"),
  trainingStartDate: date("training_start_date"),
  trainingEndDate: date("training_end_date"),
  trainingDegreeCertification: text("training_degree_certification"),
  
  // Employment (Tab 4)
  onCourseEconomicLiberation: boolean("on_course_economic_liberation").default(false),
  employed: boolean("employed").default(false),
  employmentType: text("employment_type"),
  employerName: text("employer_name"),
  latestAnnualIncome: text("latest_annual_income"),
  latestIncomeDate: date("latest_income_date"),
  
  // Employment History (unified jobs and training)
  employmentHistory: jsonb("employment_history").$type<{
    id: string;
    type: 'job' | 'training'; // Entry type
    
    // Job fields
    employerName?: string; // Company name for jobs
    position?: string;
    employmentType?: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'temporary';
    annualSalary?: string;
    
    // Training fields
    programName?: string; // Program name for training
    programType?: 'coding-bootcamp' | 'trade-school' | 'certification' | 'apprenticeship' | 'vocational' | 'professional-development' | 'other';
    certification?: string;
    location?: string; // Location for both jobs and training
    
    // Common fields
    startDate: string;
    endDate?: string;
    description?: string;
    isCurrent: boolean;
  }[]>().default([]),
  
  // Salary Information (private/optional)
  currentSalary: integer("current_salary"), // Annual salary in dollars
  salaryLastUpdated: timestamp("salary_last_updated"),
  salaryDataConsent: boolean("salary_data_consent").default(false),
  
  // System fields from sample data
  contactId: text("contact_id"),
  matriculation: text("matriculation"),
  collegeOrWorkforce: text("college_or_workforce"),
  track: text("track"),
  connectedAsOf: date("connected_as_of"),
  attemptedOutreach: date("attempted_outreach"),
  circleBack: boolean("circle_back").default(false),
  transcriptCollected: boolean("transcript_collected").default(false),
  transcript: boolean("transcript").default(false),
  needsTutor: boolean("needs_tutor").default(false),
  subjectSupport: text("subject_support"),
  grouping: text("grouping"),
  
  // Engagement & Status
  lastContactDate: date("last_contact_date"),
  notes: text("notes"),
  
  // Flags & Tracking
  needsFollowUp: boolean("needs_follow_up").default(false),
  flaggedForOutreach: boolean("flagged_for_outreach").default(false),
  reminderDate: date("reminder_date"),
  
  // Contact Queue Management
  pinned: boolean("pinned").default(false),
  snoozedUntil: date("snoozed_until"),
  doNotContact: boolean("do_not_contact").default(false),
  queueSkippedUntil: date("queue_skipped_until"),
  
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saved reports table
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  columns: jsonb("columns").$type<string[]>().notNull(),
  filters: jsonb("filters").$type<any[]>().notNull().default([]),
  sortRules: jsonb("sort_rules").$type<any[]>().notNull().default([]),
  groupBy: text("group_by"),
  showTotals: boolean("show_totals").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastRun: timestamp("last_run"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
});

// Audit log table
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  fieldName: varchar("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  editorId: varchar("editor_id").references(() => users.id).notNull(),
}, (table) => [
  index("audit_log_alumni_timestamp").on(table.alumniId, table.timestamp.desc()),
]);

// Resources table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  title: text("title").notNull(),
  link: text("link"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Alumni interaction notes table
export const alumniInteractions = pgTable("alumni_interactions", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  type: text("type").notNull().default("general"), // "general", "phone", "email", "text", "in-person"
  date: date("date").notNull(),
  durationMin: integer("duration_min").notNull(),
  // Communication tracking
  studentResponded: boolean("student_responded").default(false),
  needsFollowUp: boolean("needs_follow_up").default(false),
  followUpPriority: text("follow_up_priority", { enum: ['none', 'low', 'normal', 'high', 'urgent'] }).default('none'),
  followUpDate: date("follow_up_date"),
  // Structured interaction data
  sinceLastContact: text("since_last_contact"),
  overview: text("overview"),
  discussionPoints: text("discussion_points"),
  actionItems: text("action_items"),
  nextSteps: text("next_steps"),
  // AI-generated summaries
  alumniSummary: text("alumni_summary"), // summary for alumni
  internalSummary: text("internal_summary"), // internal staff summary
  followUpItems: jsonb("follow_up_items"),
  tags: jsonb("tags"),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  summaryLocked: boolean("summary_locked").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attachments table for interaction files
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  interactionId: integer("interaction_id").references(() => alumniInteractions.id).notNull(),
  originalName: text("original_name").notNull(),
  fileName: text("file_name").notNull(), // UUID-based filename for storage
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  url: text("url").notNull(), // URL path to access the file
  createdAt: timestamp("created_at").defaultNow(),
});

// Alumni tasks/reminders table
export const alumniTasks = pgTable("alumni_tasks", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  assignedDate: date("assigned_date").notNull(),
  dueDate: date("due_date"),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  priority: text("priority").default("medium"), // low, medium, high
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  link: text("link"),
  status: text("status").default("pending"), // pending, in-progress, completed (Note: DB has USER-DEFINED type)
  autoReminder: boolean("auto_reminder").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scholarships tracking table
export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  scholarshipName: text("scholarship_name").notNull(),
  amount: text("amount"),
  provider: text("provider"),
  academicYear: text("academic_year"),
  semester: text("semester"),
  status: text("status").default("active"), // active, expired, renewed
  applicationDate: date("application_date"),
  awardDate: date("award_date"),
  expirationDate: date("expiration_date"),
  requiresRenewal: boolean("requires_renewal").default(false),
  renewalDate: date("renewal_date"),
  renewalRequirements: text("renewal_requirements"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});



// Alumni metrics/milestones table
export const alumniMetrics = pgTable("alumni_metrics", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  date: date("date").notNull(),
  metricType: text("metric_type").notNull(), // gpa, income, completion_rate, etc.
  value: text("value").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Prompts table for custom prompts (legacy tutoring system)
export const aiPrompts = pgTable("ai_prompts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  alumniEmailPrompt: text("alumni_email_prompt"),
  internalSummaryPrompt: text("internal_summary_prompt"),
  outreachSummaryPrompt: text("outreach_summary_prompt"),
  alumniEmailPromptLocked: boolean("alumni_email_prompt_locked").default(false),
  internalSummaryPromptLocked: boolean("internal_summary_prompt_locked").default(false),
  outreachSummaryPromptLocked: boolean("outreach_summary_prompt_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI prompts for alumni note generation (current system)
export const alumniAiPrompts = pgTable("alumni_ai_prompts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  generalPrompt: text("general_prompt"),
  companyPrompt: text("company_prompt"),
  parentPrompt: text("parent_prompt"),
  progressPrompt: text("progress_prompt"),
  generalPromptLocked: boolean("general_prompt_locked").default(false),
  companyPromptLocked: boolean("company_prompt_locked").default(false),
  parentPromptLocked: boolean("parent_prompt_locked").default(false),
  progressPromptLocked: boolean("progress_prompt_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application Settings table
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  nationalMedianIncome: integer("national_median_income").notNull().default(74580), // Default: $74,580
  lastMedianIncomeUpdate: timestamp("last_median_income_update").defaultNow(),
  nextReminderDate: timestamp("next_reminder_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics tables for developer dashboard
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  eventType: varchar("event_type").notNull(), // page_view, feature_use, api_call, error, etc.
  eventCategory: varchar("event_category"), // navigation, alumni_management, analytics, etc.
  eventAction: varchar("event_action"), // click, view, create, update, delete
  eventLabel: varchar("event_label"), // specific button/feature identifier
  eventValue: integer("event_value"), // optional numeric value (e.g., response time ms)
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // additional context
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  sessionId: varchar("session_id"),
  path: varchar("path"), // URL path
  referrer: varchar("referrer"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("analytics_events_user_timestamp").on(table.userId, table.timestamp.desc()),
  index("analytics_events_type_timestamp").on(table.eventType, table.timestamp.desc()),
]);

export const analyticsSessions = pgTable("analytics_sessions", {
  id: varchar("id").primaryKey(), // session ID
  userId: varchar("user_id").references(() => users.id),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  pageViews: integer("page_views").default(0),
  actions: integer("actions").default(0),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  entryPath: varchar("entry_path"),
  exitPath: varchar("exit_path"),
}, (table) => [
  index("analytics_sessions_user_start").on(table.userId, table.startTime.desc()),
]);

export const analyticsErrors = pgTable("analytics_errors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  errorType: varchar("error_type").notNull(), // client, server, api
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  path: varchar("path"),
  method: varchar("method"), // GET, POST, etc.
  statusCode: integer("status_code"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("analytics_errors_type_timestamp").on(table.errorType, table.timestamp.desc()),
  index("analytics_errors_user_timestamp").on(table.userId, table.timestamp.desc()),
]);

// Relations
export const alumniRelations = relations(alumni, ({ many }) => ({
  resources: many(resources),
  interactions: many(alumniInteractions),
  tasks: many(alumniTasks),
  scholarships: many(scholarships),
  metrics: many(alumniMetrics),
  auditLogs: many(auditLog),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  alumni: one(alumni, { fields: [resources.alumniId], references: [alumni.id] }),
}));

export const alumniInteractionsRelations = relations(alumniInteractions, ({ one, many }) => ({
  alumni: one(alumni, { fields: [alumniInteractions.alumniId], references: [alumni.id] }),
  creator: one(users, { fields: [alumniInteractions.createdBy], references: [users.id] }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  interaction: one(alumniInteractions, { fields: [attachments.interactionId], references: [alumniInteractions.id] }),
}));

export const alumniTasksRelations = relations(alumniTasks, ({ one }) => ({
  alumni: one(alumni, { fields: [alumniTasks.alumniId], references: [alumni.id] }),
}));

export const scholarshipsRelations = relations(scholarships, ({ one }) => ({
  alumni: one(alumni, { fields: [scholarships.alumniId], references: [alumni.id] }),
}));

export const alumniMetricsRelations = relations(alumniMetrics, ({ one }) => ({
  alumni: one(alumni, { fields: [alumniMetrics.alumniId], references: [alumni.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  alumni: one(alumni, { fields: [auditLog.alumniId], references: [alumni.id] }),
  editor: one(users, { fields: [auditLog.editorId], references: [users.id] }),
}));



// Follow-up priority types
export const followUpPriorities = ['none', 'low', 'normal', 'high', 'urgent'] as const;
export type FollowUpPriority = typeof followUpPriorities[number];

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type Alumni = typeof alumni.$inferSelect;
export type InsertAlumni = typeof alumni.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
export type AlumniInteraction = typeof alumniInteractions.$inferSelect;
export type InsertAlumniInteraction = typeof alumniInteractions.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;
export type AlumniTask = typeof alumniTasks.$inferSelect;
export type InsertAlumniTask = typeof alumniTasks.$inferInsert;
export type Scholarship = typeof scholarships.$inferSelect;
export type InsertScholarship = typeof scholarships.$inferInsert;
export type AlumniMetric = typeof alumniMetrics.$inferSelect;
export type InsertAlumniMetric = typeof alumniMetrics.$inferInsert;
export type AiPrompts = typeof aiPrompts.$inferSelect;
export type InsertAiPrompts = typeof aiPrompts.$inferInsert;
export type AlumniAiPrompts = typeof alumniAiPrompts.$inferSelect;
export type InsertAlumniAiPrompts = typeof alumniAiPrompts.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
export type CollegeLocation = typeof collegeLocations.$inferSelect;
export type InsertCollegeLocation = typeof collegeLocations.$inferInsert;
export type UnresolvedCollege = typeof unresolvedColleges.$inferSelect;
export type InsertUnresolvedCollege = typeof unresolvedColleges.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type InsertAnalyticsSession = typeof analyticsSessions.$inferInsert;
export type AnalyticsError = typeof analyticsErrors.$inferSelect;
export type InsertAnalyticsError = typeof analyticsErrors.$inferInsert;


// Invitation system table
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviterUserId: varchar("inviter_user_id").notNull(), // Reference removed to fix circular dependency
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  role: userRoleEnum("role").notNull().default("staff"), // use existing role enum
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// Interaction Type enum for type safety
export type InteractionType = "general" | "phone" | "email" | "text" | "in-person";

// Zod schemas with enhanced validation for text-numeric fields
export const insertAlumniSchema = createInsertSchema(alumni)
  .omit({ 
    highSchoolGpa: true, 
    householdIncome: true, 
    collegeGpa: true,
    dateOfBirth: true,
    pathType: true
  })
  .extend({
    // Re-add numeric text fields with proper null handling for frontend compatibility
    highSchoolGpa: z.union([z.string(), z.null()]).refine(val => val === null || val === '' || /^\d*\.?\d*$/.test(val), "Must be a valid GPA or empty").optional(),
    householdIncome: z.union([z.string(), z.null()]).refine(val => val === null || val === '' || /^\d*$/.test(val), "Must be a valid income or empty").optional(),
    collegeGpa: z.union([z.string(), z.null()]).refine(val => val === null || val === '' || /^\d*\.?\d*$/.test(val), "Must be a valid GPA or empty").optional(),
    // Re-add dateOfBirth with proper handling for date serialization
    dateOfBirth: z.union([z.string(), z.date(), z.null()]).transform(val => {
      if (val === null || val === '') return null;
      if (typeof val === 'string') return val;
      if (val instanceof Date) return val.toISOString().split('T')[0];
      return null;
    }).optional(),
    // Fix pathType validation to accept any string and validate it
    pathType: z.union([
      z.literal("college"),
      z.literal("work"), 
      z.literal("training"),
      z.literal("military"),
      z.literal("other"),
      z.null(),
      z.string()
    ]).transform(val => {
      if (val === null || val === '' || val === undefined) return null;
      if (['college', 'work', 'training', 'military', 'other'].includes(val)) {
        return val as "college" | "work" | "training" | "military" | "other";
      }
      return null; // Invalid strings become null
    }).optional(),
  });
export const insertResourceSchema = createInsertSchema(resources);
export const insertAlumniInteractionSchema = createInsertSchema(alumniInteractions);
export const insertAttachmentSchema = createInsertSchema(attachments);
export const insertAlumniTaskSchema = createInsertSchema(alumniTasks);
export const insertScholarshipSchema = createInsertSchema(scholarships);
export const insertAlumniMetricSchema = createInsertSchema(alumniMetrics);
export const insertAiPromptsSchema = createInsertSchema(aiPrompts);
export const insertAuditLogSchema = createInsertSchema(auditLog);
export const insertCollegeLocationSchema = createInsertSchema(collegeLocations);
export const insertUnresolvedCollegeSchema = createInsertSchema(unresolvedColleges);
export const insertAppSettingsSchema = createInsertSchema(appSettings);
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents);
export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions);
export const insertAnalyticsErrorSchema = createInsertSchema(analyticsErrors);
