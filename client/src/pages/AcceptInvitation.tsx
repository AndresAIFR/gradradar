import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

export default function AcceptInvitation() {
  const { toast } = useToast();
  // Don't use useAuth on invitation page to avoid infinite auth loops
  const user = null;
  const logout = () => {};
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    console.log('🔄 AcceptInvitation useEffect started');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    console.log('🎫 Token from URL:', token);
    
    if (!token) {
      console.log('❌ No token found in URL');
      setStatus('error');
      setMessage('Invalid invitation link');
      return;
    }
    
    console.log('✅ Token found, setting invitation token');
    setInvitationToken(token);
    
    // Since user is always null on invitation page, go straight to ready
    console.log('✅ No user logged in, setting ready status immediately');
    setStatus('ready');
  }, []); // Empty dependency array since we're not using any external state

  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: { 
      token: string; 
      firstName: string; 
      lastName: string; 
      password: string; 
    }) => {
      console.log('🚀 Starting invitation acceptance mutation with data:', { token: data.token, firstName: data.firstName, lastName: data.lastName });
      try {
        console.log('🔍 MUTATION STEP 1 - About to call apiRequest...');
        console.log('🔍 MUTATION STEP 1.1 - apiRequest function type:', typeof apiRequest);
        console.log('🔍 MUTATION STEP 1.2 - data object:', data);
        console.log('🔍 MUTATION STEP 1.3 - data stringified:', JSON.stringify(data));
        
        console.log('📡 Making API request to /api/invitations/accept');
        const result = await apiRequest('POST', '/api/invitations/accept', data);
        
        console.log('🔍 MUTATION STEP 2 - apiRequest returned!');
        console.log('✅ API request completed, result type:', typeof result);
        console.log('✅ API request result:', result);
        console.log('✅ API request result keys:', result ? Object.keys(result) : 'null');
        return result;
      } catch (error) {
        console.error('❌ MUTATION STEP ERROR - Error in mutation function:', error);
        console.error('❌ MUTATION STEP ERROR - Error type:', typeof error);
        console.error('❌ MUTATION STEP ERROR - Error message:', error?.message);
        console.error('❌ MUTATION STEP ERROR - Error stack:', error?.stack);
        console.error('❌ MUTATION STEP ERROR - Full error object:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🔍 ACCEPT SUCCESS START - Invitation acceptance successful:', data);
      console.log('🔍 ACCEPT SUCCESS STEP 1 - Setting status to success');
      setStatus('success');
      console.log('🔍 ACCEPT SUCCESS STEP 2 - Setting message');
      setMessage(data.message || 'Account created successfully!');
      console.log('🔍 ACCEPT SUCCESS STEP 3 - About to invalidate queries');
      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      console.log('🔍 ACCEPT SUCCESS STEP 4 - Queries invalidated, setting timeout');
      setTimeout(() => {
        console.log('🔍 ACCEPT SUCCESS TIMEOUT - Redirecting to home page');
        window.location.href = '/';
      }, 2000);
      console.log('🔍 ACCEPT SUCCESS END - Success handler completed');
    },
    onError: (error: any) => {
      console.error('💥 Invitation acceptance failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted with data:', { firstName, lastName, hasPassword: !!password, token: invitationToken });
    
    if (!firstName || !lastName || !password) {
      console.log('⚠️ Missing required fields');
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }
    
    acceptInvitationMutation.mutate({
      token: invitationToken,
      firstName,
      lastName,
      password,
    });
  };

  if (status === 'loading' || loggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
            <p>Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 py-8">
            <XCircle className="h-12 w-12 mx-auto text-red-600" />
            <p className="text-red-700">{message}</p>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <p className="text-green-700">{message}</p>
            <p className="text-sm text-gray-600">Redirecting to login page...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Accept Your Invitation</CardTitle>
          <p className="text-center text-gray-600 mt-2">
            Create your account to join GradRadar
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={acceptInvitationMutation.isPending}
            >
              {acceptInvitationMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}