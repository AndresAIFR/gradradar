import { useLocation } from "wouter";
import { Home, GraduationCap, Settings, User, LogOut, UserCheck, History, Calendar, UserPlus, Eye, Database, BarChart3, FileText, Phone, Code, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLastViewedAlumni } from "@/hooks/useLastViewedAlumni";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AuditLogSidebar from "./AuditLogSidebar";

interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isActive?: (pathname: string) => boolean;
  disabled?: boolean;
}

// Base navigation items
const baseNavigationItems: NavigationItem[] = [
  {
    icon: Home,
    label: "Analytics",
    href: "/analytics",
    isActive: (pathname) => pathname === "/analytics"
  },
  {
    icon: Phone,
    label: "Contact Queue",
    href: "/contact-queue",
    isActive: (pathname) => pathname === "/contact-queue"
  },
  {
    icon: History,
    label: "Contact Timeline (Coming Soon) - See contacts across users",
    href: "/contact-timeline",
    isActive: (pathname) => pathname === "/contact-timeline",
    disabled: true
  },
  {
    icon: GraduationCap,
    label: "Alumni",
    href: "/alumni",
    isActive: (pathname) => pathname.startsWith("/alumni") && pathname !== "/alumni/demo" && !pathname.includes("/timeline")
  },
  {
    icon: Eye,
    label: "Alumni Page Revamp (Coming Soon)",
    href: "/alumni/demo",
    isActive: (pathname) => pathname === "/alumni/demo",
    disabled: true
  }
];

// Get role-based navigation order
function getRoleBasedNavigation(userRole: string | undefined): NavigationItem[] {
  // Separate enabled and disabled items
  const enabledItems = baseNavigationItems.filter(item => !item.disabled);
  const disabledItems = baseNavigationItems.filter(item => item.disabled);
  
  if (userRole === 'staff') {
    // Staff: Contact Queue first, Analytics last
    const enabledStaffOrder = [
      enabledItems.find(item => item.href === "/contact-queue"), // Contact Queue
      enabledItems.find(item => item.href === "/alumni"), // Alumni
      enabledItems.find(item => item.href === "/analytics"), // Analytics
    ].filter(Boolean) as NavigationItem[];
    
    return [...enabledStaffOrder, ...disabledItems];
  }
  
  // Admin (default): Analytics first, rest as is
  return [...enabledItems, ...disabledItems];
}

interface NavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  onClick: () => void;
}

function NavigationItemComponent({ item, isActive, onClick }: NavigationItemProps) {
  const Icon = item.icon;
  
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={item.disabled ? (e) => e.preventDefault() : onClick}
          className={cn(
            "w-12 h-12 p-0 transition-colors",
            item.disabled 
              ? "text-slate-400 dark:text-slate-600 cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/50" 
              : "hover:bg-slate-100 dark:hover:bg-slate-800",
            isActive && !item.disabled && "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          )}
        >
          <Icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="ml-2">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { lastViewed, isLoaded } = useLastViewedAlumni();
  const { user } = useAuth();
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Get navigation items based on user role
  const navigationItems = getRoleBasedNavigation(user?.role);
  
  // Only show student tab if someone has actually been viewed
  const displayStudent = lastViewed;

  const handleLogout = async () => {
    try {
      // Call the logout API endpoint first
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        // Clear all React Query cache
        queryClient.clear();
        // Navigate to home page
        navigate("/");
        // Force a hard refresh to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        // Fallback: force redirect anyway
        window.location.href = "/";
      }
    } catch (error) {
      // Fallback: clear the session by reloading
      window.location.href = "/";
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-full flex-col">
        {/* Navigation Items */}
        <nav className="flex-1 space-y-2 p-2 pt-6">
          {navigationItems.map((item, index) => {
            const isActive = item.isActive ? item.isActive(location) : location === item.href;
            const isFirstDisabledItem = item.disabled && index > 0 && !navigationItems[index - 1].disabled;
            
            return (
              <div key={item.href}>
                {/* Add separator line before first disabled item */}
                {isFirstDisabledItem && (
                  <div className="my-3 border-t border-slate-200 dark:border-slate-700" />
                )}
                
                <NavigationItemComponent
                  item={item}
                  isActive={isActive}
                  onClick={() => navigate(item.href)}
                />
                
                {/* Show Last Viewed Alumni Button right after Alumni button */}
                {item.href === "/alumni" && displayStudent && (
                  <div className="mt-1 space-y-1">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/alumni/${displayStudent.id}`)}
                          className={cn(
                            "w-12 h-12 p-0 transition-colors",
                            "hover:bg-emerald-50 dark:hover:bg-emerald-950",
                            "hover:text-emerald-600 dark:hover:text-emerald-400",
                            location === `/alumni/${displayStudent.id}` && "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          <UserCheck className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <div className="text-sm">
                          <div className="font-medium">{displayStudent.name}</div>
                          <div className="text-xs text-slate-500">Detail View • {displayStudent.cohortYear}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                
                {/* Show Demo 2 Timeline after Demo 1 */}

              </div>
            );
          })}
        </nav>

        {/* Settings & Admin Tools */}
        <div className="border-t border-slate-200 p-2 dark:border-slate-700 space-y-2">
          {/* Settings Button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/settings")}
                className={cn(
                  "w-12 h-12 p-0 transition-colors",
                  "hover:bg-slate-100 dark:hover:bg-slate-800",
                  (location === "/settings" || location === "/profile") && "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                )}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              Settings
            </TooltipContent>
          </Tooltip>

          {/* Admin Tools */}
          {user?.role === "admin" && (
            <>
              {/* COMMENTED OUT - Dropout Date Admin not ready for sharing
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin/dropout-dates")}
                    className="w-12 h-12 p-0 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  Dropout Date Admin
                </TooltipContent>
              </Tooltip>
              */}
              
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAuditLogOpen(true)}
                    className="w-12 h-12 p-0 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950 dark:hover:text-orange-400"
                  >
                    <History className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  Audit Log
                </TooltipContent>
              </Tooltip>
            </>
          )}
          
          {/* Developer Tools */}
          {(user?.role === "developer" || user?.role === "super_admin") && (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/developer/dashboard")}
                    className={cn(
                      "w-12 h-12 p-0 transition-colors",
                      "hover:bg-purple-50 dark:hover:bg-purple-950",
                      "hover:text-purple-600 dark:hover:text-purple-400",
                      location === "/developer/dashboard" && "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                    )}
                    data-testid="nav-developer-dashboard"
                  >
                    <Code className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  Developer Dashboard
                </TooltipContent>
              </Tooltip>
              
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/developer/users")}
                    className={cn(
                      "w-12 h-12 p-0 transition-colors",
                      "hover:bg-indigo-50 dark:hover:bg-indigo-950",
                      "hover:text-indigo-600 dark:hover:text-indigo-400",
                      location === "/developer/users" && "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    )}
                    data-testid="nav-user-management"
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  User Management
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Logout */}
        <div className="border-t border-slate-200 p-2 dark:border-slate-700">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-12 h-12 p-0 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              Logout
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {/* Audit Log Sidebar */}
      {auditLogOpen && displayStudent && (
        <AuditLogSidebar
          alumniId={displayStudent.id}
          isOpen={auditLogOpen}
          onClose={() => setAuditLogOpen(false)}
        />
      )}
    </aside>
  );
}