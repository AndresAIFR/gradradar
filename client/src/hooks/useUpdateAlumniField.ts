import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useUpdateAlumniField(alumniId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ field, value, additionalUpdates }: { field: string; value: any; additionalUpdates?: Record<string, any> }) => {
      const updateData = { [field]: value, ...additionalUpdates };
      const response = await fetch(`/api/alumni/${alumniId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update field');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate both specific alumni and list queries for consistency
      queryClient.invalidateQueries({ queryKey: qk.alumniById(alumniId) });
      queryClient.invalidateQueries({ queryKey: qk.alumniList });
      
      // Show success toast for field updates
      toast({
        title: "Updated successfully",
        description: `${variables.field} has been saved.`,
      });
    },
    onError: (error: any, variables) => {
      // Show error toast
      toast({
        title: "Update failed",
        description: error.message || `Failed to update ${variables.field}`,
        variant: "destructive",
      });
    },
  });
}