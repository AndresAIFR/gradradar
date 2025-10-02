import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Trash2, UserPlus, Copy, RefreshCw, MapPin, KeyRound, Shield } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { DangerZone } from "@/components/DangerZone";
import { ProfileTab } from "@/components/ProfileTab";

interface Invitation {
  id: number;
  email: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  token: string;
}

interface UserListItem {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'staff' | 'admin';
  status: 'active' | 'pending' | 'expired';
  createdAt: string;
  expiresAt?: string;
  token?: string;
  type: 'user' | 'invitation';
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  // Get current user to check admin role
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if user has admin-level permissions (admin, super_admin, or developer)
  const isAdminOrHigher = ['admin', 'super_admin', 'developer'].includes((user as any)?.role);

  // Fetch all users (admin+ only) - unified user management
  const { data: usersResponse, isLoading: usersLoading } = useQuery<{ users: UserListItem[] }>({
    queryKey: ['/api/users'],
    enabled: isAdminOrHigher,
  });

  const users = usersResponse?.users || [];

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/invitations', { email, role });
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "An invitation email has been sent successfully.",
      });
      setEmail("");
      setRole("staff");
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/invitations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation deleted",
        description: "The invitation has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invitation",
        variant: "destructive",
      });
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/invitations/${id}/resend`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "The invitation email has been resent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest('POST', `/api/users/${userId}/reset-password`, { 
        newPassword: password 
      });
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "The user's password has been reset successfully.",
      });
      setShowPasswordReset(false);
      setNewPassword("");
      setResetPasswordUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ userId: resetPasswordUserId, password: newPassword });
  };

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    createInvitationMutation.mutate();
  };

  const copyInvitationLink = (token: string) => {
    const baseUrl = window.location.origin;
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: "Link copied",
      description: "Invitation link has been copied to clipboard.",
    });
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.status === 'accepted') {
      return <Badge className="bg-green-500">Accepted</Badge>;
    }
    const isExpired = new Date(invitation.expiresAt) < new Date();
    if (isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge className="bg-blue-500">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Settings" />
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        
        {/* Profile Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Settings</span>
            </CardTitle>
            <CardDescription>
              Manage your profile, account information, and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileTab />
          </CardContent>
        </Card>

        {/* Admin-only User Management */}
        {isAdminOrHigher && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>User Management</span>
                </div>
                <Button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              </CardTitle>
              <CardDescription>
                Manage all users and send invitations to new users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {showCreateForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Send New Invitation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateInvitation} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                          id="role"
                          value={role}
                          onChange={(e) => setRole(e.target.value as "staff" | "admin")}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={createInvitationMutation.isPending}
                        >
                          {createInvitationMutation.isPending ? (
                            <>Sending...</>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCreateForm(false);
                            setEmail("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div>
                <h4 className="font-medium mb-4">All Users</h4>
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No users found. Send your first invitation above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>{userItem.email}</TableCell>
                          <TableCell>
                            {userItem.type === 'user' 
                              ? `${userItem.firstName} ${userItem.lastName}` 
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="capitalize">{userItem.role}</TableCell>
                          <TableCell>
                            {userItem.status === 'active' && (
                              <Badge className="bg-green-500">Active</Badge>
                            )}
                            {userItem.status === 'pending' && (
                              <Badge className="bg-blue-500">Pending</Badge>
                            )}
                            {userItem.status === 'expired' && (
                              <Badge variant="secondary">Expired</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(userItem.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {userItem.type === 'invitation' && userItem.token && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyInvitationLink(userItem.token!)}
                                    title="Copy invitation link"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteInvitationMutation.mutate(userItem.id as number)}
                                    disabled={deleteInvitationMutation.isPending}
                                    className="text-red-600 hover:text-red-700"
                                    title="Delete invitation"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {userItem.type === 'user' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setResetPasswordUserId(userItem.id as string);
                                      setShowPasswordReset(true);
                                    }}
                                    title="Reset password"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${userItem.firstName} ${userItem.lastName}? This action cannot be undone.`)) {
                                        deleteUserMutation.mutate(userItem.id as string);
                                      }
                                    }}
                                    disabled={deleteUserMutation.isPending}
                                    className="text-red-600 hover:text-red-700"
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Password Reset Modal */}
        {showPasswordReset && (
          <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Reset User Password</h3>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setNewPassword("");
                      setResetPasswordUserId("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetPasswordMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {resetPasswordMutation.isPending ? (
                      "Resetting..."
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Admin-only Danger Zone */}
        {isAdminOrHigher && (
          <DangerZone isAdmin={true} />
        )}
      </div>
    </div>
  );
}