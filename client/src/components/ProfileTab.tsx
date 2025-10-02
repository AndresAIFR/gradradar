import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Save, User as UserIcon, Mail } from "lucide-react";
import { AccountInfo } from "@/components/AccountInfo";
import { PasswordSection } from "@/components/PasswordSection";

export function ProfileTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Helper functions
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "U";
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || "User";
  };

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setFromEmail(user.fromEmail || user.email || "");
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; fromEmail: string }) => {
      return await apiRequest('PUT', '/api/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({ firstName, lastName, fromEmail });
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 text-white rounded-lg">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-4 border-white/20">
            <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
              {getInitials(user?.firstName || "", user?.lastName || "")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
            <p className="text-green-100 mt-1">
              {user?.role === 'admin' ? 'Administrator' : 'Staff Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Profile Information</h3>
          <Button 
            variant={isEditing ? "default" : "outline"}
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={updateProfileMutation.isPending}
            className={isEditing ? "bg-slate-600 hover:bg-slate-700" : ""}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </>
            ) : (
              <>
                <UserIcon className="h-4 w-4 mr-2" />
                Edit Profile
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <UserIcon className="h-4 w-4" />
              <Label className="text-sm font-medium">First Name</Label>
            </div>
            {isEditing ? (
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="bg-white"
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-900">{firstName || 'Not provided'}</p>
              </div>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <UserIcon className="h-4 w-4" />
              <Label className="text-sm font-medium">Last Name</Label>
            </div>
            {isEditing ? (
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="bg-white"
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-900">{lastName || 'Not provided'}</p>
              </div>
            )}
          </div>

          {/* From Email */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <Mail className="h-4 w-4" />
              <Label className="text-sm font-medium">From Email</Label>
            </div>
            {isEditing ? (
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="Enter email address for alumni communications"
                className="bg-white"
                type="email"
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-900">{fromEmail || 'Not provided'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Information */}
      <AccountInfo />

      {/* Password Management */}
      <PasswordSection />
    </div>
  );
}