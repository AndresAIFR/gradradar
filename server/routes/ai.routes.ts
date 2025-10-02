import express, { Request, Response } from "express";
import OpenAI from "openai";
import { marked } from "marked";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../emailAuth";
import { sendEmail } from "../emailService";
import { sendSMS } from "../smsService";
import { insertAiPromptsSchema } from "@shared/schema";

/**
 * AI Service Routes
 * Handles OpenAI integration, prompt management, note summarization, and AI-powered content generation
 */

const router = express.Router();

// Validation schemas
const noteSummarySchema = z.object({
  alumniId: z.string().optional(),
  noteContent: z.string().min(1, "Note content is required"),
  noteType: z.enum(['general', 'company', 'parent', 'progress'])
});

const generateSummarySchema = z.object({
  // New field names
  sinceLastSession: z.string().optional(),
  overview: z.string().optional(),
  strengthsWeaknesses: z.string().optional(),
  // Legacy field names (for backward compatibility)
  topicsCovered: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  homeworkAssigned: z.string().optional(),
  nextSteps: z.string().optional(),
  studentName: z.string().optional(),
  parentName: z.string().optional(),
  communicationPreference: z.string().optional(),
  companyNotes: z.string().optional(),
  // Legacy support
  sessionContent: z.string().optional(),
  examType: z.string().optional(),
  targetScore: z.string().optional()
});

const promptPreviewSchema = z.object({
  promptType: z.string().min(1, "Prompt type is required"),
  customPrompt: z.string().min(1, "Custom prompt is required")
});

const companySummarySchema = z.object({
  sessionSummary: z.string().min(1, "Session summary is required"),
  strengthsWeaknesses: z.string().optional(),
  homeworkNextSteps: z.string().optional(),
  companyNotes: z.string().optional(),
  studentName: z.string().optional(),
  date: z.string().optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  existingCompanyNotes: z.string().optional()
});

const emailSendSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "Email content is required"),
  sessionNoteId: z.string().optional()
});

const smsSendSchema = z.object({
  to: z.string().min(1, "Phone number is required"),
  body: z.string().min(1, "Message body is required"),
  sessionNoteId: z.string().optional()
});

// Utility functions for AI prompts
async function getUserPrompts(userId: string) {
  const prompts = await storage.getAiPrompts(userId);
  
  // Default prompts if none exist
  const defaults = {
    parentEmailPrompt: `Hi \${parentName || 'there'},

I hope you're doing well! I wanted to share an update on \${studentName || 'your child'}'s recent tutoring session.

## Session Overview
\${sinceLastSession || overview || topicsCovered || 'Session overview not provided'}

## Strengths & Areas to Focus On
\${strengthsWeaknesses || strengths || weaknesses || 'Strengths and areas for improvement noted'}

## Homework & Next Steps
\${homeworkAssigned || nextSteps || 'Next steps and assignments provided'}

Please let me know if you have any questions or if there's anything specific you'd like me to focus on in our upcoming sessions.

Best regards,
\${tutorName}`,
    
    parentTextPrompt: `Hi \${parentFirstName}, quick update on \${firstName}'s session: \${strengthsSentence}. \${weaknessSentence}. Let me know if you have questions! - \${tutorName}`,
    
    companySummaryPrompt: `# Session Summary: \${studentName}

**Tutor:** \${tutorName}  
**Date:** [Session Date]  
**Duration:** [Session Duration]

## Session Overview
[Detailed summary of topics covered and activities completed]

## Student Performance
**Strengths Demonstrated:**
- [Key strengths and positive observations]

**Areas for Continued Focus:**
- [Areas needing additional practice or support]

## Teaching Methodology
[Description of teaching approaches used and their effectiveness]

## Student Engagement
[Assessment of student participation and motivation levels]

## Progress Indicators
[Quantifiable measures of improvement or achievement]

## Next Steps & Recommendations
[Specific action items and recommendations for continued progress]

\${companyNotes ? "## Company Notes\\n" + companyNotes : ""}`,
    
    isParentEmailLocked: false,
    isParentTextLocked: false,
    isCompanySummaryLocked: false
  };
  
  return { ...defaults, ...prompts };
}

// Convert markdown to HTML
async function markdownToHtml(markdown: string): Promise<string> {
  return marked(markdown);
}

