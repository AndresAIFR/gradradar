import {
  users,
  passwordResetTokens,
  emailVerificationTokens,
  alumni,
  resources,
  alumniInteractions,
  attachments,
  alumniTasks,
  scholarships,
  alumniMetrics,
  aiPrompts,
  alumniAiPrompts,
  auditLog,
  collegeLocations,
  appSettings,
  invitations,
  savedReports,
  analyticsEvents,
  analyticsSessions,
  analyticsErrors,
  type User,
  type UpsertUser,
  type PasswordResetToken,
  type EmailVerificationToken,
  type Invitation,
  type InsertInvitation,
  type Alumni,
  type InsertAlumni,
  type Resource,
  type InsertResource,
  type AlumniInteraction,
  type InsertAlumniInteraction,
  type Attachment,
  type InsertAttachment,
  type AlumniTask,
  type InsertAlumniTask,
  type Scholarship,
  type InsertScholarship,
  type AlumniMetric,
  type InsertAlumniMetric,
  type AiPrompts,
  type InsertAiPrompts,
  type AlumniAiPrompts,
  type InsertAlumniAiPrompts,
  type AuditLog,
  type InsertAuditLog,
  type CollegeLocation,
  type InsertCollegeLocation,
  type AppSettings,
  type InsertAppSettings,
} from "@shared/schema";
import { calculateCurrentStage } from "@shared/liberationPath";
import { db, withRetry } from "./db";
import { eq, desc, asc, ilike, inArray, and, or, count, sql, isNull, gte, lte, ne } from "drizzle-orm";
import { collegeResolutionService } from "./collegeResolutionService";


