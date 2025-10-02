import express, { Request, Response } from "express";
import passport from "passport";
import { storage } from "../storage";
import { isAuthenticated } from "../emailAuth";
import { requireAdmin } from "../middleware/permissions";
import { 
  generateToken, 
  sendInvitationEmail, 
  sendPasswordResetEmail 
} from "../emailAuth";
import { sendEmail } from "../emailService";
import { sendSMS } from "../smsService";
import { z } from "zod";

/**
 * Authentication and User Management Routes
 * Handles login, registration, invitations, profile management, and user administration
 */

const router = express.Router();

// User profile update schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(), // Base64 image data
});

// Password reset schemas
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

// Invitation schema
const invitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['admin', 'staff', 'alumni'], {
    errorMap: () => ({ message: "Role must be admin, staff, or alumni" })
  })
});

// Admin password reset schema
const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

// Get current authenticated user
router.get('/auth/user', async (req: Request, res: Response) => {
  if (req.user) {
    const user = req.user as any;
    try {
      const dbUser = await storage.getUser(user.id);
      res.json(dbUser);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// Login endpoint
router.post('/auth/login', (req: Request, res: Response, next) => {
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

// Logout endpoint
router.post('/auth/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    
    // Destroy the session completely
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return res.status(500).json({ success: false, message: 'Session destruction failed' });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// Update user profile
router.put('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const user = req.user as any;
    const userId = user?.id;
    
    const updatedUser = await storage.updateUser(userId, validatedData);
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Send invitation (admin only)
router.post('/invitations', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, role } = invitationSchema.parse(req.body);
    const user = req.user as any;
    const userId = user?.id;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Check if invitation already exists
    const existingInvitations = await storage.getInvitationsByInviter(userId);
    const existingInvitation = existingInvitations.find(inv => 
      inv.email.toLowerCase() === email.toLowerCase() && !inv.acceptedAt
    );
    
    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent to this email' });
    }
    
    // Get inviter info for email
    const dbUser = await storage.getUser(userId);
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate invitation token
    const invitationToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create invitation
    const invitation = await storage.createInvitation({
      inviterUserId: userId,
      email,
      token: invitationToken,
      role,
      expiresAt,
    });
    
    // Send invitation email
    await sendInvitationEmail(email, invitationToken, dbUser.firstName || 'Admin');
    
    res.status(201).json({ 
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

// Get all users and invitations (admin only) - unified user management
router.get('/admin/users', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  // Get all users and all invitations
  const [allUsers, allInvitations] = await Promise.all([
    storage.getAllUsers(),
    storage.getAllInvitations()
  ]);
  
  // Create unified user list
  const userList = [];
  
  // Add existing users
  for (const existingUser of allUsers) {
    userList.push({
      id: existingUser.id,
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      role: existingUser.role,
      status: 'active',
      createdAt: existingUser.createdAt,
      type: 'user'
    });
  }
  
  // Add pending invitations (only if no user exists with that email)
  for (const invitation of allInvitations) {
    // Skip if user already exists or invitation already accepted
    if (invitation.acceptedAt) continue;
    const existingUser = allUsers.find(u => u.email?.toLowerCase() === invitation.email.toLowerCase());
    if (existingUser) continue;
    
    const status = new Date() > invitation.expiresAt ? 'expired' : 'pending';
    userList.push({
      id: invitation.id,
      email: invitation.email,
      firstName: '',
      lastName: '',
      role: invitation.role,
      status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      token: invitation.token,
      type: 'invitation'
    });
  }
  
  res.json(userList);
});

// Delete user (admin only)
router.delete('/admin/users/:userId', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  const user = req.user as any;
  const currentUserId = user?.id;
  const { userId: targetUserId } = req.params;
  
  // Don't allow admins to delete themselves
  if (targetUserId === currentUserId) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }

  await storage.deleteUser(targetUserId);
  res.status(204).send();
});

// Reset user password (admin only)
router.post("/admin/users/:userId/reset-password", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { newPassword } = adminResetPasswordSchema.parse(req.body);
    const { userId: targetUserId } = req.params;

    await storage.resetUserPassword(targetUserId, newPassword);
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// Get invitations sent by current user (admin only) - keeping for backwards compatibility
router.get('/invitations', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  const user = req.user as any;
  const userId = user?.id;
  
  const invitations = await storage.getInvitationsByInviter(userId);
  
  // Add status field based on acceptedAt and expiration
  const invitationsWithStatus = invitations.map(inv => ({
    ...inv,
    status: inv.acceptedAt 
      ? 'accepted' 
      : new Date() > inv.expiresAt 
        ? 'expired' 
        : 'pending'
  }));
  
  res.json(invitationsWithStatus);
});

// Delete invitation (admin only)
router.delete('/invitations/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await storage.deleteInvitation(id);
  res.status(204).send();
});

// Forgot password endpoint
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    
    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // For security, return success even if user doesn't exist
      return res.json({ message: 'If an account exists with that email, you will receive a password reset link.' });
    }
    
    // Generate reset token
    const resetToken = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store reset token
    await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
    
    // Send reset email
    await sendPasswordResetEmail(user, resetToken);
    
    res.json({ message: 'If an account exists with that email, you will receive a password reset link.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to process password reset request" });
  }
});

// Reset password endpoint
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    
    // Verify reset token
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken || resetToken.used) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }
    
    // Reset password
    await storage.resetUserPassword(resetToken.userId, newPassword);
    
    // Mark token as used
    await storage.markPasswordResetTokenUsed(resetToken.id);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// Email verification endpoint
router.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Verification token is required' });
  }
  
  const verificationToken = await storage.getEmailVerificationToken(token);
  
  if (!verificationToken || verificationToken.used) {
    return res.status(400).json({ message: 'Invalid or expired verification token' });
  }

  if (new Date() > verificationToken.expiresAt) {
    return res.status(400).json({ message: 'Verification token has expired' });
  }

  // Verify the user's email
  await storage.verifyUserEmail(verificationToken.userId);
  
  // Mark token as used
  await storage.markEmailVerificationTokenUsed(verificationToken.id);
  
  res.json({ message: 'Email verified successfully' });
});

// Send email endpoint
router.post('/sendEmail', isAuthenticated, async (req: Request, res: Response) => {
  const { to, subject, body, sessionNoteId } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ message: "Recipient, subject, and body are required" });
  }

  // Use email service  
  try {
    await sendEmail({ to, from: 'noreply@gradradar.com', subject, html: body });
    const sentAt = new Date();
    res.json({ success: true, message: "Email sent successfully", emailSentAt: sentAt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

// SMS sending endpoint
router.post('/send-sms', isAuthenticated, async (req: Request, res: Response) => {
  const { to, body, sessionNoteId } = req.body;

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
    res.json({ 
      success: true, 
      message: "SMS sent successfully via Twilio",
      textSentAt: sentAt
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: "Failed to send SMS via Twilio"
    });
  }
});

export { router as authRoutes };