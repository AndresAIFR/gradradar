import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Calendar, Clock } from "lucide-react";

export function AccountInfo() {
  const { user } = useAuth();

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Not available';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getAuthMethodDisplay = (authMethod?: string) => {
    switch (authMethod) {
      case 'replit':
        return { label: 'Replit OAuth', variant: 'default' as const };
      case 'email':
        return { label: 'Email & Password', variant: 'secondary' as const };
      default:
        return { label: 'Unknown', variant: 'outline' as const };
    }
  };

  const authDisplay = getAuthMethodDisplay(user?.authMethod);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Account Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Login Email */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">Login Email</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-900">{user?.email || 'Not available'}</p>
            </div>
          </div>

          {/* Authentication Method */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Authentication Method</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <Badge variant={authDisplay.variant}>{authDisplay.label}</Badge>
            </div>
          </div>

          {/* Account Created */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Account Created</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-900">{formatDate(user?.createdAt)}</p>
            </div>
          </div>

          {/* Last Updated */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Last Updated</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-900">{formatDate(user?.updatedAt)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}