export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  createUser(userData: Omit<UpsertUser, 'id'> & { id?: string }): Promise<User>;
  
  // User management operations (admin only)
  deleteUser(userId: string): Promise<void>;
  resetUserPassword(userId: string, newPassword: string): Promise<void>;
  
  // Password reset operations
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
  
  // Email verification operations
  createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(tokenId: number): Promise<void>;
  verifyUserEmail(userId: string): Promise<void>;
  
  // Alumni operations
  getAlumni(): Promise<Alumni[]>;
  getAlumniForDropoutAdmin(): Promise<Alumni[]>;
  getAlumniPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    filters?: {
      cohortYear?: number[];
      trackingStatus?: string[];
      contactRecency?: string[];
      supportCategory?: string[];
      collegeAttending?: string[];
      employed?: boolean;
      receivedScholarships?: boolean;
      currentStage?: string[];
      attritionType?: string;
      lastContact?: string[];
      onCourseEconomicLiberation?: boolean;
    };
    sort?: { field: string; direction: 'asc' | 'desc' };
  }): Promise<{ alumni: Alumni[]; totalCount: number }>;
  getAlumniMember(id: number): Promise<Alumni | undefined>;
  createAlumni(alumni: InsertAlumni): Promise<Alumni>;
  updateAlumni(id: number, alumni: Partial<InsertAlumni>): Promise<Alumni>;
  deleteAlumni(id: number): Promise<void>;
  removeDuplicateAlumni(): Promise<number>;
  
  // Resource operations
  getResourcesByAlumni(alumniId: number): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource>;
  deleteResource(id: number): Promise<void>;
  
  // Alumni interaction operations
  getAlumniInteractionsByMember(alumniId: number): Promise<AlumniInteraction[]>;
  getAlumniInteraction(id: number): Promise<AlumniInteraction | undefined>;
  getAlumniWithLatestInteractions(): Promise<any[]>;
  getContactTimeline(params: { dateFrom: string; dateTo: string; staffId?: string; alumniId?: number; contactType?: string[]; userRole: string; cohortYear?: number[]; trackingStatus?: string[]; needsFollowUp?: string[]; supportCategory?: string[]; employed?: string[]; currentlyEnrolled?: string[]; }): Promise<any[]>;
  createAlumniInteraction(interaction: InsertAlumniInteraction): Promise<AlumniInteraction>;
  updateAlumniInteraction(id: number, interaction: Partial<InsertAlumniInteraction>): Promise<AlumniInteraction>;
  completeAllFollowupsForAlumni(alumniId: number): Promise<number>;
  deleteAlumniInteraction(id: number): Promise<void>;
  
  // Attachment operations
  getAttachmentsByInteraction(interactionId: number): Promise<Attachment[]>;
  getAttachmentById(id: number): Promise<Attachment | null>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: number): Promise<void>;
  
  // Alumni task operations
  getAlumniTasksByMember(alumniId: number): Promise<AlumniTask[]>;
  createAlumniTask(task: InsertAlumniTask): Promise<AlumniTask>;
  updateAlumniTask(id: number, task: Partial<InsertAlumniTask>): Promise<AlumniTask>;
  deleteAlumniTask(id: number): Promise<void>;
  
  // Scholarship operations
  getScholarshipsByAlumni(alumniId: number): Promise<Scholarship[]>;
  createScholarship(scholarship: InsertScholarship): Promise<Scholarship>;
  updateScholarship(id: number, scholarship: Partial<InsertScholarship>): Promise<Scholarship>;
  deleteScholarship(id: number): Promise<void>;
  
  // Alumni metrics operations
  getAlumniMetricsByMember(alumniId: number): Promise<AlumniMetric[]>;
  createAlumniMetric(metric: InsertAlumniMetric): Promise<AlumniMetric>;
  updateAlumniMetric(id: number, metric: Partial<InsertAlumniMetric>): Promise<AlumniMetric>;
  deleteAlumniMetric(id: number): Promise<void>;
  
  // AI Prompts operations (legacy tutoring system)
  getAiPrompts(userId: string): Promise<AiPrompts | undefined>;
  upsertAiPrompts(userId: string, prompts: Partial<InsertAiPrompts>): Promise<AiPrompts>;

  // Alumni AI prompts operations (current system)
  getAlumniAiPrompts(userId: string): Promise<AlumniAiPrompts | undefined>;
  upsertAlumniAiPrompts(userId: string, prompts: Partial<InsertAlumniAiPrompts>): Promise<AlumniAiPrompts>;
  
  // Audit log operations
  createAuditLogEntry(entry: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByAlumni(alumniId: number, limit?: number, offset?: number): Promise<AuditLog[]>;
  updateAlumniWithAudit(id: number, updates: Partial<InsertAlumni>, editorId: string): Promise<Alumni>;

  // College location operations
  getAllCollegeLocations(): Promise<CollegeLocation[]>;
  createCollegeLocation(location: InsertCollegeLocation): Promise<CollegeLocation>;
  updateCollegeLocation(id: number, location: Partial<InsertCollegeLocation>): Promise<CollegeLocation>;
  
  // App settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;
  updateNationalMedianIncome(income: number): Promise<AppSettings>;
  shouldShowQuarterlyReminder(): Promise<boolean>;
  markReminderShown(): Promise<AppSettings>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getInvitationsByInviter(inviterUserId: string): Promise<Invitation[]>;
  getAllInvitations(): Promise<Invitation[]>;
  markInvitationAccepted(invitationId: string): Promise<void>;
  deleteInvitation(invitationId: string): Promise<void>;
  
  // User management operations  
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, newRole: string): Promise<User>;
  
  // Analytics operations
  trackEvent(eventData: {
    userId?: string;
    eventType: string;
    eventCategory?: string;
    eventAction?: string;
    eventLabel?: string;
    eventValue?: number;
    metadata?: Record<string, any>;
    sessionId?: string;
    path?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void>;
  trackError(errorData: {
    userId?: string;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    metadata?: Record<string, any>;
    userAgent?: string;
  }): Promise<void>;
  getAnalyticsEvents(params: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<any[]>;
  getAnalyticsErrors(params: {
    startDate?: Date;
    endDate?: Date;
    errorType?: string;
    limit?: number;
  }): Promise<any[]>;
  getAnalyticsSummary(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalEvents: number;
    totalErrors: number;
    uniqueUsers: number;
    topEvents: Array<{ eventType: string; count: number }>;
    topErrors: Array<{ errorType: string; count: number }>;
  }>;
  
  // Admin-only operations
  getAlumniStats(): Promise<{
    totalAlumni: number;
    totalInteractions: number;
    totalTasks: number;
    totalScholarships: number;
    totalMetrics: number;
    totalResources: number;
    totalAuditLogs: number;
  }>;
  exportAlumniData(): Promise<Alumni[]>;
  deleteAllAlumniData(): Promise<{
    deletedAlumni: number;
    deletedInteractions: number;
    deletedTasks: number;
    deletedScholarships: number;
    deletedMetrics: number;
    deletedResources: number;
    deletedAuditLogs: number;
  }>;
  
  // Reports operations
  getUserReports(userId: string): Promise<any[]>;
  createReport(reportData: any): Promise<any>;
  updateReport(reportId: number, reportData: any, userId: string): Promise<any>;
  deleteReport(reportId: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    });
  }

  async getUserById(id: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    });
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return await withRetry(async () => {
      try {
        // First try to find existing user by ID
        const existingUserById = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);
        
        if (existingUserById.length > 0) {
          const [updatedUser] = await db
            .update(users)
            .set({
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              profileImageUrl: userData.profileImageUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userData.id))
            .returning();
          return updatedUser;
        }
        
        // Check if user exists by email (different ID)
        if (userData.email) {
          const existingUserByEmail = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
          
          if (existingUserByEmail.length > 0) {
            const [updatedUser] = await db
              .update(users)
              .set({
                id: userData.id, // Update to new ID from auth provider
                firstName: userData.firstName,
                lastName: userData.lastName,
                profileImageUrl: userData.profileImageUrl,
                updatedAt: new Date(),
              })
              .where(eq(users.email, userData.email))
              .returning();
            return updatedUser;
          }
        }
        
        const [newUser] = await db
          .insert(users)
          .values(userData)
          .returning();
        return newUser;
      } catch (error) {
        throw error;
      }
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return await withRetry(async () => {
      const [updatedUser] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    });
  }

  async createUser(userData: Omit<UpsertUser, 'id'> & { id?: string }): Promise<User> {
    return await withRetry(async () => {
      // Ensure all required fields are present, including id
      const userDataWithId = {
        ...userData,
        id: userData.id || `user_${Date.now()}`, // Generate id if not provided
      };
      
      const [newUser] = await db
        .insert(users)
        .values(userDataWithId)
        .returning();
      return newUser;
    });
  }

  // Password reset operations
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await withRetry(async () => {
      await db.insert(passwordResetTokens).values({
        userId,
        token,
        expiresAt,
      });
    });
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return await withRetry(async () => {
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      return resetToken;
    });
  }

  async markPasswordResetTokenUsed(tokenId: number): Promise<void> {
    await withRetry(async () => {
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, tokenId));
    });
  }

  // Email verification operations
  async createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await withRetry(async () => {
      await db.insert(emailVerificationTokens).values({
        userId,
        token,
        expiresAt,
      });
    });
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    return await withRetry(async () => {
      const [verificationToken] = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.token, token));
      return verificationToken;
    });
  }

  async markEmailVerificationTokenUsed(tokenId: number): Promise<void> {
    await withRetry(async () => {
      await db
        .update(emailVerificationTokens)
        .set({ used: true })
        .where(eq(emailVerificationTokens.id, tokenId));
    });
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await withRetry(async () => {
      await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, userId));
    });
  }

  // Alumni operations
  async getAlumni(): Promise<Alumni[]> {
    return await withRetry(async () => {
      const result = await db
        .select()
        .from(alumni)
        .orderBy(desc(alumni.createdAt));
      
      return result;
    });
  }

  async getAlumniForDropoutAdmin(): Promise<Alumni[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(alumni)
        .where(or(
          eq(alumni.trackingStatus, 'off-track'),
          eq(alumni.trackingStatus, 'unknown')
        ))
        .orderBy(desc(alumni.cohortYear), alumni.lastName);
    });
  }

  async getAlumniPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    filters?: {
      cohortYear?: number[];
      trackingStatus?: string[];
      contactRecency?: string[];
      supportCategory?: string[];
      collegeAttending?: string[];
      employed?: boolean;
      receivedScholarships?: boolean;
      currentStage?: string[];
      lastContact?: string[];
      onCourseEconomicLiberation?: boolean;
      attritionType?: string;
    };
    sort?: { field: string; direction: 'asc' | 'desc' };
  }): Promise<{ alumni: Alumni[]; totalCount: number }> {
    return await withRetry(async () => {
      const { page, limit, search, filters, sort } = params;
      const offset = (page - 1) * limit;



      // Build where conditions
      const whereConditions = [];

      // Search condition
      if (search) {
        whereConditions.push(
          or(
            ilike(alumni.firstName, `%${search}%`),
            ilike(alumni.lastName, `%${search}%`),
            ilike(alumni.collegeAttending, `%${search}%`),
            ilike(alumni.collegeMajor, `%${search}%`)
          )
        );
      }

      // Filter conditions
      if (filters) {
        if (filters.cohortYear && filters.cohortYear.length > 0) {
          whereConditions.push(inArray(alumni.cohortYear, filters.cohortYear));
        }
        if (filters.trackingStatus && filters.trackingStatus.length > 0) {
          // Handle "unknown" status by matching null/undefined values AND the string "unknown"
          const hasUnknown = filters.trackingStatus.includes('unknown');
          const otherStatuses = filters.trackingStatus.filter(status => status !== 'unknown');
          
          if (hasUnknown && otherStatuses.length > 0) {
            // Include both known statuses and null/undefined/unknown
            whereConditions.push(
              or(
                inArray(alumni.trackingStatus, otherStatuses),
                isNull(alumni.trackingStatus),
                eq(alumni.trackingStatus, 'unknown')
              )
            );
          } else if (hasUnknown) {
            // Only unknown status selected - match null/undefined OR "unknown" string
            whereConditions.push(
              or(
                isNull(alumni.trackingStatus),
                eq(alumni.trackingStatus, 'unknown')
              )
            );
          } else {
            // Only known statuses selected
            whereConditions.push(inArray(alumni.trackingStatus, otherStatuses));
          }
        }
        if (filters.supportCategory && filters.supportCategory.length > 0) {
          // Handle 'Unknown' parameter for empty support categories
          const hasUnknown = filters.supportCategory.includes('Unknown');
          const otherCategories = filters.supportCategory.filter(cat => cat !== 'Unknown');
          
          if (hasUnknown && otherCategories.length > 0) {
            // Include both specific categories and empty/null values
            whereConditions.push(
              or(
                inArray(alumni.supportCategory, otherCategories),
                isNull(alumni.supportCategory),
                eq(alumni.supportCategory, '')
              )
            );
          } else if (hasUnknown) {
            // Only unknown categories selected - match null or empty string
            whereConditions.push(
              or(
                isNull(alumni.supportCategory),
                eq(alumni.supportCategory, '')
              )
            );
          } else {
            // Only specific categories selected
            whereConditions.push(inArray(alumni.supportCategory, otherCategories));
          }
        }
        // Note: collegeAttending filtering is handled post-query to support base university name matching
        // (e.g., "Cornell University" should match "Cornell University (Engineering)", "Cornell University (ILR EOP)", etc.)
        if (filters.employed !== null && filters.employed !== undefined) {
          whereConditions.push(eq(alumni.employed, filters.employed));
        }
        if (filters.receivedScholarships !== null && filters.receivedScholarships !== undefined) {
          whereConditions.push(eq(alumni.receivedScholarships, filters.receivedScholarships));
        }
        // Note: currentStage filtering is handled post-query using calculateCurrentStage
        // We can't filter in SQL since it requires dynamic calculation
        if (filters.onCourseEconomicLiberation !== null && filters.onCourseEconomicLiberation !== undefined) {
          whereConditions.push(eq(alumni.onCourseEconomicLiberation, filters.onCourseEconomicLiberation));
        }
        // Note: contactRecency filtering is handled post-query as it requires complex date calculations
      }

      // Build sort order
      let orderBy;
      if (sort && sort.field) {
        // Type-safe column access
        const validFields = ['id', 'firstName', 'lastName', 'cohortYear', 'createdAt', 'updatedAt'] as const;
        const field = sort.field as typeof validFields[number];
        
        if (validFields.includes(field)) {
          const sortColumn = alumni[field];
          orderBy = sort.direction === 'asc' ? asc(sortColumn) : desc(sortColumn);
        } else {
          orderBy = desc(alumni.createdAt);
        }
      } else {
        orderBy = desc(alumni.createdAt);
      }

      // Combine all conditions
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;


      // Check if we need to apply post-query filters (currentStage, contactRecency, attritionType, collegeAttending)
      const needsPostQueryFiltering = (filters?.currentStage && filters.currentStage.length > 0) || 
                                     (filters?.contactRecency && filters.contactRecency.length > 0) ||
                                     (filters?.collegeAttending && filters.collegeAttending.length > 0) ||
                                     (filters?.attritionType && filters.attritionType !== 'all');

      // Helper function to calculate contact recency category - MATCHES avatar ring logic exactly
      const getContactRecencyCategory = async (alumniMember: Alumni): Promise<string> => {
        let lastContactDate: Date | null = null;
        
        // 1. Check for most recent successful interaction (same as avatar rings)
        const successfulInteractions = await db
          .select({ date: alumniInteractions.date })
          .from(alumniInteractions)
          .where(and(
            eq(alumniInteractions.alumniId, alumniMember.id),
            eq(alumniInteractions.studentResponded, true)
          ))
          .orderBy(desc(alumniInteractions.date))
          .limit(1);
        
        if (successfulInteractions.length > 0 && successfulInteractions[0].date) {
          const date = new Date(successfulInteractions[0].date);
          if (!isNaN(date.getTime())) {
            lastContactDate = date;
          }
        }
        
        // 2. Check manually entered lastContactDate (same as avatar rings)
        if (!lastContactDate && alumniMember.lastContactDate) {
          const date = new Date(alumniMember.lastContactDate);
          if (!isNaN(date.getTime())) lastContactDate = date;
        }

        // 3. Check connectedAsOf date from CSV import (same as avatar rings)
        if (!lastContactDate && alumniMember.connectedAsOf) {
          const date = new Date(alumniMember.connectedAsOf);
          if (!isNaN(date.getTime())) lastContactDate = date;
        }

        // 4. Fallback to graduation date (same as avatar rings)
        if (!lastContactDate && alumniMember.cohortYear) {
          lastContactDate = new Date(alumniMember.cohortYear, 5, 1); // June 1st
        }

        if (!lastContactDate) {
          return 'unknown';
        }
        
        // Calculate days (same logic as avatar rings)
        const now = new Date();
        const diffTime = now.getTime() - lastContactDate.getTime();
        const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Use EXACT same thresholds as avatar rings
        if (daysSince <= 30) return 'recent';
        if (daysSince <= 90) return 'moderate';  
        if (daysSince <= 180) return 'stale';
        return 'none';
      };

      let alumniResult: Alumni[];
      let finalTotalCount: number;

      if (needsPostQueryFiltering) {
        // Get ALL alumni first, then apply post-query filters, then paginate
        
        const allAlumni = await db.select().from(alumni).where(whereClause).orderBy(orderBy);
        
        let filteredAlumni = allAlumni;
        
        // Apply post-query filters
        if (filters?.currentStage && filters.currentStage.length > 0) {
          filteredAlumni = filteredAlumni.filter(alumniMember => {
            const calculatedStage = calculateCurrentStage(alumniMember);
            return calculatedStage !== null && filters.currentStage!.includes(calculatedStage);
          });
        }
        
        if (filters?.contactRecency && filters.contactRecency.length > 0) {
          // Process contact recency filtering with async function
          const filteredPromises = filteredAlumni.map(async (alumniMember) => {
            const recencyCategory = await getContactRecencyCategory(alumniMember);
            return filters.contactRecency!.includes(recencyCategory) ? alumniMember : null;
          });
          
          const results = await Promise.all(filteredPromises);
          filteredAlumni = results.filter((alumniMember): alumniMember is Alumni => alumniMember !== null);
        }

        // Apply college filtering with base university name matching
        if (filters?.collegeAttending && filters.collegeAttending.length > 0) {
          filteredAlumni = filteredAlumni.filter(alumniMember => {
            if (!alumniMember.collegeAttending) return false;
            
            // Extract base university name from alumni record
            const alumniCollege = alumniMember.collegeAttending.trim();
            const baseMatch = alumniCollege.match(/^([^(]+)/);
            const baseAlumniCollege = baseMatch ? baseMatch[1].trim() : alumniCollege;
            
            // Check if any of the selected filters match the base university name
            return filters.collegeAttending!.some(selectedCollege => {
              const selectedBaseMatch = selectedCollege.match(/^([^(]+)/);
              const baseSelectedCollege = selectedBaseMatch ? selectedBaseMatch[1].trim() : selectedCollege;
              return baseAlumniCollege === baseSelectedCollege;
            });
          });
        }
        
        if (filters?.attritionType && filters.attritionType !== 'all') {
          const { calculateAttritionFilter } = await import('../client/src/utils/attritionCalculations.js');
          filteredAlumni = calculateAttritionFilter(filteredAlumni, filters.attritionType);
          
        }
        
        // Now apply pagination to filtered results
        finalTotalCount = filteredAlumni.length;
        alumniResult = filteredAlumni.slice(offset, offset + limit);
        
        
      } else {
        // No post-query filtering needed, use efficient SQL pagination
        const [queryResult, countResult] = await Promise.all([
          db.select().from(alumni)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset),
          db.select({ count: count() }).from(alumni)
            .where(whereClause)
        ]);
        
        alumniResult = queryResult;
        finalTotalCount = countResult[0]?.count || 0;
      }



      // Skip expensive enhancement when filtering to avoid DB connection overload
      let enhancedAlumni = alumniResult;
      
      if (!needsPostQueryFiltering && alumniResult.length <= 50) {
        // Only enhance when no filtering and small result set to avoid "too many connections"
        enhancedAlumni = await Promise.all(
          alumniResult.map(async (alumniMember) => {
            // Only fetch interaction if alumni.notes is empty
            if (!alumniMember.notes) {
              const latestInteraction = await db
                .select({ overview: alumniInteractions.overview })
                .from(alumniInteractions)
                .where(eq(alumniInteractions.alumniId, alumniMember.id))
                .orderBy(desc(alumniInteractions.createdAt))
                .limit(1);
              
              if (latestInteraction.length > 0 && latestInteraction[0].overview) {
                return {
                  ...alumniMember,
                  notes: latestInteraction[0].overview
                };
              }
            }
            return alumniMember;
          })
        );
      }

      return {
        alumni: enhancedAlumni,
        totalCount: finalTotalCount
      };
    });
  }

  async getAlumniMember(id: number): Promise<Alumni | undefined> {
    return await withRetry(async () => {
      const [alumniMember] = await db.select().from(alumni).where(eq(alumni.id, id));
      return alumniMember;
    });
  }

  async createAlumni(alumniData: InsertAlumni): Promise<Alumni> {
    return await withRetry(async () => {
      // Set correct defaults for new alumni
      const dataWithDefaults = {
        ...alumniData,
        trackingStatus: alumniData.trackingStatus || "unknown",
        pathType: alumniData.pathType || "path not defined"
      };
      
      const [newAlumni] = await db.insert(alumni).values(dataWithDefaults).returning();
      return newAlumni;
    });
  }

  async updateAlumni(id: number, alumniData: Partial<InsertAlumni>): Promise<Alumni> {
    return await withRetry(async () => {
      const [updatedAlumni] = await db
        .update(alumni)
        .set({ ...alumniData, updatedAt: new Date() })
        .where(eq(alumni.id, id))
        .returning();
      return updatedAlumni;
    });
  }

  async deleteAlumni(id: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(alumni).where(eq(alumni.id, id));
    });
  }

  async removeDuplicateAlumni(): Promise<number> {
    return await withRetry(async () => {
      // Implementation for removing duplicate alumni based on contactId
      const duplicates = await db.execute(`
        DELETE FROM alumni 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM alumni 
          GROUP BY contact_id
        ) 
        AND contact_id IS NOT NULL
      `);
      return duplicates.rowCount || 0;
    });
  }

  // Resource operations
  async getResourcesByAlumni(alumniId: number): Promise<Resource[]> {
    return await withRetry(async () => {
      return await db.select().from(resources).where(eq(resources.alumniId, alumniId));
    });
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    return await withRetry(async () => {
      const [newResource] = await db.insert(resources).values(resource).returning();
      return newResource;
    });
  }

  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    return await withRetry(async () => {
      const [updatedResource] = await db
        .update(resources)
        .set(resource)
        .where(eq(resources.id, id))
        .returning();
      return updatedResource;
    });
  }

  async deleteResource(id: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(resources).where(eq(resources.id, id));
    });
  }

  // Alumni interaction operations
  async getAlumniInteractionsByMember(alumniId: number): Promise<AlumniInteraction[]> {
    return await withRetry(async () => {
      return await db.select().from(alumniInteractions).where(eq(alumniInteractions.alumniId, alumniId));
    });
  }

  async getAlumniInteraction(id: number): Promise<AlumniInteraction | undefined> {
    return await withRetry(async () => {
      const [interaction] = await db.select().from(alumniInteractions).where(eq(alumniInteractions.id, id));
      return interaction;
    });
  }

  /**
   * Helper function to compute follow-up date with fallback for legacy records
   */
  private computeFollowUpDate(interaction: any): string | null {
    if (!interaction) return null;
    
    // Use existing followUpDate if available
    if (interaction.followUpDate) return interaction.followUpDate;
    
    // Fallback: compute from interaction date + priority days for legacy records
    const priority = interaction.followUpPriority;
    if (!priority || priority === 'none') return null;
    
    const interactionDate = new Date(interaction.date);
    
    const priorityDays: { [key: string]: number } = {
      'urgent': 1,
      'high': 3, 
      'normal': 7,
      'low': 30
    };
    
    const daysToAdd = priorityDays[priority] || 7; // default to normal
    interactionDate.setDate(interactionDate.getDate() + daysToAdd);
    
    return interactionDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  async getAlumniWithLatestInteractions(): Promise<any[]> {
    return await withRetry(async () => {
      // Get all alumni
      const allAlumni = await db.select().from(alumni);
      
      // For each alumni, get their latest interaction with follow-up info
      const alumniWithInteractions = await Promise.all(
        allAlumni.map(async (alumni) => {
          // Get the latest follow-up interaction with proper priority ordering
          const latestFollowUp = await db
            .select()
            .from(alumniInteractions)
            .where(and(
              eq(alumniInteractions.alumniId, alumni.id),
              eq(alumniInteractions.needsFollowUp, true),
              ne(alumniInteractions.followUpPriority, 'none')
            ))
            .orderBy(
              desc(sql`date_trunc('day', ${alumniInteractions.createdAt})`), // Most recent day
              sql`CASE ${alumniInteractions.followUpPriority} 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'low' THEN 4 
                ELSE 5 END`, // Highest priority wins same day
              desc(alumniInteractions.createdAt) // Final tiebreaker
            )
            .limit(1);

          return {
            ...alumni,
            latestFollowUpPriority: latestFollowUp[0]?.followUpPriority || null,
            latestFollowUpDate: this.computeFollowUpDate(latestFollowUp[0]),
            // Add previous tracking status logic here when we have historical data
            previousTrackingStatus: null,
            lastTrackingStatusChange: null
          };
        })
      );

      return alumniWithInteractions;
    });
  }

  async createAlumniInteraction(interaction: InsertAlumniInteraction): Promise<AlumniInteraction> {
    return await withRetry(async () => {
      const [newInteraction] = await db.insert(alumniInteractions).values(interaction).returning();
      
      return newInteraction;
    });
  }

  async completeAllFollowupsForAlumni(alumniId: number): Promise<number> {
    return await withRetry(async () => {
      const result = await db
        .update(alumniInteractions)
        .set({ needsFollowUp: false })
        .where(and(eq(alumniInteractions.alumniId, alumniId), eq(alumniInteractions.needsFollowUp, true)))
        .returning();
      return result.length;
    });
  }

  async updateAlumniInteraction(id: number, interaction: Partial<InsertAlumniInteraction>): Promise<AlumniInteraction> {
    return await withRetry(async () => {
      const [updatedInteraction] = await db
        .update(alumniInteractions)
        .set(interaction)
        .where(eq(alumniInteractions.id, id))
        .returning();
      return updatedInteraction;
    });
  }

  async deleteAlumniInteraction(id: number): Promise<void> {
    await withRetry(async () => {
      // First, delete all attachments associated with this interaction
      await db.delete(attachments).where(eq(attachments.interactionId, id));
      
      // Then delete the interaction itself
      await db.delete(alumniInteractions).where(eq(alumniInteractions.id, id));
    });
  }

  // Attachment operations
  async getAttachmentsByInteraction(interactionId: number): Promise<Attachment[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(attachments)
        .where(eq(attachments.interactionId, interactionId))
        .orderBy(desc(attachments.createdAt));
    });
  }

  async getAttachmentById(id: number): Promise<Attachment | null> {
    return await withRetry(async () => {
      const result = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, id))
        .limit(1);
      return result[0] || null;
    });
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    return await withRetry(async () => {
      const [newAttachment] = await db.insert(attachments).values(attachment).returning();
      return newAttachment;
    });
  }

  async deleteAttachment(id: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(attachments).where(eq(attachments.id, id));
    });
  }

  async getContactTimeline(params: { dateFrom: string; dateTo: string; staffId?: string; alumniId?: number; contactType?: string[]; userRole: string; cohortYear?: number[]; trackingStatus?: string[]; needsFollowUp?: string[]; supportCategory?: string[]; employed?: string[]; currentlyEnrolled?: string[]; }): Promise<any[]> {
    return await withRetry(async () => {
      const { dateFrom, dateTo, staffId, alumniId, contactType, cohortYear, trackingStatus, needsFollowUp, supportCategory, employed, currentlyEnrolled } = params;
      
      
      // Build query conditions
      const conditions = [
        gte(alumniInteractions.date, dateFrom),
        lte(alumniInteractions.date, dateTo)
      ];
      
      if (staffId) {
        conditions.push(eq(alumniInteractions.createdBy, staffId));
      }
      
      if (alumniId) {
        conditions.push(eq(alumniInteractions.alumniId, alumniId));
      }
      
      if (contactType && contactType.length > 0) {
        conditions.push(inArray(alumniInteractions.type, contactType));
      }

      // Add alumni-based filters (array-based)
      if (cohortYear && cohortYear.length > 0) {
        conditions.push(inArray(alumni.cohortYear, cohortYear));
      }

      if (trackingStatus && trackingStatus.length > 0) {
        // Handle "unknown" status by matching null/undefined values AND the string "unknown"
        const hasUnknown = trackingStatus.includes('unknown');
        const otherStatuses = trackingStatus.filter(status => status !== 'unknown');
        
        if (hasUnknown && otherStatuses.length > 0) {
          conditions.push(
            or(
              inArray(alumni.trackingStatus, otherStatuses),
              isNull(alumni.trackingStatus),
              eq(alumni.trackingStatus, 'unknown')
            )
          );
        } else if (hasUnknown) {
          conditions.push(
            or(
              isNull(alumni.trackingStatus),
              eq(alumni.trackingStatus, 'unknown')
            )
          );
        } else {
          conditions.push(inArray(alumni.trackingStatus, otherStatuses));
        }
      }

      if (needsFollowUp && needsFollowUp.length > 0) {
        const booleanValues = needsFollowUp.map(val => val === 'true');
        conditions.push(inArray(alumni.needsFollowUp, booleanValues));
      }

      if (supportCategory && supportCategory.length > 0) {
        // Handle 'Unknown' parameter for empty support categories
        const hasUnknown = supportCategory.includes('Unknown');
        const otherCategories = supportCategory.filter(cat => cat !== 'Unknown');
        
        if (hasUnknown && otherCategories.length > 0) {
          conditions.push(
            or(
              inArray(alumni.supportCategory, otherCategories),
              isNull(alumni.supportCategory),
              eq(alumni.supportCategory, '')
            )
          );
        } else if (hasUnknown) {
          conditions.push(
            or(
              isNull(alumni.supportCategory),
              eq(alumni.supportCategory, '')
            )
          );
        } else {
          conditions.push(inArray(alumni.supportCategory, otherCategories));
        }
      }

      if (employed && employed.length > 0) {
        const booleanValues = employed.map(val => val === 'true');
        conditions.push(inArray(alumni.employed, booleanValues));
      }

      if (currentlyEnrolled && currentlyEnrolled.length > 0) {
        const booleanValues = currentlyEnrolled.map(val => val === 'true');
        conditions.push(inArray(alumni.currentlyEnrolled, booleanValues));
      }
      
      // Execute query with joins to get alumni and creator info
      const timelineData = await db
        .select({
          id: alumniInteractions.id,
          date: alumniInteractions.date,
          createdAt: alumniInteractions.createdAt,
          type: alumniInteractions.type,
          overview: alumniInteractions.overview,
          internalSummary: alumniInteractions.internalSummary,
          studentResponded: alumniInteractions.studentResponded,
          needsFollowUp: alumniInteractions.needsFollowUp,
          followUpPriority: alumniInteractions.followUpPriority,
          followUpDate: alumniInteractions.followUpDate,
          // Alumni info
          alumniId: alumni.id,
          alumniFirstName: alumni.firstName,
          alumniLastName: alumni.lastName,
          alumniCohortYear: alumni.cohortYear,
          // Creator info
          createdBy: alumniInteractions.createdBy,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName
        })
        .from(alumniInteractions)
        .innerJoin(alumni, eq(alumniInteractions.alumniId, alumni.id))
        .leftJoin(users, eq(alumniInteractions.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(alumniInteractions.date), desc(alumniInteractions.createdAt));
        
      return timelineData;
    });
  }

  // Alumni task operations
  async getAlumniTasksByMember(alumniId: number): Promise<AlumniTask[]> {
    return await withRetry(async () => {
      return await db.select().from(alumniTasks).where(eq(alumniTasks.alumniId, alumniId));
    });
  }

  async createAlumniTask(task: InsertAlumniTask): Promise<AlumniTask> {
    return await withRetry(async () => {
      const [newTask] = await db.insert(alumniTasks).values(task).returning();
      return newTask;
    });
  }

  async updateAlumniTask(id: number, task: Partial<InsertAlumniTask>): Promise<AlumniTask> {
    return await withRetry(async () => {
      const [updatedTask] = await db
        .update(alumniTasks)
        .set({ ...task, updatedAt: new Date() })
        .where(eq(alumniTasks.id, id))
        .returning();
      return updatedTask;
    });
  }

  async deleteAlumniTask(id: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(alumniTasks).where(eq(alumniTasks.id, id));
    });
  }

  // Scholarship operations
  async getScholarshipsByAlumni(alumniId: number): Promise<Scholarship[]> {
    return await withRetry(async () => {
      return await db.select().from(scholarships).where(eq(scholarships.alumniId, alumniId));
    });
  }

  async createScholarship(scholarship: InsertScholarship): Promise<Scholarship> {
    return await withRetry(async () => {
      const [newScholarship] = await db.insert(scholarships).values(scholarship).returning();
      return newScholarship;
    });
  }

  async updateScholarship(id: number, scholarship: Partial<InsertScholarship>): Promise<Scholarship> {
    return await withRetry(async () => {
      const [updatedScholarship] = await db
        .update(scholarships)
        .set({ ...scholarship, updatedAt: new Date() })
        .where(eq(scholarships.id, id))
        .returning();
      return updatedScholarship;
    });
  }

  async deleteScholarship(id: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(scholarships).where(eq(scholarships.id, id));
    });
  }

  // Alumni metrics operations
  async getAlumniMetricsByMember(alumniId: number): Promise<AlumniMetric[]> {
    return await withRetry(async () => {
      return await db.select().from(alumniMetrics).where(eq(alumniMetrics.alumniId, alumniId));
    });
  }

  async createAlumniMetric(metric: InsertAlumniMetric): Promise<AlumniMetric> {
    return await withRetry(async () => {
      const [newMetric] = await db.insert(alumniMetrics).values(metric).returning();
      return newMetric;
    });
  }

  async updateAlumniMetric(id: number, metric: Partial<InsertAlumniMetric>): Promise<AlumniMetric> {
    return await withRetry(async () => {
      const [updatedMetric] = await db
        .update(alumniMetrics)
        .set(metric)
        .where(eq(alumniMetrics.id, id))
        .returning();
      return updatedMetric;
    });
  }

  async deleteAlumniMetric(id: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(alumniMetrics).where(eq(alumniMetrics.id, id));
    });
  }

  // AI Prompts operations
  async getAiPrompts(userId: string): Promise<AiPrompts | undefined> {
    return await withRetry(async () => {
      const [prompts] = await db.select().from(aiPrompts).where(eq(aiPrompts.userId, userId));
      return prompts;
    });
  }

  async upsertAiPrompts(userId: string, promptsData: Partial<InsertAiPrompts>): Promise<AiPrompts> {
    return await withRetry(async () => {
      const existingPrompts = await this.getAiPrompts(userId);
      
      if (existingPrompts) {
        const [updatedPrompts] = await db
          .update(aiPrompts)
          .set({ ...promptsData, updatedAt: new Date() })
          .where(eq(aiPrompts.userId, userId))
          .returning();
        return updatedPrompts;
      } else {
        const [newPrompts] = await db
          .insert(aiPrompts)
          .values({ ...promptsData, userId })
          .returning();
        return newPrompts;
      }
    });
  }

  // Alumni AI Prompts operations (current system)
  async getAlumniAiPrompts(userId: string): Promise<AlumniAiPrompts | undefined> {
    return await withRetry(async () => {
      const [prompts] = await db.select().from(alumniAiPrompts).where(eq(alumniAiPrompts.userId, userId));
      return prompts;
    });
  }

  async upsertAlumniAiPrompts(userId: string, promptsData: Partial<InsertAlumniAiPrompts>): Promise<AlumniAiPrompts> {
    return await withRetry(async () => {
      const existingPrompts = await this.getAlumniAiPrompts(userId);
      
      if (existingPrompts) {
        const [updatedPrompts] = await db
          .update(alumniAiPrompts)
          .set({ ...promptsData, updatedAt: new Date() })
          .where(eq(alumniAiPrompts.userId, userId))
          .returning();
        return updatedPrompts;
      } else {
        const [newPrompts] = await db
          .insert(alumniAiPrompts)
          .values({ ...promptsData, userId })
          .returning();
        return newPrompts;
      }
    });
  }

  // Audit log operations
  async createAuditLogEntry(entry: InsertAuditLog): Promise<AuditLog> {
    return await withRetry(async () => {
      const [auditEntry] = await db.insert(auditLog).values(entry).returning();
      return auditEntry;
    });
  }

  async getAuditLogsByAlumni(alumniId: number, limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(auditLog)
        .where(eq(auditLog.alumniId, alumniId))
        .orderBy(desc(auditLog.timestamp))
        .limit(limit)
        .offset(offset);
    });
  }

  async updateAlumniWithAudit(id: number, updates: Partial<InsertAlumni>, editorId: string): Promise<Alumni> {
    return await withRetry(async () => {
      // Get current alumni data for comparison
      const [currentAlumni] = await db.select().from(alumni).where(eq(alumni.id, id));
      if (!currentAlumni) {
        throw new Error('Alumni not found');
      }

      // Create audit log entries for changed fields
      for (const [fieldName, newValue] of Object.entries(updates)) {
        const oldValue = (currentAlumni as any)[fieldName];
        
        // Only log if value actually changed
        if (oldValue !== newValue) {
          await this.createAuditLogEntry({
            alumniId: id,
            fieldName,
            oldValue: oldValue?.toString() || null,
            newValue: newValue?.toString() || null,
            editorId,
          });
        }
      }

      // Update the alumni record
      const [updatedAlumni] = await db
        .update(alumni)
        .set(updates)
        .where(eq(alumni.id, id))
        .returning();

      return updatedAlumni;
    });
  }

  // College location operations
  async getAllCollegeLocations(): Promise<CollegeLocation[]> {
    return await withRetry(async () => {
      return await db.select().from(collegeLocations);
    });
  }

  async createCollegeLocation(location: InsertCollegeLocation): Promise<CollegeLocation> {
    return await withRetry(async () => {
      // IPEDS validation: Only allow canonical IPEDS names or approved custom entries
      if (location.standardName) {
        const approvedCustomEntries = new Set([
          "Army National Guard",
          "Marine Corps"
        ]);
        
        // Allow approved custom entries
        if (!approvedCustomEntries.has(location.standardName)) {
          // Validate that standardName exists in IPEDS
          const resolution = await collegeResolutionService.resolveColleges([location.standardName]);
          const match = resolution[0];
          
          if (!match || match.source !== 'ipeds' || match.standardName !== location.standardName) {
            throw new Error(`Invalid standardName: "${location.standardName}" is not a valid IPEDS canonical name. Only IPEDS canonical names are allowed as standardName.`);
          }
        }
      }
      
      const [newLocation] = await db.insert(collegeLocations).values(location).returning();
      return newLocation;
    });
  }

  async updateCollegeLocation(id: number, location: Partial<InsertCollegeLocation>): Promise<CollegeLocation> {
    return await withRetry(async () => {
      // IPEDS validation: Only allow canonical IPEDS names or approved custom entries  
      if (location.standardName) {
        const approvedCustomEntries = new Set([
          "Army National Guard", 
          "Marine Corps"
        ]);
        
        // Allow approved custom entries
        if (!approvedCustomEntries.has(location.standardName)) {
          // Validate that standardName exists in IPEDS
          const resolution = await collegeResolutionService.resolveColleges([location.standardName]);
          const match = resolution[0];
          
          if (!match || match.source !== 'ipeds' || match.standardName !== location.standardName) {
            throw new Error(`Invalid standardName: "${location.standardName}" is not a valid IPEDS canonical name. Only IPEDS canonical names are allowed as standardName.`);
          }
        }
      }
      
      const [updatedLocation] = await db
        .update(collegeLocations)
        .set(location)
        .where(eq(collegeLocations.id, id))
        .returning();
      return updatedLocation;
    });
  }

  // App settings operations
  async getAppSettings(): Promise<AppSettings> {
    return await withRetry(async () => {
      // Get or create the singleton settings record
      const [settings] = await db.select().from(appSettings).limit(1);
      
      if (!settings) {
        // Create default settings if none exist
        const [newSettings] = await db.insert(appSettings).values({
          nationalMedianIncome: 74580,
          lastMedianIncomeUpdate: new Date(),
          nextReminderDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
        }).returning();
        return newSettings;
      }
      
      return settings;
    });
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    return await withRetry(async () => {
      const currentSettings = await this.getAppSettings();
      
      const [updatedSettings] = await db
        .update(appSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.id, currentSettings.id))
        .returning();
      
      return updatedSettings;
    });
  }

  async updateNationalMedianIncome(income: number): Promise<AppSettings> {
    return await withRetry(async () => {
      const currentSettings = await this.getAppSettings();
      
      const [updatedSettings] = await db
        .update(appSettings)
        .set({
          nationalMedianIncome: income,
          lastMedianIncomeUpdate: new Date(),
          nextReminderDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
          updatedAt: new Date(),
        })
        .where(eq(appSettings.id, currentSettings.id))
        .returning();
      
      return updatedSettings;
    });
  }

  async shouldShowQuarterlyReminder(): Promise<boolean> {
    return await withRetry(async () => {
      const settings = await this.getAppSettings();
      const now = new Date();
      return settings.nextReminderDate ? now >= settings.nextReminderDate : false;
    });
  }

  async markReminderShown(): Promise<AppSettings> {
    return await withRetry(async () => {
      const currentSettings = await this.getAppSettings();
      
      const [updatedSettings] = await db
        .update(appSettings)
        .set({
          nextReminderDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
          updatedAt: new Date(),
        })
        .where(eq(appSettings.id, currentSettings.id))
        .returning();
      
      return updatedSettings;
    });
  }
  
  // Invitation operations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    return await withRetry(async () => {
      const [newInvitation] = await db
        .insert(invitations)
        .values(invitation)
        .returning();
      return newInvitation;
    });
  }
  
  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    return await withRetry(async () => {
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1);
      return invitation;
    });
  }
  
  async getInvitationsByInviter(inviterUserId: string): Promise<Invitation[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(invitations)
        .where(eq(invitations.inviterUserId, inviterUserId))
        .orderBy(desc(invitations.createdAt));
    });
  }
  
  async markInvitationAccepted(invitationId: string): Promise<void> {
    return await withRetry(async () => {
      await db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invitationId));
    });
  }
  
  async deleteInvitation(invitationId: string): Promise<void> {
    return await withRetry(async () => {
      await db
        .delete(invitations)
        .where(eq(invitations.id, invitationId));
    });
  }

  async getAllInvitations(): Promise<Invitation[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(invitations)
        .orderBy(desc(invitations.createdAt));
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await withRetry(async () => {
      // LEVEL 4: Database query logging
      console.log('🗄️ [DB] Fetching all users from database...');
      const result = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));
      
      console.log('🗄️ [DB] Query result:', {
        count: result.length,
        roles: result.map(u => u.role),
        sampleUser: result[0] ? {
          id: result[0].id,
          email: result[0].email,
          role: result[0].role,
          roleType: typeof result[0].role,
        } : null,
      });
      
      return result;
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return await withRetry(async () => {
      await db
        .delete(users)
        .where(eq(users.id, userId));
    });
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    return await withRetry(async () => {
      const bcrypt = (await import('bcrypt')).default;
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await db
        .update(users)
        .set({ hashedPassword: hashedPassword })
        .where(eq(users.id, userId));
    });
  }

  async updateUserRole(userId: string, newRole: string): Promise<User> {
    return await withRetry(async () => {
      const [updatedUser] = await db
        .update(users)
        .set({ role: newRole as any, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    });
  }

  // Analytics operations
  async trackEvent(eventData: {
    userId?: string;
    eventType: string;
    eventCategory?: string;
    eventAction?: string;
    eventLabel?: string;
    eventValue?: number;
    metadata?: Record<string, any>;
    sessionId?: string;
    path?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    return await withRetry(async () => {
      await db.insert(analyticsEvents).values({
        userId: eventData.userId,
        eventType: eventData.eventType,
        eventCategory: eventData.eventCategory,
        eventAction: eventData.eventAction,
        eventLabel: eventData.eventLabel,
        eventValue: eventData.eventValue,
        metadata: eventData.metadata || {},
        sessionId: eventData.sessionId,
        path: eventData.path,
        referrer: eventData.referrer,
        userAgent: eventData.userAgent,
        ipAddress: eventData.ipAddress,
      });
    });
  }

  async trackError(errorData: {
    userId?: string;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    metadata?: Record<string, any>;
    userAgent?: string;
  }): Promise<void> {
    return await withRetry(async () => {
      await db.insert(analyticsErrors).values({
        userId: errorData.userId,
        errorType: errorData.errorType,
        errorMessage: errorData.errorMessage,
        errorStack: errorData.errorStack,
        path: errorData.path,
        method: errorData.method,
        statusCode: errorData.statusCode,
        metadata: errorData.metadata || {},
        userAgent: errorData.userAgent,
      });
    });
  }

  async getAnalyticsEvents(params: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<any[]> {
    return await withRetry(async () => {
      let query = db.select().from(analyticsEvents);
      
      const conditions = [];
      if (params.startDate) {
        conditions.push(gte(analyticsEvents.timestamp, params.startDate));
      }
      if (params.endDate) {
        conditions.push(lte(analyticsEvents.timestamp, params.endDate));
      }
      if (params.userId) {
        conditions.push(eq(analyticsEvents.userId, params.userId));
      }
      if (params.eventType) {
        conditions.push(eq(analyticsEvents.eventType, params.eventType));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      query = query.orderBy(desc(analyticsEvents.timestamp)) as any;
      
      if (params.limit) {
        query = query.limit(params.limit) as any;
      }
      
      return await query;
    });
  }

  async getAnalyticsErrors(params: {
    startDate?: Date;
    endDate?: Date;
    errorType?: string;
    limit?: number;
  }): Promise<any[]> {
    return await withRetry(async () => {
      let query = db.select().from(analyticsErrors);
      
      const conditions = [];
      if (params.startDate) {
        conditions.push(gte(analyticsErrors.timestamp, params.startDate));
      }
      if (params.endDate) {
        conditions.push(lte(analyticsErrors.timestamp, params.endDate));
      }
      if (params.errorType) {
        conditions.push(eq(analyticsErrors.errorType, params.errorType));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      query = query.orderBy(desc(analyticsErrors.timestamp)) as any;
      
      if (params.limit) {
        query = query.limit(params.limit) as any;
      }
      
      return await query;
    });
  }

  async getAnalyticsSummary(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalEvents: number;
    totalErrors: number;
    uniqueUsers: number;
    topEvents: Array<{ eventType: string; count: number }>;
    topErrors: Array<{ errorType: string; count: number }>;
  }> {
    return await withRetry(async () => {
      // Get total events
      const [eventsCount] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            gte(analyticsEvents.timestamp, params.startDate),
            lte(analyticsEvents.timestamp, params.endDate)
          )
        );

      // Get total errors
      const [errorsCount] = await db
        .select({ count: count() })
        .from(analyticsErrors)
        .where(
          and(
            gte(analyticsErrors.timestamp, params.startDate),
            lte(analyticsErrors.timestamp, params.endDate)
          )
        );

      // Get unique users (count distinct)
      const uniqueUsersResult = await db
        .selectDistinct({ userId: analyticsEvents.userId })
        .from(analyticsEvents)
        .where(
          and(
            gte(analyticsEvents.timestamp, params.startDate),
            lte(analyticsEvents.timestamp, params.endDate),
            sql`${analyticsEvents.userId} IS NOT NULL`
          )
        );

      // Get top events
      const topEvents = await db
        .select({
          eventType: analyticsEvents.eventType,
          count: count(),
        })
        .from(analyticsEvents)
        .where(
          and(
            gte(analyticsEvents.timestamp, params.startDate),
            lte(analyticsEvents.timestamp, params.endDate)
          )
        )
        .groupBy(analyticsEvents.eventType)
        .orderBy(desc(count()))
        .limit(10);

      // Get top errors
      const topErrors = await db
        .select({
          errorType: analyticsErrors.errorType,
          count: count(),
        })
        .from(analyticsErrors)
        .where(
          and(
            gte(analyticsErrors.timestamp, params.startDate),
            lte(analyticsErrors.timestamp, params.endDate)
          )
        )
        .groupBy(analyticsErrors.errorType)
        .orderBy(desc(count()))
        .limit(10);

      return {
        totalEvents: eventsCount?.count || 0,
        totalErrors: errorsCount?.count || 0,
        uniqueUsers: uniqueUsersResult.length,
        topEvents: topEvents.map(e => ({ eventType: e.eventType, count: Number(e.count) })),
        topErrors: topErrors.map(e => ({ errorType: e.errorType, count: Number(e.count) })),
      };
    });
  }

  // Admin-only operations
  async getAlumniStats(): Promise<{
    totalAlumni: number;
    totalInteractions: number;
    totalTasks: number;
    totalScholarships: number;
    totalMetrics: number;
    totalResources: number;
    totalAuditLogs: number;
  }> {
    return await withRetry(async () => {
      const [alumniCount] = await db
        .select({ count: count() })
        .from(alumni);
      
      const [interactionsCount] = await db
        .select({ count: count() })
        .from(alumniInteractions);
      
      const [tasksCount] = await db
        .select({ count: count() })
        .from(alumniTasks);
      
      const [scholarshipsCount] = await db
        .select({ count: count() })
        .from(scholarships);
      
      const [metricsCount] = await db
        .select({ count: count() })
        .from(alumniMetrics);
      
      const [resourcesCount] = await db
        .select({ count: count() })
        .from(resources);
      
      const [auditLogsCount] = await db
        .select({ count: count() })
        .from(auditLog);
      
      return {
        totalAlumni: alumniCount.count,
        totalInteractions: interactionsCount.count,
        totalTasks: tasksCount.count,
        totalScholarships: scholarshipsCount.count,
        totalMetrics: metricsCount.count,
        totalResources: resourcesCount.count,
        totalAuditLogs: auditLogsCount.count,
      };
    });
  }

  async exportAlumniData(): Promise<Alumni[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(alumni)
        .orderBy(asc(alumni.lastName), asc(alumni.firstName));
    });
  }

  async deleteAllAlumniData(): Promise<{
    deletedAlumni: number;
    deletedInteractions: number;
    deletedTasks: number;
    deletedScholarships: number;
    deletedMetrics: number;
    deletedResources: number;
    deletedAuditLogs: number;
  }> {
    return await withRetry(async () => {
      // Get counts before deletion for reporting
      const stats = await this.getAlumniStats();
      
      // Delete in correct order due to foreign key constraints
      // Delete dependent tables first, then alumni table last
      
      // Delete audit logs (references alumni.id)
      await db.delete(auditLog);
      
      // Delete resources (references alumni.id)
      await db.delete(resources);
      
      // Delete metrics (references alumni.id)
      await db.delete(alumniMetrics);
      
      // Delete scholarships (references alumni.id)
      await db.delete(scholarships);
      
      // Delete tasks (references alumni.id)
      await db.delete(alumniTasks);
      
      // Delete interactions (references alumni.id)
      await db.delete(alumniInteractions);
      
      // Finally delete alumni records
      await db.delete(alumni);
      
      return {
        deletedAlumni: stats.totalAlumni,
        deletedInteractions: stats.totalInteractions,
        deletedTasks: stats.totalTasks,
        deletedScholarships: stats.totalScholarships,
        deletedMetrics: stats.totalMetrics,
        deletedResources: stats.totalResources,
        deletedAuditLogs: stats.totalAuditLogs,
      };
    });
  }

  // Reports operations
  async getUserReports(userId: string): Promise<any[]> {
    return await withRetry(async () => {
      const reports = await db
        .select()
        .from(savedReports)
        .where(eq(savedReports.createdBy, userId))
        .orderBy(desc(savedReports.updatedAt));
      return reports;
    });
  }

  async createReport(reportData: any): Promise<any> {
    return await withRetry(async () => {
      const [report] = await db
        .insert(savedReports)
        .values(reportData)
        .returning();
      return report;
    });
  }

  async updateReport(reportId: number, reportData: any, userId: string): Promise<any> {
    return await withRetry(async () => {
      const [report] = await db
        .update(savedReports)
        .set({ ...reportData, updatedAt: new Date() })
        .where(and(eq(savedReports.id, reportId), eq(savedReports.createdBy, userId)))
        .returning();
      return report;
    });
  }

  async deleteReport(reportId: number, userId: string): Promise<void> {
    await withRetry(async () => {
      await db
        .delete(savedReports)
        .where(and(eq(savedReports.id, reportId), eq(savedReports.createdBy, userId)));
    });
  }
}

export const storage = new DatabaseStorage();