// Test OpenAI API key
router.get("/ai/test-key", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!process.env.OPEN_API_KEY_CSH) {
      return res.status(400).json({ 
        success: false, 
        error: "OPEN_API_KEY_CSH not found in environment" 
      });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY_CSH });

    // Make a simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say 'API key works'" }],
      max_tokens: 10,
      temperature: 0
    });

    res.json({ 
      success: true, 
      message: "API key is working",
      response: response.choices[0]?.message?.content || "No response"
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code || "unknown"
    });
  }
});

// Generate note summary
router.post("/ai/generate-note-summary", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { alumniId, noteContent, noteType } = noteSummarySchema.parse(req.body);
    
    if (!process.env.OPEN_API_KEY_CSH) {
      return res.status(400).json({ message: "OpenAI API key not configured" });
    }
    
    const rawApiKey = process.env.OPEN_API_KEY_CSH;
    
    // Clean the API key by trimming whitespace and checking for invisible chars
    const cleanApiKey = rawApiKey.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Validate API key format
    const apiKeyRegex = /^sk-proj-[a-zA-Z0-9]{32}T3BlbkFJ[a-zA-Z0-9]{32}$/;
    const isValidFormat = apiKeyRegex.test(cleanApiKey);
    
    if (!isValidFormat) {
      // Log validation details for debugging but continue anyway
    }
    
    // Test OpenAI client creation
    let openai;
    try {
      openai = new OpenAI({
        apiKey: cleanApiKey,
      });
    } catch (clientError: any) {
      return res.status(500).json({ message: "Failed to create OpenAI client", error: clientError.message });
    }
    
    // Create a prompt based on note type
    const noteTypePrompts = {
      general: `Role: You are a copy-editor for an alumni-tracking CRM.
Goal: Rewrite the note verbatim in meaning, polished in style.
Hard rules (must obey)

No new content, no inferences, no praise, no advice.

Keep every fact that appears.

Preserve paragraph breaks; one rewritten paragraph per input paragraph.

Use plain factual language. Avoid evaluative adjectives unless they exist in the note.

If (and only if) the note already contains clear next steps, list them under "Action Items"; otherwise omit the section.

Hard cap: original word-count × 1.2.

Audience: internal staff only.`,
      company: "Summarize this company note for internal use. Focus on strategic information and next steps for the organization.",
      parent: "Summarize this parent communication log. Focus on key points discussed and any follow-up actions needed.",
      progress: "Summarize this progress note. Focus on achievements, challenges and recommended next steps."
    };
    
    const prompt = noteTypePrompts[noteType];
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: noteContent }
        ],
        max_tokens: Math.min(Math.ceil(noteContent.split(' ').length * 1.2), 1000),
        temperature: 0.3
      });

      const summary = completion.choices[0]?.message?.content || "Summary could not be generated";
      res.json({ summary });
      
    } catch (apiError: any) {
      res.status(500).json({ message: "Failed to generate summary", error: apiError.message });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to generate summary" });
  }
});

