import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@/types/user";

function isPublicPath(path: string) {
  return [
    "/verify-email",
    "/reset-password",
    "/accept-invitation",
  ].some((p) => path.startsWith(p));
}

export function useAuth() {
  const [location, setLocation] = useLocation();
  
  const { toast } = useToast();
  const onPublicPage = isPublicPath(location);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => {
      return apiRequest("GET", "/api/auth/user");
    },
    enabled: !onPublicPage,                  // DO NOT run on public pages
    retry: false,                            // No auto-retries on 401
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });


  const logoutMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest('POST', '/api/auth/logout', {});
      return result;
    },
    onSuccess: () => {
      // Clear user cache
      queryClient.setQueryData(["/api/auth/user"], null);
      // Clear all queries to ensure clean state
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      // Navigate to landing page
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user: data,
    isAuthenticated: !!data,
    isLoading: isPending,
    error: isError ? error : null,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}
