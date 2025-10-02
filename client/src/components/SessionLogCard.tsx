import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Save, X, Sparkles, Mail, MessageSquare, Building, Lock, Unlock, Copy, Send, Trash2 } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

import { SessionConfirmationDialogs } from "@/components/SessionConfirmationDialogs";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const sessionLogFormSchema = z.object({
  studentId: z.number(),
  type: z.literal("session"),
  date: z.string(),
  durationMin: z.coerce.number().min(1),
  sinceLastSession: z.string().optional(),
  overview: z.string().optional(),
  strengthsWeaknesses: z.string().optional(),

  parentMd: z.string().optional(),
  parentSms: z.string().optional(),
  companyMd: z.string().optional(),
  companySummaryMd: z.string().optional(),
  tutorMd: z.string().optional(),
  tags: z.array(z.any()).optional(),
  emailSent: z.boolean().optional(),
  textSent: z.boolean().optional(),
  companySent: z.boolean().optional(),
  parentMdLocked: z.boolean().optional(),
  parentSmsLocked: z.boolean().optional(),
  companyMdLocked: z.boolean().optional(),
});

type SessionLogFormData = z.infer<typeof sessionLogFormSchema>;

interface SessionLogCardProps {
  studentId: number;
  studentName: string;
  sessionNote?: any; // Optional - for edit mode
  onClose: () => void;
  onSave?: (data: SessionLogFormData) => Promise<void>; // Optional when using internal mutation
}

// Helper function to parse the single session text field
function parseSessionText(sessionText: string) {
  const lines = sessionText.split('\n').filter(line => line.trim());
  
  return {
    summary: lines.slice(0, 3).join(' '), // First few lines as summary
    content: sessionText,
    wordCount: sessionText.split(' ').length
  };
}