// Generate comprehensive summaries
router.post("/ai/generate-summary", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = generateSummarySchema.parse(req.body);
    const { 
      sinceLastSession,
      overview,
      strengthsWeaknesses,
      topicsCovered, 
      strengths, 
      weaknesses, 
      homeworkAssigned, 
      nextSteps,
      studentName,
      parentName,
      communicationPreference,
      companyNotes,
      sessionContent, 
      examType, 
      targetScore 
    } = validatedData;

    // Check if we have structured data or legacy content
    const hasStructuredData = overview || topicsCovered || strengthsWeaknesses || strengths || weaknesses || homeworkAssigned || nextSteps;
    
    if (!hasStructuredData && !sessionContent) {
      return res.status(400).json({ message: "Session content is required" });
    }

    // Get user's custom prompts and profile data
    const user = req.user as any;
    const userId = user?.id;
    
    const prompts = await getUserPrompts(userId);
    
    // Get user profile for tutorName
    const userProfile = await storage.getUser(userId);
    const tutorName = userProfile?.firstName || 'Your Tutor';
    
    // Check if user has set their name
    if (!userProfile?.firstName) {
      return res.status(400).json({ 
        message: "Please set your name in your profile settings before generating summaries." 
      });
    }
    
    if (hasStructuredData) {
      // Replace template variables in prompts
      const replaceTemplateVars = (template: string) => {
        const firstName = studentName?.split(' ')[0] || 'the student';
        const parentFirstName = parentName?.split(' ')[0] || 'there';
        const homeworkReplacement = homeworkAssigned || 'No homework assigned this session';
        
        return template
          .replace(/\$\{tutorName\}/g, tutorName)
          .replace(/\$\{parentName\}/g, parentName || 'there')
          .replace(/\$\{parentFirstName\}/g, parentFirstName)
          .replace(/\$\{firstName\}/g, firstName)
          .replace(/\$\{studentFirstName\}/g, firstName)
          .replace(/\$\{studentName\}/g, studentName || 'the student')
          .replace(/\$\{strengthsSentence\}/g, strengths || 'Good progress made')
          .replace(/\$\{weaknessSentence\}/g, weaknesses || 'Areas to continue practicing')
          .replace(/\$\{sinceLastSession\}/g, sinceLastSession || 'Session topics covered')
          .replace(/\$\{overview\}/g, overview || topicsCovered || 'Session overview')
          .replace(/\$\{topicsCovered\}/g, topicsCovered || overview || 'Topics covered in session')
          .replace(/\$\{strengthsWeaknesses\}/g, strengthsWeaknesses || (strengths && weaknesses ? `${strengths}. ${weaknesses}` : 'Progress noted'))
          .replace(/\$\{strengths\}/g, strengths || 'Strengths observed')
          .replace(/\$\{weaknesses\}/g, weaknesses || 'Areas for improvement')
          .replace(/\$\{homeworkAssigned\}/g, homeworkReplacement)
          .replace(/\$\{nextSteps\}/g, nextSteps || 'Continue practicing')
          .replace(/\$\{companyNotes\}/g, companyNotes || '');
      };

      // Generate different types of summaries
      const parentEmailSummary = replaceTemplateVars(prompts.parentEmailPrompt || '');
      const parentTextSummary = replaceTemplateVars(prompts.parentTextPrompt || '');
      
      // Convert markdown to HTML for rich text editor
      const parentEmailHtml = await markdownToHtml(parentEmailSummary);
      
      res.json({ 
        parentEmailSummary: parentEmailHtml,
        parentTextSummary,
        useCustomPrompts: true
      });
      
    } else {
      // Legacy mode: use OpenAI to generate content
      if (!process.env.OPEN_API_KEY_CSH) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPEN_API_KEY_CSH,
      });

      const prompt = `Based on this tutoring session content, generate three different summaries:

Session Content: ${sessionContent}
Student Name: ${studentName || 'Student'}
Parent Name: ${parentName || 'Parent'}
Exam Type: ${examType || 'General'}
Target Score: ${targetScore || 'N/A'}

Please generate:

1. PARENT EMAIL (Professional, detailed):
- Start with "Hi [Parent Name]"
- Include session overview, strengths, areas for improvement, homework
- Professional but warm tone
- End with tutor signature

2. PARENT TEXT (Brief, friendly):
- Max 160 characters
- Quick update format
- Include key takeaway

3. COMPANY SUMMARY (Internal, strategic):
- Bullet points
- Focus on student progress metrics
- Include next steps for company planning

Format as JSON with keys: parentEmailSummary, parentTextSummary, companySummary`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0.7
        });

        const response = completion.choices[0]?.message?.content || "{}";
        
        try {
          const summaries = JSON.parse(response);
          
          // Convert markdown to HTML for rich text editor
          const parentEmailHtml = await markdownToHtml(summaries.parentEmailSummary || '');
          
          res.json({
            parentEmailSummary: parentEmailHtml,
            parentTextSummary: summaries.parentTextSummary || '',
            companySummary: summaries.companySummary || '',
            useCustomPrompts: false
          });
        } catch (parseError) {
          // Fallback if JSON parsing fails
          res.json({
            parentEmailSummary: response,
            parentTextSummary: "Summary generated - please check email version",
            companySummary: "Please see email summary for details",
            useCustomPrompts: false
          });
        }
      } catch (apiError: any) {
        res.status(500).json({ message: "Failed to generate AI summary", error: apiError.message });
      }
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to generate summary" });
  }
});

// Get AI prompts for user
router.get('/ai-prompts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID not found" });
    }

    const prompts = await storage.getAiPrompts(userId);
    res.json(prompts || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch AI prompts" });
  }
});

