import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertResourceSchema } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  resource?: any; // For editing existing resources
}

type FormData = z.infer<typeof insertResourceSchema>;

export default function AddResourceModal({ isOpen, onClose, studentId, resource }: AddResourceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(insertResourceSchema),
    defaultValues: {
      studentId,
      title: resource?.title || "",
      link: resource?.link || "",
      notes: resource?.notes || "",
    },
  });

  // Reset form when resource changes
  useEffect(() => {
    if (resource) {
      form.reset({
        studentId,
        title: resource.title || "",
        link: resource.link || "",
        notes: resource.notes || "",
      });
    } else {
      form.reset({
        studentId,
        title: "",
        link: "",
        notes: "",
      });
    }
  }, [resource, studentId, form]);

  const createResourceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Clean up empty string values to null for optional fields
      const cleanData = {
        ...data,
        link: data.link?.trim() || null,
        notes: data.notes?.trim() || null,
      };
      
      if (resource?.id) {
        // Update existing resource
        await apiRequest("PATCH", `/api/resources/${resource.id}`, cleanData);
      } else {
        // Create new resource
        await apiRequest("POST", `/api/students/${studentId}/resources`, cleanData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/resources`] });
      toast({
        title: resource?.id ? "Resource updated" : "Resource added",
        description: resource?.id 
          ? "Learning resource has been updated successfully."
          : "Learning resource has been added successfully.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: resource?.id ? "Failed to update resource. Please try again." : "Failed to add resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createResourceMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{resource?.id ? "Edit Learning Resource" : "Add Learning Resource"}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Khan Academy - Algebra Basics"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://www.khanacademy.org/math/algebra"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Additional notes about this resource..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createResourceMutation.isPending}
              >
                {createResourceMutation.isPending 
                  ? (resource?.id ? "Updating..." : "Adding...") 
                  : (resource?.id ? "Update Resource" : "Add Resource")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}