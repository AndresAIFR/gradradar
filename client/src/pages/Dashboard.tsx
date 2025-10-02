import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Users, Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle, Target, Star } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { Alumni } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: alumni = [], isLoading: isLoadingAlumni } = useQuery<Alumni[]>({
    queryKey: ["/api/alumni"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="GradRadar" />
      <div className="container mx-auto p-4 space-y-6">
        
        {/* Alumni Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{alumni.length}</p>
                  <p className="text-sm text-slate-600">Total Alumni</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{alumni.filter(a => a.connectedAsOf).length}</p>
                  <p className="text-sm text-slate-600">Connected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{alumni.filter(a => a.employed).length}</p>
                  <p className="text-sm text-slate-600">Employed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{alumni.filter(a => a.currentlyEnrolled).length}</p>
                  <p className="text-sm text-slate-600">In College</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alumni Activity */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-slate-900">Recent Alumni</h2>
              </div>
            </div>
            
            <div className="space-y-3">
              {alumni.slice(0, 5).map((alumnus) => (
                <div key={alumnus.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={alumnus.profileImageUrl || undefined} alt={`${alumnus.firstName} ${alumnus.lastName}`} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-medium text-sm">
                        {alumnus.firstName?.[0]}{alumnus.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{alumnus.firstName} {alumnus.lastName}</p>
                      <p className="text-sm text-slate-600">{alumnus.cohortYear}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className={`${
                        alumnus.trackingStatus === 'on-track' ? 'bg-green-100 text-green-700' :
                        alumnus.trackingStatus === 'near-track' ? 'bg-yellow-100 text-yellow-700' :
                        alumnus.trackingStatus === 'off-track' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {alumnus.trackingStatus === 'on-track' ? 'On Track' :
                       alumnus.trackingStatus === 'near-track' ? 'Near Track' :
                       alumnus.trackingStatus === 'off-track' ? 'Off Track' :
                       'Unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-slate-900">Follow-up Needed</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-slate-900">{alumni.filter(a => !a.connectedAsOf && !a.attemptedOutreach).length} alumni need initial outreach</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-slate-900">{alumni.filter(a => a.attemptedOutreach && !a.connectedAsOf).length} alumni need follow-up</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-900">{alumni.filter(a => !a.phone && !a.preferredEmail && !a.personalEmail).length} alumni missing contact info</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}