// Save AI prompts for user
router.post('/ai-prompts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID not found" });
    }

    const {
      parentEmailPrompt,
      parentTextPrompt,
      companySummaryPrompt,
      isParentEmailLocked,
      isParentTextLocked,
      isCompanySummaryLocked,
    } = insertAiPromptsSchema.omit({ userId: true }).parse(req.body);

    const prompts = await storage.upsertAiPrompts(userId, {
      parentEmailPrompt,
      parentTextPrompt,
      companySummaryPrompt,
      isParentEmailLocked,
      isParentTextLocked,
      isCompanySummaryLocked,
    });

    res.json(prompts);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to save AI prompts" });
  }
});

// AI Prompt Preview endpoint
router.post('/ai-prompts/preview', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { promptType, customPrompt } = promptPreviewSchema.parse(req.body);

    // Get user profile for tutorName
    const user = req.user as any;
    const userId = user?.id;
    const userProfile = await storage.getUser(userId);
    const tutorName = userProfile?.firstName || 'Your Tutor';
    
    // Check if user has set their name
    if (!userProfile?.firstName) {
      return res.status(400).json({ 
        message: "Please set your name in your profile settings before previewing prompts." 
      });
    }

    // Sample session data from Jane Smith's GRE session
    const sampleSessionData = {
      studentName: "Jane Smith",
      parentName: "Margaret Smith",
      tutorName: tutorName,
      date: "June 25, 2025",
      duration: 60,
      topicsCovered: "Jane stated she worked on:\\n-Working on vocab database (tagging cards for pos, neg, neutral)\\nDef, ex. Sentence, syn/ant, etc.\\n-Found top score essay\\n-Read & wrote model outline\\n-Read a 5 as well to understand diff between 5 and 6\\n-Kaplan has online GRE quizzes\\nRegistered book to access those quizzes\\n-Quizzes are setup to imitate the GRE\\nHas custom quizzes (will use after finishing sections/chapters)—though quizzes are easier than book questions\\n\\nSession Notes:\\nworkd okn problems she got wrong form hw\\nworked on ratios & number theory\\nWe also worked on geo such as volume of a cylinder",
      strengths: "strengths/weaknesses\\nNeeds to work on ratios (using ratio boxes)\\nDoing much better with geo (has bene practicing alot on own)",
      weaknesses: "",
      companyNotes: "need to talk to Jane's mom about when she'll take the acutal GRE",
      homeworkAssigned: `date
quant
verbal
other
Thur
6/26


Kaplan Ch. 16
Kaplan Ch. 8
Anki
Fri
6/27
Kaplan Ch. 17


Kaplan Ch. 8
Anki
Sat
6/28
Kaplan Ch. 18
Kaplan Online
Anki
Sun
6/29
Magoosh 
Mock Exam
Anki
Mon
6/30
Magoosh 
Mock Exam
Anki`,
      nextSteps: ""
    };

    // Replace template variables in the custom prompt
    const replaceTemplateVars = (template: string) => {
      const firstName = sampleSessionData.studentName.split(' ')[0];
      const parentFirstName = sampleSessionData.parentName.split(' ')[0];
      
      return template
        .replace(/\$\{tutorName\}/g, sampleSessionData.tutorName)
        .replace(/\$\{parentName\}/g, sampleSessionData.parentName)
        .replace(/\$\{parentFirstName\}/g, parentFirstName)
        .replace(/\$\{firstName\}/g, firstName)
        .replace(/\$\{studentFirstName\}/g, firstName)
        .replace(/\$\{studentName\}/g, sampleSessionData.studentName)
        .replace(/\$\{strengthsSentence\}/g, sampleSessionData.strengths)
        .replace(/\$\{weaknessSentence\}/g, sampleSessionData.weaknesses || 'Continue current practice routine')
        .replace(/\$\{sinceLastSession\}/g, sampleSessionData.topicsCovered)
        .replace(/\$\{overview\}/g, sampleSessionData.topicsCovered)
        .replace(/\$\{topicsCovered\}/g, sampleSessionData.topicsCovered)
        .replace(/\$\{strengthsWeaknesses\}/g, sampleSessionData.strengths)
        .replace(/\$\{strengths\}/g, sampleSessionData.strengths)
        .replace(/\$\{weaknesses\}/g, sampleSessionData.weaknesses || 'Continue current approach')
        .replace(/\$\{homeworkAssigned\}/g, sampleSessionData.homeworkAssigned)
        .replace(/\$\{nextSteps\}/g, sampleSessionData.nextSteps || 'Continue with assigned homework')
        .replace(/\$\{companyNotes\}/g, sampleSessionData.companyNotes);
    };

    const preview = replaceTemplateVars(customPrompt);
    
    // Convert to HTML if it looks like markdown
    const previewHtml = await markdownToHtml(preview);
    
    res.json({ preview: previewHtml });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to generate preview" });
  }
});

