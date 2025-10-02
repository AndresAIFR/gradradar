import express, { Request, Response } from "express";
import { createServer, Server } from "http";
import crypto from "crypto";
import passport from "passport";
import { insertAlumniSchema, type Alumni } from "@shared/schema";
import { isAuthenticated } from "./emailAuth";
import { setupSession, setupEmailAuth } from "./emailAuth";
import { storage } from "./storage";

// Mock alumni data for frontend development
const mockAlumni: Alumni[] = [
  {
    id: 1,
    firstName: "Omar",
    lastName: "Abdoulaye",
    cohortYear: 2024,
    dateOfBirth: null,
    profileImageUrl: null,
    compSciHighEmail: "omar.abdoulaye@compscihigh.edu",
    personalEmail: null,
    collegeEmail: null,
    preferredEmail: "omar.abdoulaye@compscihigh.edu",
    phone: "(929) 360-9317",
    instagramHandle: null,
    twitterHandle: null,
    tiktokHandle: null,
    linkedinHandle: null,
    highSchoolGpa: null,
    householdSize: null,
    householdIncome: null,
    trackingStatus: "on-track",
    supportCategory: "Persistence - College",
    collegeAttending: "SUNY Broome",
    collegeMajor: "Health Science",
    collegeMinor: null,
    degreeTrack: null,
    intendedCareerPath: null,
    currentlyEnrolled: true,
    enrollmentStatus: "enrolled",
    expectedGraduationDate: null,
    receivedScholarships: false,
    scholarshipsRequiringRenewal: null,
    enrolledInOpportunityProgram: false,
    transferStudentStatus: null,
    collegeGpa: "3.2",
    trainingProgramName: null,
    trainingProgramType: null,
    trainingProgramLocation: null,
    trainingProgramPay: null,
    trainingStartDate: null,
    trainingEndDate: null,
    trainingDegreeCertification: null,
    onCourseEconomicLiberation: false,
    employed: false,
    employmentType: null,
    employerName: null,
    latestAnnualIncome: null,
    latestIncomeDate: null,
    contactId: "249164641",
    matriculation: "SUNY Broome",
    collegeOrWorkforce: "College",
    track: "On Track",
    connectedAsOf: null,
    attemptedOutreach: null,
    circleBack: false,
    transcriptCollected: false,
    needsTutor: false,
    subjectSupport: null,
    grouping: "Low Needs",
    lastContactDate: null,
    notes: "Should still be fine. Had a 3.2 on campus and wants to transfer to Bing",
    needsFollowUp: false,
    flaggedForOutreach: false,
    reminderDate: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    firstName: "Maria",
    lastName: "Rodriguez",
    cohortYear: 2023,
    dateOfBirth: null,
    profileImageUrl: null,
    compSciHighEmail: "maria.rodriguez@compscihigh.edu",
    personalEmail: "maria.r@gmail.com",
    collegeEmail: null,
    preferredEmail: "maria.r@gmail.com",
    phone: "(347) 555-0123",
    instagramHandle: null,
    twitterHandle: null,
    tiktokHandle: null,
    linkedinHandle: null,
    highSchoolGpa: null,
    householdSize: null,
    householdIncome: null,
    trackingStatus: "near-track",
    supportCategory: "Persistence - College",
    collegeAttending: "Hunter College",
    collegeMajor: "Computer Science",
    collegeMinor: null,
    degreeTrack: null,
    intendedCareerPath: null,
    currentlyEnrolled: true,
    enrollmentStatus: "enrolled",
    expectedGraduationDate: null,
    receivedScholarships: true,
    scholarshipsRequiringRenewal: null,
    enrolledInOpportunityProgram: true,
    transferStudentStatus: null,
    collegeGpa: "3.8",
    trainingProgramName: null,
    trainingProgramType: null,
    trainingProgramLocation: null,
    trainingProgramPay: null,
    trainingStartDate: null,
    trainingEndDate: null,
    trainingDegreeCertification: null,
    onCourseEconomicLiberation: false,
    employed: false,
    employmentType: null,
    employerName: null,
    latestAnnualIncome: null,
    latestIncomeDate: null,
    contactId: "249164642",
    matriculation: "Hunter College",
    collegeOrWorkforce: "College",
    track: "Near Track",
    connectedAsOf: null,
    attemptedOutreach: null,
    circleBack: false,
    transcriptCollected: true,
    needsTutor: false,
    subjectSupport: null,
    grouping: "Medium Needs",
    lastContactDate: null,
    notes: "Doing well academically, but struggling with time management",
    needsFollowUp: true,
    flaggedForOutreach: false,
    reminderDate: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    firstName: "James",
    lastName: "Chen",
    cohortYear: 2022,
    dateOfBirth: null,
    profileImageUrl: null,
    compSciHighEmail: "james.chen@compscihigh.edu",
    personalEmail: "jchen.dev@gmail.com",
    collegeEmail: null,
    preferredEmail: "jchen.dev@gmail.com",
    phone: "(917) 555-0456",
    instagramHandle: null,
    twitterHandle: null,
    tiktokHandle: null,
    linkedinHandle: "james-chen-dev",
    highSchoolGpa: null,
    householdSize: null,
    householdIncome: null,
    trackingStatus: "on-track",
    supportCategory: "Success-Employed",
    collegeAttending: "NYU",
    collegeMajor: "Computer Science",
    collegeMinor: null,
    degreeTrack: null,
    intendedCareerPath: null,
    currentlyEnrolled: false,
    enrollmentStatus: "graduated",
    expectedGraduationDate: null,
    receivedScholarships: false,
    scholarshipsRequiringRenewal: null,
    enrolledInOpportunityProgram: false,
    transferStudentStatus: null,
    collegeGpa: "3.6",
    trainingProgramName: null,
    trainingProgramType: null,
    trainingProgramLocation: null,
    trainingProgramPay: null,
    trainingStartDate: null,
    trainingEndDate: null,
    trainingDegreeCertification: null,
    onCourseEconomicLiberation: true,
    employed: true,
    employmentType: "full-time",
    employerName: "Google",
    latestAnnualIncome: "$125,000",
    latestIncomeDate: new Date("2024-01-15"),
    contactId: "249164643",
    matriculation: "NYU",
    collegeOrWorkforce: "College",
    track: "On Track",
    connectedAsOf: null,
    attemptedOutreach: null,
    circleBack: false,
    transcriptCollected: true,
    needsTutor: false,
    subjectSupport: null,
    grouping: "Success Story",
    lastContactDate: null,
    notes: "Graduated and working at Google as a Software Engineer",
    needsFollowUp: false,
    flaggedForOutreach: false,
    reminderDate: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    firstName: "Sarah",
    lastName: "Williams",
    cohortYear: 2021,
    dateOfBirth: null,
    profileImageUrl: null,
    compSciHighEmail: "sarah.williams@compscihigh.edu",
    personalEmail: "sarah.w@outlook.com",
    collegeEmail: null,
    preferredEmail: "sarah.w@outlook.com",
    phone: "(646) 555-0789",
    instagramHandle: null,
    twitterHandle: null,
    tiktokHandle: null,
    linkedinHandle: null,
    highSchoolGpa: null,
    householdSize: null,
    householdIncome: null,
    trackingStatus: "off-track",
    supportCategory: "Persistence - Job Training",
    collegeAttending: null,
    collegeMajor: null,
    collegeMinor: null,
    degreeTrack: null,
    intendedCareerPath: null,
    currentlyEnrolled: false,
    enrollmentStatus: "not-enrolled",
    expectedGraduationDate: null,
    receivedScholarships: false,
    scholarshipsRequiringRenewal: null,
    enrolledInOpportunityProgram: false,
    transferStudentStatus: null,
    collegeGpa: null,
    trainingProgramName: "Per Scholas",
    trainingProgramType: "Software Engineering",
    trainingProgramLocation: "Brooklyn, NY",
    trainingProgramPay: null,
    trainingStartDate: new Date("2024-03-01"),
    trainingEndDate: new Date("2024-08-15"),
    trainingDegreeCertification: "Certificate",
    onCourseEconomicLiberation: false,
    employed: false,
    employmentType: null,
    employerName: null,
    latestAnnualIncome: null,
    latestIncomeDate: null,
    contactId: "249164644",
    matriculation: "Job Training",
    collegeOrWorkforce: "Job Training",
    track: "Off Track",
    connectedAsOf: null,
    attemptedOutreach: null,
    circleBack: true,
    transcriptCollected: false,
    needsTutor: false,
    subjectSupport: null,
    grouping: "High Needs",
    lastContactDate: null,
    notes: "Completing coding bootcamp, looking for entry-level developer role",
    needsFollowUp: true,
    flaggedForOutreach: true,
    reminderDate: new Date("2024-12-01"),
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export async function registerRoutes(app: express.Express): Promise<Server> {
  // Initialize authentication middleware
  setupSession(app);
  setupEmailAuth();
  
  // Create HTTP server
  const server = createServer(app);

  // Alumni CRUD operations
  app.get("/api/alumni", isAuthenticated, async (req, res) => {
    try {
      const alumni = await storage.getAlumni();
      // If no alumni in database, seed with mock data for demo
      if (alumni.length === 0) {
        
        for (const mockAlum of mockAlumni) {
          const { id, createdAt, updatedAt, ...insertData } = mockAlum;
          await storage.createAlumni(insertData);
        }
        const seededAlumni = await storage.getAlumni();
        res.json(seededAlumni);
      } else {
        res.json(alumni);
      }
    } catch (error) {
      
      res.status(500).json({ message: "Failed to fetch alumni" });
    }
  });

  app.get("/api/alumni/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alumnus = await storage.getAlumniMember(id);
      if (!alumnus) {
        return res.status(404).json({ message: "Alumni not found" });
      }
      res.json(alumnus);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to fetch alumni" });
    }
  });

  app.post("/api/alumni", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAlumniSchema.parse(req.body);
      const newAlumnus = await storage.createAlumni(validatedData);
      res.status(201).json(newAlumnus);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to create alumni" });
    }
  });

  app.patch("/api/alumni/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAlumniSchema.partial().parse(req.body);
      const updatedAlumnus = await storage.updateAlumni(id, validatedData);
      if (!updatedAlumnus) {
        return res.status(404).json({ message: "Alumni not found" });
      }
      res.json(updatedAlumnus);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to update alumni" });
    }
  });

  app.post("/api/alumni/remove-duplicates", isAuthenticated, async (req, res) => {
    try {
      const duplicatesRemoved = await storage.removeDuplicateAlumni();
      res.json({ 
        message: "Duplicates removed successfully",
        duplicatesRemoved
      });
    } catch (error) {
      
      res.status(500).json({ message: "Failed to remove duplicates" });
    }
  });

  // Simplified routes for existing endpoints to prevent errors
  app.get("/api/students", isAuthenticated, async (req, res) => {
    res.json([]);
  });

  app.get("/api/auth/user", async (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // Email auth routes for registration and login
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash(password, 12);

      // Create user
      const newUser = {
        id: crypto.randomUUID(),
        email,
        firstName,
        lastName,
        hashedPassword,
        emailVerified: true, // Skip verification in development
        authMethod: 'email',
        role: 'staff' as const,
      };

      await storage.upsertUser(newUser);
      
      res.status(201).json({ 
        message: "Registration successful",
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          firstName: newUser.firstName, 
          lastName: newUser.lastName 
        }
      });
    } catch (error) {
      
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        
        res.json({ 
          message: "Login successful",
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          }
        });
      });
    })(req, res, next);
  });

  // Reports API routes
  app.get("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const reports = await storage.getUserReports((req.user as any).id);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/reports", isAuthenticated, async (req, res) => {
    try {
      console.log('BACKEND - POST /api/reports endpoint hit');
      console.log('BACKEND - Request user:', req.user);
      console.log('BACKEND - Request body:', req.body);
      
      const reportData = {
        ...req.body,
        createdBy: (req.user as any).id,
      };
      
      console.log('BACKEND - Final reportData to save:', reportData);
      
      const report = await storage.createReport(reportData);
      
      console.log('BACKEND - Report created successfully:', report);
      res.json(report);
    } catch (error) {
      console.log('BACKEND - Error creating report:', error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.put("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.updateReport(reportId, req.body, (req.user as any).id);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      await storage.deleteReport(reportId, (req.user as any).id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  return server;
}