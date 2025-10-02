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
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
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
export const userRoleEnum = pgEnum("user_role", ["staff", "admin", "alumni"]);

// Users table for Replit Auth and app users
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
  authMethod: varchar("auth_method").default("replit"), // 'replit' or 'email'
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
  trackingStatus: text("tracking_status").default("on-track"), // on-track, off-track, near-track
  supportCategory: text("support_category"), // Persistence-College, Persistence-Job Training, Success-Employed, Success-Seeking Employment
  
  // College Information (Tab 2)
  collegeAttending: text("college_attending"),
  collegeMajor: text("college_major"),
  collegeMinor: text("college_minor"),
  degreeTrack: text("degree_track"),
  intendedCareerPath: text("intended_career_path"),
  currentlyEnrolled: boolean("currently_enrolled").default(false),
  enrollmentStatus: text("enrollment_status"),
  expectedGraduationDate: date("expected_graduation_date"),
  receivedScholarships: boolean("received_scholarships").default(false),
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
  
  // System fields from sample data
  contactId: text("contact_id"),
  matriculation: text("matriculation"),
  collegeOrWorkforce: text("college_or_workforce"),
  track: text("track"),
  connectedAsOf: date("connected_as_of"),
  attemptedOutreach: date("attempted_outreach"),
  circleBack: boolean("circle_back").default(false),
  transcriptCollected: boolean("transcript_collected").default(false),
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
  
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Resources table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  title: text("title").notNull(),
  link: text("link"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Alumni interaction notes table (formerly session notes)
export const alumniInteractions = pgTable("alumni_interactions", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  type: text("type").notNull().default("interaction"), // "interaction" or "general"
  date: date("date").notNull(),
  durationMin: integer("duration_min").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Alumni tasks table (formerly homework)
export const alumniTasks = pgTable("alumni_tasks", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  assignedDate: date("assigned_date").notNull(),
  dueDate: date("due_date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // follow-up, scholarship, outreach, etc.
  priority: text("priority").default("medium"), // high, medium, low
  assignedTo: text("assigned_to"), // staff member responsible
  notes: text("notes"),
  link: text("link"),
  status: homeworkStatusEnum("status").default("new"),
  autoReminder: boolean("auto_reminder").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scholarship tracking table
export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  scholarshipName: text("scholarship_name").notNull(),
  amount: text("amount"), // keeping as text to handle various formats
  provider: text("provider"),
  academicYear: text("academic_year"),
  semester: text("semester"),
  status: text("status").default("active"), // active, expired, renewed, declined
  applicationDate: date("application_date"),
  awardDate: date("award_date"),
  expirationDate: date("expiration_date"),
  requiresRenewal: boolean("requires_renewal").default(false),
  renewalDate: date("renewal_date"),
  renewalRequirements: text("renewal_requirements"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Alumni metrics table for tracking success metrics
export const alumniMetrics = pgTable("alumni_metrics", {
  id: serial("id").primaryKey(),
  alumniId: integer("alumni_id").references(() => alumni.id).notNull(),
  date: date("date").notNull(),
  metricType: text("metric_type").notNull(), // gpa, income, employment_status, etc.
  value: text("value").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Prompts table for alumni outreach
export const aiPrompts = pgTable("ai_prompts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  alumniEmailPrompt: text("alumni_email_prompt"),
  internalSummaryPrompt: text("internal_summary_prompt"),
  outreachSummaryPrompt: text("outreach_summary_prompt"),
  alumniEmailPromptLocked: boolean("alumni_email_prompt_locked").default(false),
  internalSummaryPromptLocked: boolean("internal_summary_prompt_locked").default(false),
  outreachSummaryPromptLocked: boolean("outreach_summary_prompt_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const alumniRelations = relations(alumni, ({ many }) => ({
  resources: many(resources),
  interactions: many(alumniInteractions),
  tasks: many(alumniTasks),
  scholarships: many(scholarships),
  metrics: many(alumniMetrics),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  alumni: one(alumni, { fields: [resources.alumniId], references: [alumni.id] }),
}));

export const alumniInteractionsRelations = relations(alumniInteractions, ({ one }) => ({
  alumni: one(alumni, { fields: [alumniInteractions.alumniId], references: [alumni.id] }),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlumniSchema = createInsertSchema(alumni).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
});

export const insertAlumniInteractionSchema = createInsertSchema(alumniInteractions).omit({
  id: true,
  createdAt: true,
}).extend({
  // Handle date as string from frontend
  date: z.string().or(z.date()).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  // Handle timestamp fields that may come as strings
  emailSentAt: z.string().or(z.date()).nullable().optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
});

export const insertAlumniTaskSchema = createInsertSchema(alumniTasks).omit({
  id: true,
  createdAt: true,
});

export const insertScholarshipSchema = createInsertSchema(scholarships).omit({
  id: true,
  createdAt: true,
});

export const insertAlumniMetricSchema = createInsertSchema(alumniMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertAiPromptsSchema = createInsertSchema(aiPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertAlumni = z.infer<typeof insertAlumniSchema>;
export type Alumni = typeof alumni.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertAlumniInteraction = z.infer<typeof insertAlumniInteractionSchema>;
export type AlumniInteraction = typeof alumniInteractions.$inferSelect;
export type InsertAlumniTask = z.infer<typeof insertAlumniTaskSchema>;
export type AlumniTask = typeof alumniTasks.$inferSelect;
export type InsertScholarship = z.infer<typeof insertScholarshipSchema>;
export type Scholarship = typeof scholarships.$inferSelect;
export type InsertAlumniMetric = z.infer<typeof insertAlumniMetricSchema>;
export type AlumniMetric = typeof alumniMetrics.$inferSelect;
export type InsertAiPrompts = z.infer<typeof insertAiPromptsSchema>;
export type AiPrompts = typeof aiPrompts.$inferSelect;