// Generate company summary
router.post('/ai/generate-company-summary', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = companySummarySchema.parse(req.body);
    const { sessionSummary, strengthsWeaknesses, homeworkNextSteps, companyNotes, studentName, date, duration, existingCompanyNotes } = validatedData;
    
    const user = req.user as any;
    const userId = user?.id;
    const prompts = await getUserPrompts(userId);
    
    // Get user profile for tutorName
    const userProfile = await storage.getUser(userId);
    const tutorName = userProfile?.firstName || 'Your Tutor';
    
    // Check if user has set their name
    if (!userProfile?.firstName) {
      return res.status(400).json({ 
        message: "Please set your name in your profile settings before generating summaries." 
      });
    }

    if (!process.env.OPEN_API_KEY_CSH) {
      return res.status(400).json({ message: "OpenAI API key not configured" });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPEN_API_KEY_CSH,
    });

    // Replace template variables in company prompt
    const replaceTemplateVars = (template: string) => {
      return template
        .replace(/\$\{tutorName\}/g, tutorName)
        .replace(/\$\{studentName\}/g, studentName || 'Student')
        .replace(/\$\{firstName\}/g, studentName?.split(' ')[0] || 'Student')
        .replace(/\$\{companyNotes\}/g, companyNotes || '');
    };

    const prompt = `${replaceTemplateVars(prompts.companySummaryPrompt || '')}

Session Information:
- Student: ${studentName || 'Student'}
- Tutor: ${tutorName}
- Date: ${date || 'Not specified'}
- Duration: ${duration || 'Not specified'}

Session Summary:
${sessionSummary}

${strengthsWeaknesses ? `Strengths & Areas of Focus:\n${strengthsWeaknesses}` : ''}

${homeworkNextSteps ? `Homework & Next Steps:\n${homeworkNextSteps}` : ''}

${companyNotes ? `Company Notes:\n${companyNotes}` : ''}

${existingCompanyNotes ? `7. **Company Notes**: At the bottom, include a "Company Notes" section that takes the existing company notes and improves their grammar, clarity, and professional tone while preserving all the original meaning and content. Clean up any informal language and make it sound polished and professional.` : ''}

Format in markdown with clear sections. Use professional language suitable for internal stakeholders. Focus on:
- Quantifiable results where possible
- Teaching methodology effectiveness
- Student engagement levels
- Academic progress indicators
- Recommended follow-up actions`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.7
      });

      const companySummary = completion.choices[0]?.message?.content || "Company summary could not be generated";
      
      // Convert markdown to HTML for rich text editor
      const summaryHtml = await markdownToHtml(companySummary);

      res.json({ companySummary: summaryHtml });
    } catch (apiError: any) {
      res.status(500).json({ message: "Failed to generate company summary", error: apiError.message });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to generate company summary" });
  }
});

// Send AI-generated email
router.post('/send-email', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { to, subject, html, sessionNoteId } = emailSendSchema.parse(req.body);

    if (!to || !subject || !html) {
      return res.status(400).json({ message: "Missing required email fields" });
    }

    // Send the email
    const success = await sendEmail({
      to,
      from: process.env.GMAIL_USER || 'noreply@tutortracker.com',
      subject,
      html
    });

    if (success) {
      const sentAt = new Date();
      res.json({ success: true, message: "Email sent successfully", emailSentAt: sentAt });
    } else {
      res.status(500).json({ success: false, message: "Failed to send email" });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to send email" });
  }
});

// Send AI-generated SMS
router.post('/send-sms', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { to, body, sessionNoteId } = smsSendSchema.parse(req.body);

    if (!to || !body) {
      return res.status(400).json({ message: "Phone number and message are required" });
    }

    // Use Twilio SMS only
    const success = await sendSMS({
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER!,
      body: body
    });

    if (success) {
      const sentAt = new Date();
      res.json({ success: true, message: "SMS sent successfully", sentAt });
    } else {
      res.status(500).json({ success: false, message: "Failed to send SMS" });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to send SMS" });
  }
});

export { router as aiRoutes };