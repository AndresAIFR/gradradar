import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Generate cohort year options (2022 to current year + 2)
const currentYear = new Date().getFullYear();
const cohortYearOptions = Array.from(
  { length: currentYear - 2022 + 3 }, // 2022 to currentYear + 2
  (_, i) => 2022 + i
);

// Minimal add alumni schema - only the essential fields
const addAlumniSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  cohortYear: z.number().min(2022).max(currentYear + 2),
  contactId: z.string().nullable().optional().transform(val => val === "" ? null : val || null),
});

type AddAlumniFormData = z.infer<typeof addAlumniSchema>;

export default function AddAlumni() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddAlumniFormData>({
    resolver: zodResolver(addAlumniSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      cohortYear: currentYear,
      contactId: "",
    },
  });

  const createAlumni = useMutation({
    mutationFn: (data: AddAlumniFormData) => apiRequest("POST", "/api/alumni", {
      ...data, // Only send the minimal fields - server handles defaults
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      toast({
        title: "Success",
        description: "Alumni profile created successfully",
      });
      setLocation("/alumni");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create alumni profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddAlumniFormData) => {
    createAlumni.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/alumni")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Alumni
            </Button>
            <div className="h-6 w-px bg-slate-300"></div>
            <div className="flex items-center space-x-3">
              <UserPlus className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-slate-900">Add New Alumni</h1>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Minimal Alumni Information */}
            <Card className="max-w-lg mx-auto">
              <CardHeader>
                <CardTitle>Add New Alumni</CardTitle>
                <p className="text-sm text-gray-600">
                  Create a basic alumni profile. Additional details can be added later.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cohortYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cohort Year *</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-cohortYear">
                            <SelectValue placeholder="Select cohort year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cohortYearOptions.map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact ID</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          value={field.value || ""} // Ensure value is always string for Input
                          placeholder="External contact system ID (optional)" 
                          data-testid="input-contactId"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="max-w-lg mx-auto">
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/alumni")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={createAlumni.isPending}
                  data-testid="button-submit"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createAlumni.isPending ? "Creating..." : "Create Alumni"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}