export function SessionLogCard({ studentId, studentName, sessionNote, onClose, onSave }: SessionLogCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState("email");
  const [sentNotifications, setSentNotifications] = useState({
    email: !!sessionNote?.emailSent,
    emailSentAt: sessionNote?.emailSentAt || null,
    emailHistory: sessionNote?.emailSentAt ? [sessionNote.emailSentAt] : [],
    text: !!sessionNote?.textSent,
    textSentAt: sessionNote?.textSentAt || null,
    // Show text history if textSent is true, even if timestamp is missing
    textHistory: sessionNote?.textSent ? [sessionNote.textSentAt || new Date()] : [],
    company: false
  });
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showTextConfirm, setShowTextConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update notification state when sessionNote changes
  useEffect(() => {
    if (sessionNote) {
      const emailHistory = sessionNote.emailSentAt ? [sessionNote.emailSentAt] : [];
      const textHistory = sessionNote.textSent ? [sessionNote.textSentAt || new Date()] : [];
      
      setSentNotifications({
        email: !!sessionNote.emailSent,
        emailSentAt: sessionNote.emailSentAt || null,
        emailHistory,
        text: !!sessionNote.textSent,
        textSentAt: sessionNote.textSentAt || null,
        textHistory,
        company: false
      });
    }
  }, [sessionNote]);

  // Fetch student data for AI generation
  const { data: student } = useQuery({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
  });



  // Initialize sent notifications from sessionNote
  useEffect(() => {
    if (sessionNote) {
      setSentNotifications({
        email: !!sessionNote.emailSent,
        emailSentAt: sessionNote.emailSentAt || null,
        emailHistory: sessionNote.emailSentAt ? [sessionNote.emailSentAt] : [],
        text: !!sessionNote.textSent,
        textSentAt: sessionNote.textSentAt || null,
        textHistory: sessionNote.textSentAt ? [sessionNote.textSentAt] : [],
        company: false
      });
    }
  }, [sessionNote]);
  
  const form = useForm<SessionLogFormData>({
    resolver: zodResolver(sessionLogFormSchema),
    defaultValues: {
      studentId,
      type: "session",
      date: sessionNote?.date || format(new Date(), "yyyy-MM-dd"),
      durationMin: sessionNote?.durationMin || 60,
      sinceLastSession: sessionNote?.sinceLastSession || "",
      overview: sessionNote?.overview || sessionNote?.topicsCovered || "",
      strengthsWeaknesses: sessionNote?.strengthsWeaknesses || sessionNote?.strengths || "",

      parentMd: sessionNote?.parentMd || "",
      parentSms: sessionNote?.parentSms || "",
      companyMd: sessionNote?.companyMd || "",
      companySummaryMd: sessionNote?.companySummaryMd || "",
      tutorMd: sessionNote?.tutorMd || "",
      tags: sessionNote?.tags || [],
      emailSent: sessionNote?.emailSent || false,
      emailSentAt: sessionNote?.emailSentAt || null,
      textSent: sessionNote?.textSent || false,
      textSentAt: sessionNote?.textSentAt || null,
      companySent: sessionNote?.companySent || false,
      parentMdLocked: sessionNote?.parentMdLocked || false,
      parentSmsLocked: sessionNote?.parentSmsLocked || false,
      companyMdLocked: sessionNote?.companyMdLocked || false,
    },
  });

  // Lock state helpers
  const parentEmailLocked = form.watch("parentMdLocked");
  const parentSmsLocked = form.watch("parentSmsLocked");
  const companyLocked = form.watch("companyMdLocked");
  
  // Initialize sent notifications from form data
  useEffect(() => {
    if (sessionNote) {
      setSentNotifications({
        email: sessionNote.emailSent || false,
        emailSentAt: sessionNote.emailSentAt || null,
        text: sessionNote.textSent || false,
        textSentAt: sessionNote.textSentAt || null,
        company: sessionNote.companySent || false
      });
    }
  }, [sessionNote]);

  // Lock toggle handlers
  const toggleLock = (field: "parentMdLocked" | "parentSmsLocked" | "companyMdLocked") => {
    const currentValue = form.getValues(field);
    form.setValue(field, !currentValue);
  };

  // Copy handlers
  const copyContent = (content: string) => {
    if (content) {
      // Convert HTML to plain text for copying
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      navigator.clipboard.writeText(plainText).then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Content has been copied to your clipboard.",
        });
      }).catch(() => {
        toast({
          title: "Copy failed",
          description: "Failed to copy content to clipboard.",
          variant: "destructive",
        });
      });
    }
  };

  // Send email handler
  const handleSendEmail = async () => {
    const parentMd = form.getValues("parentMd");
    if (!parentMd) {
      toast({
        title: "No content to send",
        description: "Please generate or add email content first.",
        variant: "destructive",
      });
      return;
    }

    // Get student parent email
    const parentEmail = (student as any)?.parentEmail;
    if (!parentEmail) {
      toast({
        title: "No parent email",
        description: "Please add parent email address to student profile first.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowEmailConfirm(true);
  };

  const handleConfirmEmail = async () => {
    try {
      const parentMd = form.getValues("parentMd");
      const parentEmail = (student as any)?.parentEmail;

      const response = await apiRequest("POST", `/api/send-email`, {
        to: parentEmail,
        subject: `Session Update for ${studentName}`,
        html: parentMd,
        sessionNoteId: sessionNote?.id
      });

      const sentAt = response.emailSentAt ? new Date(response.emailSentAt) : new Date();
      form.setValue("emailSent", true);
      form.setValue("emailSentAt", sentAt);
      setSentNotifications(prev => ({ 
        ...prev, 
        email: true, 
        emailSentAt: sentAt,
        // Add to history for multiple notifications
        emailHistory: [...(prev.emailHistory || []), sentAt]
      }));
      
      toast({
        title: "Email sent successfully",
        description: "Parent email has been sent.",
      });
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: "There was an error sending the email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Send text handler
  const handleSendText = async () => {
    const parentSms = form.getValues("parentSms");
    if (!parentSms) {
      toast({
        title: "No content to send",
        description: "Please generate or add text content first.",
        variant: "destructive",
      });
      return;
    }

    // Get student parent phone
    const parentPhone = (student as any)?.parentPhone;
    if (!parentPhone) {
      toast({
        title: "No parent phone",
        description: "Please add parent phone number to student profile first.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowTextConfirm(true);
  };

  const handleConfirmText = async () => {
    try {
      const parentSms = form.getValues("parentSms");
      const parentPhone = (student as any)?.parentPhone;

      const response = await apiRequest("POST", `/api/send-sms`, {
        to: parentPhone,
        body: parentSms,
        sessionNoteId: sessionNote?.id
      });

      const sentAt = response.textSentAt ? new Date(response.textSentAt) : new Date();
      form.setValue("textSent", true);
      form.setValue("textSentAt", sentAt);
      setSentNotifications(prev => ({ 
        ...prev, 
        text: true, 
        textSentAt: sentAt,
        // Add to history for multiple notifications
        textHistory: [...(prev.textHistory || []), sentAt]
      }));
      
      toast({
        title: "Text sent successfully",
        description: "Parent text message has been sent.",
      });
    } catch (error) {
      toast({
        title: "Failed to send text",
        description: "There was an error sending the text message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete session handler
  const handleDeleteSession = async () => {
    if (!sessionNote) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this session note? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await apiRequest("DELETE", `/api/session-notes/${sessionNote.id}`);
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/session-notes`] });
      
      toast({
        title: "Session deleted",
        description: "The session note has been deleted successfully.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Failed to delete session",
        description: "There was an error deleting the session. Please try again.",
        variant: "destructive",
      });
    }
  };

  // React Query mutation for save/update
  const mutation = useMutation({
    mutationFn: async (data: SessionLogFormData) => {
      // Convert single strengthsWeaknesses field back to separate database fields for compatibility
      const { strengthsWeaknesses, ...otherData } = data;
      
      const sessionDataWithHomework = {
        ...otherData,
        strengths: strengthsWeaknesses || null,
        weaknesses: null, // We store everything in strengths field for now
        homeworkAssignments: homeworkAssignments
      };

      if (sessionNote) {
        // Edit mode - PATCH existing session
        return await apiRequest("PATCH", `/api/session-notes/${sessionNote.id}`, sessionDataWithHomework);
      } else {
        // Add mode - POST new session
        return await apiRequest("POST", `/api/students/${studentId}/session-notes`, sessionDataWithHomework);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/session-notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });

      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: sessionNote ? "Session Updated" : "Session Added",
        description: sessionNote ? "Session note has been updated successfully." : "New session note has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save session note",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (data: SessionLogFormData, closeAfterSave: boolean = true) => {
    try {
      // Use onSave prop if provided (for custom handling), otherwise use internal mutation
      if (onSave) {
        const saveData = {
          ...data
        };
        await onSave(saveData);
      } else {
        await mutation.mutateAsync(data);
      }
      
      if (closeAfterSave) {
        onClose();
      }
    } catch (error) {

    }
  };

  const generateAISummary = async () => {
    try {
      setIsGenerating(true);
      const sessionData = form.getValues();
      
      // Check lock states to determine what to generate
      const parentEmailLocked = form.getValues("parentMdLocked");
      const parentSmsLocked = form.getValues("parentSmsLocked");
      const companyLocked = form.getValues("companyMdLocked");
      
      // Generate summaries (server will check lock states and generate only unlocked content)
      // No homework assignments in alumni tracking system

      const requestData = {
          // New field structure
          sinceLastSession: sessionData.sinceLastSession || 'General work',
          overview: sessionData.overview || 'General review session',
          strengthsWeaknesses: sessionData.strengthsWeaknesses || 'Good engagement and participation',
          // Legacy support (remove once fully migrated)
          topicsCovered: sessionData.overview || 'General review session',
          strengths: sessionData.strengthsWeaknesses || 'Good engagement and participation',
          weaknesses: null, // We use a single combined field now

          nextSteps: '', // SessionLogCard doesn't have nextSteps field
          studentName: (student as any)?.name || studentName || 'the student',
          parentName: (student as any)?.parentName || (student as any)?.parentFirstName || 'there',
          companyNotes: sessionData.companyMd || '',
      };
      
      const response = await apiRequest("POST", "/api/ai/generate-summary", requestData);
      
      // Try to parse as JSON if it's a Response object
      let responseData = response;
      if (response instanceof Response) {
        responseData = await response.json();
      }



      // Update form fields with generated content (only if not locked)
      // FIX: Server returns emailSummary, smsSummary, companySummary
      if (!parentEmailLocked && responseData.emailSummary) {

        form.setValue("parentMd", responseData.emailSummary);
      }
      
      if (!parentSmsLocked && responseData.smsSummary) {

        form.setValue("parentSms", responseData.smsSummary);
      }
      
      if (!companyLocked && responseData.companySummary) {

        form.setValue("companySummaryMd", responseData.companySummary);
      }
      

      
      toast({
        title: "AI Summaries Generated",
        description: "All unlocked summaries have been generated successfully.",
      });
    } catch (error) {

      toast({
        title: "Error",
        description: `Failed to generate AI summary: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => handleSave(data, true))} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium">{studentName}</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            className="text-sm border border-gray-200 rounded px-2 py-1 hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="durationMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0.5" 
                            step="0.5"
                            value={field.value ? (field.value / 60).toString() : ""}
                            onChange={(e) => {
                              const hours = parseFloat(e.target.value) || 0;
                              const minutes = Math.round(hours * 60);
                              field.onChange(minutes);
                            }}
                            className="text-sm border border-gray-200 rounded px-2 py-1 hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer w-16"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <span className="text-sm text-gray-600">hrs</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Two-card layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session Notes Card - Seamless Multi-Field Experience */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium text-gray-900 mb-4">
                  {sessionNote ? "Edit Session Note" : "Session Log"}
                </h4>
                
                <div className="space-y-0 rounded-md p-4 bg-white">
                  <FormField
                    control={form.control}
                    name="sinceLastSession"
                    render={({ field }) => (
                      <FormItem className="border-b border-gray-100 pb-3 mb-3">
                        <FormControl>
                          <Textarea 
                            placeholder="What did the student work on since last session?"
                            className="min-h-[60px] text-sm border-0 shadow-none p-0 resize-none focus-visible:ring-0 placeholder:text-gray-400 bg-white"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="overview"
                    render={({ field }) => (
                      <FormItem className="border-b border-gray-100 pb-3 mb-3">
                        <FormControl>
                          <Textarea 
                            placeholder="What did you cover in today's session?"
                            className="min-h-[60px] text-sm border-0 shadow-none p-0 resize-none focus-visible:ring-0 placeholder:text-gray-400 bg-white"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strengthsWeaknesses"
                    render={({ field }) => (
                      <FormItem className="border-b border-gray-100 pb-3 mb-3">
                        <FormControl>
                          <Textarea 
                            placeholder="What strengths and weaknesses did you observe?"
                            className="min-h-[60px] text-sm border-0 shadow-none p-0 resize-none focus-visible:ring-0 placeholder:text-gray-400 bg-white"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />



                  <FormField
                    control={form.control}
                    name="companyMd"
                    render={({ field }) => (
                      <FormItem className="border-b border-gray-100 pb-3 mb-3">
                        <FormControl>
                          <Textarea 
                            placeholder="Company notes: For internal use only. Not visible to parents."
                            className="min-h-[60px] text-sm border-0 shadow-none p-0 resize-none focus-visible:ring-0 placeholder:text-gray-400 bg-white"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tutorMd"
                    render={({ field }) => (
                      <FormItem className="border-b border-gray-100 pb-3 mb-3">
                        <FormControl>
                          <Textarea 
                            placeholder="Private notes: Only visible to you."
                            className="min-h-[60px] text-sm border-0 shadow-none p-0 resize-none focus-visible:ring-0 placeholder:text-gray-400 bg-white"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Tags (comma-separated)"
                            className="text-sm border-0 shadow-none p-0 focus-visible:ring-0 placeholder:text-gray-400 bg-white"
                            value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                            onChange={(e) => {
                              const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                              field.onChange(tags);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Communication Summary Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">AI Summaries</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateAISummary}
                    disabled={isGenerating}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGenerating ? "Generating..." : "Generate Summaries"}
                  </Button>
                </div>

                <Tabs defaultValue="email" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Parent Email
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Parent Text
                    </TabsTrigger>
                    <TabsTrigger value="company" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Company
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="mt-4">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="parentMd"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RichTextEditor
                                content={field.value || ""}
                                onChange={field.onChange}
                                placeholder="AI-generated parent email will appear here..."
                                className="h-[400px] overflow-y-auto"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyContent(form.getValues("parentMd"))}
                              className="flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendEmail}
                              className="flex items-center gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Send Email
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLock("parentMdLocked")}
                            className={`flex items-center gap-2 ${
                              parentEmailLocked ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {parentEmailLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {(() => {
                        
                        
                        
                        
                        
                        
                        // Use sessionNote data directly if available, otherwise fall back to state
                        const emailHistory = sessionNote?.emailSentAt ? [sessionNote.emailSentAt] : sentNotifications.emailHistory;
                        
                        
                        return emailHistory && emailHistory.length > 0;
                      })() && (
                        <div className="space-y-1 mt-4">
                          {(() => {
                            const emailHistory = sessionNote?.emailSentAt ? [sessionNote.emailSentAt] : sentNotifications.emailHistory;
                            return emailHistory.map((timestamp, index) => {
                              const date = new Date(timestamp);
                              const isValidDate = !isNaN(date.getTime());
                              
                              return (
                                <div key={index} className="text-sm text-green-600 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  Email sent successfully on {isValidDate ? date.toLocaleDateString() : 'Unknown date'} at {isValidDate ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="parentSms"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="AI-generated parent text will appear here..."
                                className="min-h-[400px] resize-none"
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyContent(form.getValues("parentSms"))}
                              className="flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendText}
                              className="flex items-center gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Send Text
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLock("parentSmsLocked")}
                            className={`flex items-center gap-2 ${
                              parentSmsLocked ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {parentSmsLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {(() => {
                        
                        
                        
                        
                        
                        
                        // Use sessionNote data directly if available, otherwise fall back to state
                        const textHistory = sessionNote?.textSent ? [sessionNote.textSentAt || new Date()] : sentNotifications.textHistory;
                        
                        
                        return textHistory && textHistory.length > 0;
                      })() && (
                        <div className="space-y-1 mt-4">
                          {(() => {
                            const textHistory = sessionNote?.textSent ? [sessionNote.textSentAt || new Date()] : sentNotifications.textHistory;
                            return textHistory.map((timestamp, index) => {
                              const date = timestamp ? new Date(timestamp) : null;
                              const isValidDate = date && !isNaN(date.getTime());
                              
                              return (
                                <div key={index} className="text-sm text-green-600 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  Text sent successfully{isValidDate ? ` on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="company" className="mt-4">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="companySummaryMd"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RichTextEditor
                                content={field.value || ""}
                                onChange={field.onChange}
                                placeholder="AI-generated company summary will appear here..."
                                className="h-[400px] overflow-y-auto"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyContent(form.getValues("companySummaryMd"))}
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLock("companyMdLocked")}
                          className={`flex items-center gap-2 ${
                            companyLocked ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {companyLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div className="flex items-center">
              {sessionNote && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteSession}
                  className="text-red-600 border-red-300 hover:text-red-700 hover:border-red-400 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={async () => {
                  const isValid = await form.trigger();
                  if (isValid) {
                    const data = form.getValues();
                    handleSave(data, false);
                  }
                }}
                className="flex items-center space-x-2"
              >
                <span>{mutation.isPending ? "Saving..." : "Save"}</span>
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex items-center space-x-2"
              >
                <span>{mutation.isPending ? "Saving..." : "Save & Close"}</span>
              </Button>
            </div>
          </div>
        </form>
      </Form>
      
      {/* Confirmation Dialogs */}
      <SessionConfirmationDialogs
        showEmailConfirm={showEmailConfirm}
        setShowEmailConfirm={setShowEmailConfirm}
        showTextConfirm={showTextConfirm}
        setShowTextConfirm={setShowTextConfirm}
        onConfirmEmail={handleConfirmEmail}
        onConfirmText={handleConfirmText}
      />
    </div>
  );
}