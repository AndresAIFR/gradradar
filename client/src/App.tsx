import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Alumni from "@/pages/Alumni";

// import Reports from "@/pages/Reports";
// import ReportsNew from "@/pages/ReportsNew";
import AlumniDetail from "@/pages/AlumniDetail";
import { ContactQueue } from "@/pages/ContactQueue";
import ContactTimeline from "@/pages/ContactTimeline";

import AlumniListDemo from "@/pages/AlumniListDemo";
import AddAlumni from "@/pages/AddAlumni";
import DropoutDateAdmin from "@/pages/DropoutDateAdmin";

import Settings from "@/pages/Settings";
import VerifyEmail from "@/pages/VerifyEmail";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvitation from "@/pages/AcceptInvitation";
import DeveloperDashboard from "@/pages/DeveloperDashboard";
import UserManagement from "@/pages/UserManagement";
// import PendingResolution from "@/pages/PendingResolution";

function Router() {
  const [location] = useLocation();
  
  // Handle public pages without auth
  if (location.startsWith('/accept-invitation') || 
      location.startsWith('/verify-email') || 
      location.startsWith('/reset-password')) {
    return (
      <Switch>
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Use auth for all other pages
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => {
          const [, navigate] = useLocation();
          
          React.useEffect(() => {
            const params = new URLSearchParams(window.location.search);
            const hasClusterParam = params.get('cluster') === '1';
            
            // Handle /?cluster=1 by redirecting to /analytics?cluster=1
            if (hasClusterParam) {
              navigate('/analytics?cluster=1', { replace: true });
              return;
            }
            
            // Staff users go to contact queue, admin users go to analytics
            if (user?.role === 'staff') {
              navigate('/contact-queue', { replace: true });
              return;
            }
            
            navigate('/analytics', { replace: true });
          }, [navigate, user?.role]);
          
          return null;
        }} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/contact-queue" component={ContactQueue} />
        <Route path="/contact-timeline" component={ContactTimeline} />
        <Route path="/alumni/add" component={AddAlumni} />
        <Route path="/alumni/demo" component={AlumniListDemo} />
        <Route path="/alumni/:id" component={({ params }: any) => <AlumniDetail alumniId={params.id} />} />
        <Route path="/alumni" component={Alumni} />
        <Route path="/admin/dropout-dates" component={DropoutDateAdmin} />
        <Route path="/developer/dashboard" component={DeveloperDashboard} />
        <Route path="/developer/users" component={UserManagement} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={() => { 
          window.location.replace('/settings'); 
          return null; 
        }} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
