import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Trash2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import { insertExamScoreSchema } from "@shared/schema"; // Disabled for alumni transition
import { z } from "zod";
import { BASE_EXAM_TYPES } from "@/constants/examTypes";

const additionalSubjects = [
  "Algebra", "Algebra II", "AP Psych", "English", "History", "Pre-Algebra", "Study Skills", "Writing"
];

const examTypes = [
  ...BASE_EXAM_TYPES,
  ...additionalSubjects
].sort();

const maxScoreDefaults: Record<string, number> = {
  "SAT": 1600,
  "ACT": 36,
  "PSAT": 1520,
  "AP Calculus": 5,
  "AP Physics": 5,
  "AP Chemistry": 5,
  "AP Biology": 5,
  "AP History": 5,
  "AP English": 5,
  "AP Psych": 5,
  "GRE": 340,
  "GMAT": 805,
  "LSAT": 180,
  "MCAT": 528,
  "ISEE": 940,
  "SSAT": 2400,
  "Algebra": 100,
  "Algebra II": 100,
  "English": 100,
  "History": 100,
  "Pre-Algebra": 100,
  "Study Skills": 100,
  "Writing": 100
};

const defaultResources = [
  "Barron's",
  "College Board",
  "Kaplan",
  "Khan Academy",
  "Magoosh",
  "McGraw Hill",
  "Official Practice Test",
  "Princeton Review",
  "Other"
].sort();

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 25 }, (_, i) => currentYear - i);

// Temporary schema for alumni transition
const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  examType: z.string().min(1, "Exam type is required"),
  score: z.number().min(0, "Score must be positive"),
  maxScore: z.number().min(1, "Max score must be positive"),
  isReal: z.boolean(),
  resource: z.string().optional(),
  resourceMonth: z.string().optional(),
  resourceYear: z.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  score?: any; // For edit mode
  student?: any; // For filtering subjects based on tutoring types
}

function ScoreModal({ isOpen, onClose, studentId, score, student }: ScoreModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter exam types based on student's tutoring types
  const getAvailableExamTypes = () => {
    if (!student?.tutoringType) return examTypes;
    
    const tutoringTypes = Array.isArray(student.tutoringType) 
      ? student.tutoringType 
      : (typeof student.tutoringType === 'string' 
          ? JSON.parse(student.tutoringType || '[]') 
          : []);
    
    return examTypes.filter(examType => tutoringTypes.includes(examType));
  };

  const availableExamTypes = getAvailableExamTypes();
  const isEditMode = !!score;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: score?.date || new Date().toISOString().split('T')[0],
      examType: score?.examType || "",
      score: score?.score || 0,
      maxScore: score?.maxScore || 1600,
      isReal: score?.isReal || false,
      resource: score?.resource || "",
      resourceMonth: score?.resourceMonth || "",
      resourceYear: score?.resourceYear || undefined,
      notes: score?.notes || "",
    },
  });

  const selectedExamType = form.watch("examType");

  // Auto-fill max score when exam type changes (but only if max score is default)
  useEffect(() => {
    if (selectedExamType && maxScoreDefaults[selectedExamType]) {
      const currentMaxScore = form.getValues("maxScore");
      if (!currentMaxScore || currentMaxScore === 1600) {
        form.setValue("maxScore", maxScoreDefaults[selectedExamType]);
      }
    }
  }, [selectedExamType, form]);

  // Update form when score prop changes (for edit mode)
  useEffect(() => {
    if (score) {
      form.reset({
        date: score.date,
        examType: score.examType,
        score: score.score,
        maxScore: score.maxScore,
        isReal: score.isReal || false,
        resource: score.resource || "",
        resourceMonth: score.resourceMonth || "",
        resourceYear: score.resourceYear || undefined,
        notes: score.notes || "",
      });
    }
  }, [score, form, studentId]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditMode) {
        return await apiRequest("PATCH", `/api/exam-scores/${score.id}`, data);
      } else {
        
        const result = await apiRequest("POST", `/api/students/${studentId}/exam-scores`, data);
        return result;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/exam-scores`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      toast({
        title: "Success",
        description: isEditMode ? "Exam score updated successfully" : "Exam score added successfully",
      });
      if (!isEditMode) {
        form.reset();
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || (isEditMode ? "Failed to update exam score" : "Failed to add exam score"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/exam-scores/${score.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/exam-scores`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      toast({
        title: "Success",
        description: "Exam score deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exam score",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this exam score?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Score" : "Add Score"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="date" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="examType"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {availableExamTypes.map((type: string) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Score"
                        min="0"
                        className="bg-white"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxScore"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Max score"
                        min="1"
                        max="2400"
                        disabled
                        {...field}
                        value={field.value || ""}
                        className="bg-gray-50 text-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isReal"
              render={({ field }) => (
                <FormItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                          />
                          <FormLabel className="text-base">Real Exam</FormLabel>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle if this was an official exam (not practice)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <p className="text-sm text-slate-500">Optional</p>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="resource"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Test source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-48">
                          {defaultResources.map((resource) => (
                            <SelectItem key={resource} value={resource}>
                              {resource}
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
                  name="resourceMonth"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-48">
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
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
                  name="resourceYear"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-48">
                          {years.map((year) => (
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
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Performance notes, areas of improvement..."
                      className="resize-none bg-white"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={`flex ${isEditMode ? 'justify-between' : 'justify-end'} space-x-2 pt-4`}>
              {isEditMode && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <span>{deleteMutation.isPending ? "Deleting..." : "Delete"}</span>
                </Button>
              )}
              
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending 
                    ? (isEditMode ? "Updating..." : "Adding...") 
                    : (isEditMode ? "Update Score" : "Add Score")
                  }
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ScoreModal;