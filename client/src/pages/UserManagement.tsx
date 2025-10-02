import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageView } from "@/hooks/useAnalytics";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  profileImageUrl: string | null;
  status: string | null;
  createdAt: Date;
}

interface VisibleRoles {
  roles: string[];
}

const ROLE_LABELS: Record<string, string> = {
  alumni: 'Alumni',
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

const ROLE_COLORS: Record<string, string> = {
  alumni: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  admin: 'bg-purple-100 text-purple-800',
  super_admin: 'bg-orange-100 text-orange-800',
  developer: 'bg-red-100 text-red-800',
};

export default function UserManagement() {
  usePageView('User Management');
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  console.log('🔧 [USER-MGMT-PAGE] Component mounted, current user:', currentUser);
  
  // Fetch all users
  const { data: usersResponse, isLoading, error } = useQuery<{ users: User[] }>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      console.log('🌐 [USER-MGMT-PAGE] Fetching users from /api/users...');
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      console.log('📡 [USER-MGMT-PAGE] Response status:', response.status);
      if (!response.ok) {
        if (response.status === 403) {
          console.error('⛔ [USER-MGMT-PAGE] 403 Forbidden');
          throw new Error('You do not have permission to view users');
        }
        console.error('❌ [USER-MGMT-PAGE] Request failed with status:', response.status);
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      console.log('✅ [USER-MGMT-PAGE] Received users:', data);
      return data;
    },
  });
  
  const users = usersResponse?.users || [];
  
  console.log('📊 [USER-MGMT-PAGE] Query state:', { 
    isLoading, 
    hasData: !!users, 
    usersCount: users?.length,
    error: error?.message 
  });

  // Fetch visible roles for current user
  const { data: visibleRolesData } = useQuery<VisibleRoles>({
    queryKey: ['/api/users/roles/visible'],
    queryFn: async () => {
      const response = await fetch('/api/users/roles/visible', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch visible roles');
      return response.json();
    },
  });

  const visibleRoles = visibleRolesData?.roles || [];

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/role`, { role: newRole });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Role updated",
        description: `User role has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Shield className="h-8 w-8 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>View and manage user roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`user-${user.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {user.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge className={ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      
                      {user.id !== currentUser?.id && (
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[180px]" data-testid={`role-select-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {visibleRoles.map((role) => (
                              <SelectItem key={role} value={role} data-testid={`role-option-${role}`}>
                                {ROLE_LABELS[role] || role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {user.id === currentUser?.id && (
                        <span className="text-sm text-muted-foreground">(You)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
