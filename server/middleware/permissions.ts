import type { RequestHandler } from "express";
import { storage } from "../storage.js";
import type { User } from "@shared/schema";

// Role hierarchy: alumni < staff < admin < super_admin < developer
// Higher number = more permissions
const ROLE_HIERARCHY = {
  alumni: 1,
  staff: 2,
  admin: 3,
  super_admin: 4,
  developer: 5,
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

/**
 * Check if a user's role meets or exceeds the minimum required role
 */
export function hasMinimumRole(userRole: string | undefined, minimumRole: UserRole): boolean {
  if (!userRole) {
    console.log('⚖️ [ROLE-CHECK] No user role provided');
    return false;
  }
  
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  const result = userLevel >= requiredLevel;
  
  // LEVEL 3: Role comparison logging
  console.log('⚖️ [ROLE-CHECK] Comparing roles:', {
    userRole,
    userRoleType: typeof userRole,
    minimumRole,
    userLevel,
    requiredLevel,
    hierarchyKeys: Object.keys(ROLE_HIERARCHY),
    result,
  });
  
  return result;
}

/**
 * Check if a user has permission to modify another user's role
 * Rules:
 * - Developer can modify anyone (including other developers)
 * - Super admin can modify admin, staff, alumni (but not developer)
 * - Admin can modify staff and alumni (but not admin or above)
 * - Staff and alumni cannot modify roles
 */
export function canModifyUserRole(modifierRole: string | undefined, targetRole: string): boolean {
  if (!modifierRole) return false;
  
  const modifierLevel = ROLE_HIERARCHY[modifierRole as UserRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole as UserRole] || 0;
  
  // Developer can modify anyone
  if (modifierRole === 'developer') return true;
  
  // Super admin can modify anyone except developer
  if (modifierRole === 'super_admin' && targetRole !== 'developer') return true;
  
  // Admin can modify staff and alumni only
  if (modifierRole === 'admin' && (targetRole === 'staff' || targetRole === 'alumni')) return true;
  
  return false;
}

/**
 * Get roles visible to a user (for role selection dropdowns)
 * - Developer sees all roles
 * - Super admin sees all except developer
 * - Admin sees staff and alumni
 * - Others see only their own role
 */
export function getVisibleRoles(userRole: string | undefined): UserRole[] {
  if (!userRole) return [];
  
  if (userRole === 'developer') {
    return ['alumni', 'staff', 'admin', 'super_admin', 'developer'];
  }
  
  if (userRole === 'super_admin') {
    return ['alumni', 'staff', 'admin', 'super_admin'];
  }
  
  if (userRole === 'admin') {
    return ['alumni', 'staff', 'admin'];
  }
  
  if (userRole === 'staff') {
    return ['staff'];
  }
  
  return ['alumni'];
}

/**
 * Middleware: Require authenticated user
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // LEVEL 2: Authentication check logging
    const id = (req as any)?.user?.id;
    console.log('🔐 [AUTH] Checking authentication:', {
      hasReqUser: !!(req as any)?.user,
      userId: id,
      sessionID: (req as any).sessionID,
      path: req.path,
    });
    
    if (!id) {
      console.log('❌ [AUTH] No user ID in session');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(id);
    console.log('👤 [AUTH] Fetched user from DB:', {
      found: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      roleType: typeof user?.role,
    });
    
    if (!user) {
      console.log('❌ [AUTH] User not found in database');
      return res.status(401).json({ message: "User not found" });
    }
    
    // Attach user to request for use in subsequent middleware/routes
    (req as any).currentUser = user;
    console.log('✅ [AUTH] User authenticated successfully');
    next();
  } catch (e) {
    console.error('❌ [AUTH] Error:', e);
    next(e);
  }
};

/**
 * Middleware factory: Require minimum role level
 */
export function requireMinRole(minimumRole: UserRole): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = (req as any).currentUser as User | undefined;
      
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!hasMinimumRole(user.role, minimumRole)) {
        return res.status(403).json({ 
          message: `This action requires ${minimumRole} role or higher` 
        });
      }
      
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Convenience middleware for common role checks
export const requireStaff = requireMinRole('staff');
export const requireAdmin = requireMinRole('admin');
export const requireSuperAdmin = requireMinRole('super_admin');
export const requireDeveloper = requireMinRole('developer');

/**
 * Middleware: Require role modification permission
 * Used for endpoints that modify user roles
 */
export const requireRoleModificationPermission: RequestHandler = async (req, res, next) => {
  try {
    const user = (req as any).currentUser as User | undefined;
    
    console.log('🔐 [PERM-CHECK] Role modification permission check:', {
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      hasUser: !!user,
    });
    
    if (!user) {
      console.log('❌ [PERM-CHECK] No user found in request');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Only super_admin and developer can modify roles
    const hasPermission = hasMinimumRole(user.role, 'super_admin');
    console.log('🔍 [PERM-CHECK] Has permission:', hasPermission, '(requires super_admin+)');
    
    if (!hasPermission) {
      console.log('⛔ [PERM-CHECK] Permission denied for role:', user.role);
      return res.status(403).json({ 
        message: "Only super administrators and developers can modify user roles" 
      });
    }
    
    console.log('✅ [PERM-CHECK] Permission granted');
    next();
  } catch (e) {
    console.error('❌ [PERM-CHECK] Error:', e);
    next(e);
  }
};
