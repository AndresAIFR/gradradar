import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRoleModificationPermission, canModifyUserRole, getVisibleRoles } from "../middleware/permissions";
import { z } from "zod";

const router = Router();

// Log all requests to this router
router.use((req, res, next) => {
  console.log('🔥 [USERS-ROUTER] Request received:', {
    method: req.method,
    path: req.path,
    url: req.url,
    userId: (req as any)?.user?.id,
  });
  next();
});

// Get all users and invitations (super_admin and developer only)
router.get("/", requireAuth, requireRoleModificationPermission, async (req, res, next) => {
  try {
    console.log('🔍 [USER-MGMT] GET /api/users endpoint hit');
    
    // Fetch both users and invitations
    const [allUsers, allInvitations] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllInvitations()
    ]);
    
    const currentUser = (req as any).currentUser;
    const visibleRoles = getVisibleRoles(currentUser.role);
    
    console.log('👤 [USER-MGMT] Current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
      role: currentUser?.role,
    });
    console.log('📊 [USER-MGMT] Total from DB:', {
      users: allUsers.length,
      invitations: allInvitations.length,
    });
    
    // Create unified list
    const unifiedList = [];
    
    // Add existing users (filtered by visible roles)
    for (const user of allUsers) {
      if (visibleRoles.includes(user.role as any)) {
        unifiedList.push({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
          status: 'active',
          createdAt: user.createdAt,
          type: 'user'
        });
      }
    }
    
    // Add pending invitations (only if no user exists with that email and role is visible)
    for (const invitation of allInvitations) {
      // Skip if invitation already accepted
      if (invitation.acceptedAt) continue;
      
      // Skip if user already exists with that email
      const existingUser = allUsers.find(u => u.email?.toLowerCase() === invitation.email.toLowerCase());
      if (existingUser) continue;
      
      // Skip if role is not visible to current user
      if (!visibleRoles.includes(invitation.role as any)) continue;
      
      const status = new Date() > invitation.expiresAt ? 'expired' : 'pending';
      unifiedList.push({
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
    
    console.log('✅ [USER-MGMT] Unified list count:', {
      total: unifiedList.length,
      users: unifiedList.filter(u => u.type === 'user').length,
      invitations: unifiedList.filter(u => u.type === 'invitation').length,
    });
    
    res.json({ users: unifiedList });
  } catch (error) {
    console.error('❌ [USER-MGMT] Error:', error);
    next(error);
  }
});

// Update user role (super_admin and developer only)
router.patch("/:userId/role", requireAuth, requireRoleModificationPermission, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = (req as any).currentUser;
    
    // Validate request body
    const updateRoleSchema = z.object({
      role: z.enum(['alumni', 'staff', 'admin', 'super_admin', 'developer']),
    });
    
    const { role: newRole } = updateRoleSchema.parse(req.body);
    
    // Get target user to check their current role
    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if current user has permission to modify target user's role
    if (!canModifyUserRole(currentUser.role, targetUser.role)) {
      return res.status(403).json({ 
        message: `You don't have permission to modify this user's role` 
      });
    }
    
    // Check if current user can assign the new role
    const visibleRoles = getVisibleRoles(currentUser.role);
    if (!visibleRoles.includes(newRole as any)) {
      return res.status(403).json({ 
        message: `You don't have permission to assign ${newRole} role` 
      });
    }
    
    // Update the role
    const updatedUser = await storage.updateUserRole(userId, newRole);
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      profileImageUrl: updatedUser.profileImageUrl,
      status: updatedUser.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    next(error);
  }
});

// Get visible roles for current user (for dropdown population)
router.get("/roles/visible", requireAuth, async (req, res, next) => {
  try {
    const currentUser = (req as any).currentUser;
    const visibleRoles = getVisibleRoles(currentUser.role);
    
    res.json({ roles: visibleRoles });
  } catch (error) {
    next(error);
  }
});

export default router;
