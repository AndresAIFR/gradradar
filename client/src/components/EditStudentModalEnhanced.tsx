import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Archive } from "lucide-react";
import { BASE_EXAM_TYPES } from "@/constants/examTypes";

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any; // Optional for add mode
  mode?: 'edit' | 'add';
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pronouns: z.string().optional(),
  dateOfBirth: z.string().optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  parentName: z.string().optional(),
  parentRelationship: z.string().optional(),
  parentEmail: z.string().email().optional().or(z.literal("")),
  parentPhone: z.string().optional(),
  parentCarrier: z.string().optional(),
  parentPreferredCommunication: z.string().optional(),
  tutoringType: z.array(z.string()).optional(),
  targetScore: z.number().optional(),
  officialTestDate: z.string().optional(),

  // SAT specific fields
  satTargetScore: z.number().optional(),
  satTestDate: z.string().optional(),
  satReadingWritingTarget: z.number().optional(),
  satMathTarget: z.number().optional(),
  // ACT specific fields
  actTargetScore: z.number().optional(),
  actTestDate: z.string().optional(),
  actEnglishTarget: z.number().optional(),
  actMathTarget: z.number().optional(),
  actReadingTarget: z.number().optional(),
  actScienceTarget: z.number().optional(),
  // GMAT specific fields
  gmatTargetScore: z.number().optional(),
  gmatTestDate: z.string().optional(),
  gmatDataInsightsTarget: z.number().optional(),
  gmatVerbalTarget: z.number().optional(),
  gmatQuantitativeTarget: z.number().optional(),
  // GRE specific fields
  greTargetScore: z.number().optional(),
  greTestDate: z.string().optional(),
  greVerbalReasoningTarget: z.number().optional(),
  greQuantitativeReasoningTarget: z.number().optional(),
  greAnalyticalWritingTarget: z.number().optional(),
  // ISEE specific fields
  iseeTargetScore: z.number().optional(),
  iseeTestDate: z.string().optional(),
  iseeVerbalReasoningTarget: z.number().optional(),
  iseeQuantitativeReasoningTarget: z.number().optional(),
  iseeReadingComprehensionTarget: z.number().optional(),
  iseeMathematicsAchievementTarget: z.number().optional(),
  // SSAT specific fields
  ssatTargetScore: z.number().optional(),
  ssatTestDate: z.string().optional(),
  ssatVerbalTarget: z.number().optional(),
  ssatQuantitativeTarget: z.number().optional(),
  ssatReadingTarget: z.number().optional(),
  // Custom targets for non-standard exam types
  customTargets: z.record(z.number()).optional(),
  customTestDates: z.record(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

const pronounOptions = [
  "he/him", "she/her", "they/them", "ze/zir", "xe/xem", "Other"
];

const gradeOptions = [
  "Pre-K", "Kindergarten", 
  "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade",
  "6th Grade", "7th Grade", "8th Grade",
  "9th Grade (Freshman)", "10th Grade (Sophomore)", "11th Grade (Junior)", "12th Grade (Senior)",
  "College Freshman", "College Sophomore", "College Junior", "College Senior",
  "Graduate School", "Post-Graduate"
];

const additionalSubjects = [
  "Algebra", "Algebra II", "AP Psych", "English", "History", "Pre-Algebra", "Study Skills", "Writing"
];

const tutoringOptions = [
  ...BASE_EXAM_TYPES,
  ...additionalSubjects
].sort();

const communicationOptions = [
  "Email", "Text"
];

const relationshipOptions = [
  "Mother", "Father", "Guardian", "Grandmother", "Grandfather", 
  "Sister", "Brother", "Aunt", "Uncle", "Social Worker", 
  "Principal", "Teacher", "Other"
];

const carrierOptions = [
  "Verizon", "AT&T", "T-Mobile", "Sprint", "Boost Mobile", 
  "Cricket", "Metro PCS", "US Cellular", "Virgin Mobile", "Xfinity Mobile"
];

export default function EditStudentModalEnhanced({ isOpen, onClose, student, mode = 'edit' }: EditStudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: student?.name || "",
      pronouns: student?.pronouns || "",
      dateOfBirth: student?.dateOfBirth || "",
      grade: student?.grade || "",
      school: student?.school || "",
      email: student?.email || "",
      phone: student?.phone || "",
      parentName: student?.parentName || "",
      parentRelationship: student?.parentRelationship || "",
      parentEmail: student?.parentEmail || "",
      parentPhone: student?.parentPhone || "",
      parentCarrier: student?.parentCarrier || "",
      parentPreferredCommunication: student?.parentPreferredCommunication || "",
      tutoringType: student?.tutoringType || [],
      targetScore: student?.targetScore || undefined,
      officialTestDate: student?.officialTestDate || "",

      // SAT specific fields
      satTargetScore: student?.satTargetScore || undefined,
      satTestDate: student?.satTestDate || "",
      satReadingWritingTarget: student?.satReadingWritingTarget || undefined,
      satMathTarget: student?.satMathTarget || undefined,
      // ACT specific fields
      actTargetScore: student?.actTargetScore || undefined,
      actTestDate: student?.actTestDate || "",
      actEnglishTarget: student?.actEnglishTarget || undefined,
      actMathTarget: student?.actMathTarget || undefined,
      actReadingTarget: student?.actReadingTarget || undefined,
      actScienceTarget: student?.actScienceTarget || undefined,
      // GMAT specific fields
      gmatTargetScore: student?.gmatTargetScore || undefined,
      gmatTestDate: student?.gmatTestDate || "",
      gmatDataInsightsTarget: student?.gmatDataInsightsTarget || undefined,
      gmatVerbalTarget: student?.gmatVerbalTarget || undefined,
      gmatQuantitativeTarget: student?.gmatQuantitativeTarget || undefined,
      // GRE specific fields
      greTargetScore: student?.greTargetScore || undefined,
      greTestDate: student?.greTestDate || "",
      greVerbalReasoningTarget: student?.greVerbalReasoningTarget || undefined,
      greQuantitativeReasoningTarget: student?.greQuantitativeReasoningTarget || undefined,
      greAnalyticalWritingTarget: student?.greAnalyticalWritingTarget || undefined,
      // ISEE specific fields
      iseeTargetScore: student?.iseeTargetScore || undefined,
      iseeTestDate: student?.iseeTestDate || "",
      iseeVerbalReasoningTarget: student?.iseeVerbalReasoningTarget || undefined,
      iseeQuantitativeReasoningTarget: student?.iseeQuantitativeReasoningTarget || undefined,
      iseeReadingComprehensionTarget: student?.iseeReadingComprehensionTarget || undefined,
      iseeMathematicsAchievementTarget: student?.iseeMathematicsAchievementTarget || undefined,
      // SSAT specific fields
      ssatTargetScore: student?.ssatTargetScore || undefined,
      ssatTestDate: student?.ssatTestDate || "",
      ssatVerbalTarget: student?.ssatVerbalTarget || undefined,
      ssatQuantitativeTarget: student?.ssatQuantitativeTarget || undefined,
      ssatReadingTarget: student?.ssatReadingTarget || undefined,
      // Custom targets for non-standard exam types
      customTargets: student?.customTargets || {},
      customTestDates: student?.customTestDates || {},
    },
  });

  // Reset form when student data changes (for edit mode)
  useEffect(() => {
    if (student && mode === 'edit') {
      form.reset({
        name: student.name || "",
        pronouns: student.pronouns || "",
        dateOfBirth: student.dateOfBirth || "",
        grade: student.grade || "",
        school: student.school || "",
        email: student.email || "",
        phone: student.phone || "",
        parentName: student.parentName || "",
        parentRelationship: student.parentRelationship || "",
        parentEmail: student.parentEmail || "",
        parentPhone: student.parentPhone || "",
        parentCarrier: student.parentCarrier || "",
        parentPreferredCommunication: student.parentPreferredCommunication || "",
        tutoringType: student.tutoringType || [],
        targetScore: student.targetScore || undefined,
        officialTestDate: student.officialTestDate || "",

        // SAT specific fields
        satTargetScore: student.satTargetScore || undefined,
        satTestDate: student.satTestDate || "",
        satReadingWritingTarget: student.satReadingWritingTarget || undefined,
        satMathTarget: student.satMathTarget || undefined,
        // ACT specific fields
        actTargetScore: student.actTargetScore || undefined,
        actTestDate: student.actTestDate || "",
        actEnglishTarget: student.actEnglishTarget || undefined,
        actMathTarget: student.actMathTarget || undefined,
        actReadingTarget: student.actReadingTarget || undefined,
        actScienceTarget: student.actScienceTarget || undefined,
        // GMAT specific fields
        gmatTargetScore: student.gmatTargetScore || undefined,
        gmatTestDate: student.gmatTestDate || "",
        gmatDataInsightsTarget: student.gmatDataInsightsTarget || undefined,
        gmatVerbalTarget: student.gmatVerbalTarget || undefined,
        gmatQuantitativeTarget: student.gmatQuantitativeTarget || undefined,
        // GRE specific fields
        greTargetScore: student.greTargetScore || undefined,
        greTestDate: student.greTestDate || "",
        greVerbalReasoningTarget: student.greVerbalReasoningTarget || undefined,
        greQuantitativeReasoningTarget: student.greQuantitativeReasoningTarget || undefined,
        greAnalyticalWritingTarget: student.greAnalyticalWritingTarget || undefined,
        // ISEE specific fields
        iseeTargetScore: student.iseeTargetScore || undefined,
        iseeTestDate: student.iseeTestDate || "",
        iseeVerbalReasoningTarget: student.iseeVerbalReasoningTarget || undefined,
        iseeQuantitativeReasoningTarget: student.iseeQuantitativeReasoningTarget || undefined,
        iseeReadingComprehensionTarget: student.iseeReadingComprehensionTarget || undefined,
        iseeMathematicsAchievementTarget: student.iseeMathematicsAchievementTarget || undefined,
        // SSAT specific fields
        ssatTargetScore: student.ssatTargetScore || undefined,
        ssatTestDate: student.ssatTestDate || "",
        ssatVerbalTarget: student.ssatVerbalTarget || undefined,
        ssatQuantitativeTarget: student.ssatQuantitativeTarget || undefined,
        ssatReadingTarget: student.ssatReadingTarget || undefined,
        // Custom targets for non-standard exam types
        customTargets: student.customTargets || {},
        customTestDates: student.customTestDates || {},
      });
    }
  }, [student, mode, form]);

  // Watch date of birth to auto-calculate age
  const dateOfBirth = form.watch("dateOfBirth");
  const calculatedAge = calculateAge(dateOfBirth || "");
  
  // Watch tutoring subjects to show subject-specific cards
  const selectedSubjects = form.watch("tutoringType") || [];
  
  // Identify custom subjects (not in BASE_EXAM_TYPES)
  const customSubjects = selectedSubjects.filter((subject: string) => 
    !BASE_EXAM_TYPES.includes(subject as any)
  );
  
  // Get test sections based on test type
  const getTestSections = (testType: string) => {
    switch (testType) {
      case "SAT":
        return ["Reading & Writing", "Math"];
      case "ACT":
        return ["English", "Math", "Reading", "Science"];
      case "GMAT":
        return ["Data Insights", "Verbal", "Quant"];
      case "GRE":
        return ["Verbal", "Quant", "Writing"];
      default:
        return [];
    }
  };

  const updateStudentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { tutoringType, customTargets, customTestDates, ...rest } = data;
      
      // Clean up date fields - convert empty strings to null
      const cleanedData = { ...rest };
      Object.keys(cleanedData).forEach(key => {
        if ((key.includes('Date') || key === 'dateOfBirth') && cleanedData[key as keyof FormData] === '') {
          (cleanedData as any)[key] = null;
        }
      });
      
      // Clear exam-specific data for exams not in tutoring types
      const selectedTutoringTypes = tutoringType || [];
      
      // If SAT not selected, clear SAT data
      if (!selectedTutoringTypes.includes('SAT')) {
        cleanedData.satTargetScore = null;
        cleanedData.satTestDate = null;
        cleanedData.satReadingWritingTarget = null;
        cleanedData.satMathTarget = null;
      }
      
      // If ACT not selected, clear ACT data
      if (!selectedTutoringTypes.includes('ACT')) {
        cleanedData.actTargetScore = null;
        cleanedData.actTestDate = null;
        cleanedData.actEnglishTarget = null;
        cleanedData.actMathTarget = null;
        cleanedData.actReadingTarget = null;
        cleanedData.actScienceTarget = null;
      }
      
      // If GMAT not selected, clear GMAT data
      if (!selectedTutoringTypes.includes('GMAT')) {
        cleanedData.gmatTargetScore = null;
        cleanedData.gmatTestDate = null;
        cleanedData.gmatDataInsightsTarget = null;
        cleanedData.gmatVerbalTarget = null;
        cleanedData.gmatQuantitativeTarget = null;
      }
      
      // If GRE not selected, clear GRE data
      if (!selectedTutoringTypes.includes('GRE')) {
        cleanedData.greTargetScore = null;
        cleanedData.greTestDate = null;
        cleanedData.greVerbalReasoningTarget = null;
        cleanedData.greQuantitativeReasoningTarget = null;
        cleanedData.greAnalyticalWritingTarget = null;
      }
      
      // If ISEE not selected, clear ISEE data
      if (!selectedTutoringTypes.includes('ISEE')) {
        cleanedData.iseeTargetScore = null;
        cleanedData.iseeTestDate = null;
        cleanedData.iseeVerbalReasoningTarget = null;
        cleanedData.iseeQuantitativeReasoningTarget = null;
        cleanedData.iseeReadingComprehensionTarget = null;
        cleanedData.iseeMathematicsAchievementTarget = null;
      }
      
      // If SSAT not selected, clear SSAT data
      if (!selectedTutoringTypes.includes('SSAT')) {
        cleanedData.ssatTargetScore = null;
        cleanedData.ssatTestDate = null;
        cleanedData.ssatVerbalTarget = null;
        cleanedData.ssatQuantitativeTarget = null;
        cleanedData.ssatReadingTarget = null;
      }
      
      const payload = {
        ...cleanedData,
        tutoringType: tutoringType || [],
        customTargets: customTargets || {},
        customTestDates: customTestDates || {},
      };
      

      
      if (mode === 'add') {
        await apiRequest("POST", "/api/students", payload);
      } else {
        await apiRequest("PATCH", `/api/students/${student.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      if (mode === 'edit') {
        queryClient.invalidateQueries({ queryKey: [`/api/students/${student.id}`] });
      }
      toast({
        title: mode === 'add' ? "Student added" : "Student updated",
        description: mode === 'add' ? "Student has been added successfully." : "Student profile has been updated successfully.",
      });
      if (mode === 'add') {
        form.reset();
      }
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update student. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/students/${student.id}`, { isArchived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Student archived",
        description: "Student has been archived successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive student. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateStudentMutation.mutate(data);
  };

  const handleArchive = () => {
    if (confirm("Are you sure you want to archive this student? They will be moved to archived students.")) {
      deleteStudentMutation.mutate();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!student && mode === 'edit') return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{mode === 'add' ? 'Add New Student' : 'Edit Student Profile'}</DialogTitle>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              
              {/* Name, Pronouns, DOB, Age, Grade on first line */}
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Full Name *" className="bg-white border-slate-300" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="pronouns"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-slate-300">
                              <SelectValue placeholder="Pronouns" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pronounOptions.map((pronoun) => (
                              <SelectItem key={pronoun} value={pronoun}>
                                {pronoun}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input type="date" className="bg-white border-slate-300 pl-12" {...field} />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                              DOB
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1">
                  <FormItem>
                    <FormControl>
                      <Input 
                        value={calculatedAge !== null ? calculatedAge.toString() : ""} 
                        placeholder="Age"
                        disabled
                        className="bg-gray-50 border-slate-300 text-center w-16"
                      />
                    </FormControl>
                  </FormItem>
                </div>
                
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-slate-300">
                              <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {gradeOptions.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
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
              
              {/* School, Email and Phone on second line */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="School" className="bg-white border-slate-300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="email" placeholder="Email" className="bg-white border-slate-300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Phone" className="bg-white border-slate-300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>
            
            {/* Tutoring Information */}
            <div className="space-y-4">
              
              <FormField
                control={form.control}
                name="tutoringType"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormLabel className="text-sm font-medium text-slate-700 whitespace-nowrap">Subject:</FormLabel>
                      <div className="w-64">
                        <Select
                        onValueChange={(value) => {
                          if (value && !field.value?.includes(value)) {
                            field.onChange([...(field.value || []), value]);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-300">
                            <SelectValue placeholder="Add Subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tutoringOptions
                            .filter(option => !field.value?.includes(option))
                            .map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              
              {/* Subject-Specific Data Cards */}
              {selectedSubjects.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedSubjects.map((subject: string) => {
                      const sections = getTestSections(subject);
                      const isStandardizedTest = sections.length > 0;
                      
                      return (
                        <div key={subject} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-indigo-900">{subject}</h5>
                            <button
                              type="button"
                              onClick={() => {
                                const currentValues = form.getValues("tutoringType") || [];
                                form.setValue("tutoringType", currentValues.filter(s => s !== subject));
                              }}
                              className="text-indigo-400 hover:text-indigo-600 text-lg font-bold leading-none"
                            >
                              ×
                            </button>
                          </div>
                          <div className="space-y-3">
                            {isStandardizedTest ? (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <FormField
                                    control={form.control}
                                    name={`${subject.toLowerCase()}TargetScore` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input 
                                            type="number"
                                            placeholder="Target Score" 
                                            className="bg-white border-indigo-300 text-sm"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`${subject.toLowerCase()}TestDate` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input 
                                            type="date"
                                            placeholder="Test Date"
                                            className="bg-white border-indigo-300 text-sm"
                                            {...field}
                                            value={field.value || ''}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {sections.map((section) => {
                                    const fieldName = `${subject.toLowerCase()}${section.replace(/[^a-zA-Z]/g, '')}Target` as any;
                                    return (
                                      <FormField
                                        key={section}
                                        control={form.control}
                                        name={fieldName}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Input 
                                                type="number"
                                                placeholder={section} 
                                                className="bg-white border-indigo-300 text-sm"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`customTargets.${subject}` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          placeholder="Target Score" 
                                          className="bg-white border-indigo-300 text-sm"
                                          {...field}
                                          onChange={(e) => {
                                            const value = e.target.value ? Number(e.target.value) : undefined;
                                            field.onChange(value);
                                          }}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`customTestDates.${subject}` as any}
                                  render={({ field }) => (
                                    <FormItem>

                                      <FormControl>
                                        <Input 
                                          type="date"
                                          placeholder="Test Date"
                                          className="bg-white border-indigo-300 text-sm"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-xs font-medium text-indigo-700">Notes</label>
                              <Textarea 
                                placeholder="Subject-specific notes..." 
                                className="bg-white border-indigo-300 text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
            
            {/* Parent Contact Information - moved to bottom */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-medium text-slate-900">Parent/Guardian Information</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Prefers:</span>
                  <FormField
                    control={form.control}
                    name="parentPreferredCommunication"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-blue-50 border-blue-300 w-20 h-8 text-xs">
                              <SelectValue placeholder="Email" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {communicationOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
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
              
              {/* All parent fields on one line */}
              <div className="grid grid-cols-5 gap-3">
                <FormField
                  control={form.control}
                  name="parentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Parent Name *" className="bg-white border-slate-300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-300">
                            <SelectValue placeholder="Relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {relationshipOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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
                  name="parentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="email" placeholder="Parent Email" className="bg-white border-slate-300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Parent Phone" className="bg-white border-slate-300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentCarrier"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-300">
                            <SelectValue placeholder="Carrier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {carrierOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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
            

            
            <div className="flex justify-between items-center pt-4 border-t">
              {mode !== 'add' && (
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
                        deleteStudentMutation.mutate();
                      }
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                    className="flex items-center space-x-2 text-slate-600 hover:text-slate-800"
                  >
                    <Archive className="h-4 w-4" />
                    <span>Archive</span>
                  </Button>
                </div>
              )}
              {mode === 'add' && <div></div>}
              
              <div className="flex space-x-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateStudentMutation.isPending}
                >
                  {updateStudentMutation.isPending 
                    ? (mode === 'add' ? "Adding..." : "Saving...") 
                    : (mode === 'add' ? "Add Student" : "Save Changes")
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