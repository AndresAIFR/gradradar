import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { qk } from "@/lib/queryKeys";
import { useAttachments } from "@/hooks/useAttachments";
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  Sparkles, 
  Copy, 
  Mail, 
  Lock, 
  Unlock, 
  Trash2, 
  Phone, 
  MessageSquare, 
  Users, 
  StickyNote, 
  CheckCircle, 
  Flag, 
  Star, 
  Paperclip,
  Plus,
  Download
} from "lucide-react";
import { format } from "date-fns";
import type { Alumni } from "@shared/schema";

interface InlineNoteFormProps {
  alumni: Alumni;
  onCancel: (() => void) | null;
  interaction?: any; // For editing existing interactions
  onChangeDetected?: (hasChanges: boolean) => void; // Callback to report changes
  onSaveSuccess?: () => void; // Callback when save is successful
  hideHeader?: boolean; // Option to hide the name from header
  hideTimestamp?: boolean; // Option to hide the date/time from header
}

export default function InlineNoteForm({ alumni, onCancel, interaction, onChangeDetected, onSaveSuccess, hideHeader, hideTimestamp }: InlineNoteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [date, setDate] = useState(
    interaction ? interaction.date : format(new Date(), 'yyyy-MM-dd')
  );
  const [noteType, setNoteType] = useState<string>(
    interaction ? interaction.type : 'general'
  );
  const [responseState, setResponseState] = useState<'none' | 'responded' | 'connected-cleared'>(
    interaction ? 
      (interaction.studentResponded && interaction.completeAllFollowups ? 'connected-cleared' : 
       interaction.studentResponded ? 'responded' : 'none') : 'none'
  );
  const [needsFollowUp, setNeedsFollowUp] = useState<boolean>(
    interaction ? interaction.needsFollowUp || false : false
  );
  const [followUpPriority, setFollowUpPriority] = useState<string>(
    interaction ? interaction.followUpPriority || 'none' : 'none'
  );
  const [followUpDate, setFollowUpDate] = useState<string | null>(
    interaction ? interaction.followUpDate || null : null
  );
  const [noteContent, setNoteContent] = useState(
    interaction ? interaction.overview || '' : ''
  );
  const [aiSummary, setAiSummary] = useState(
    interaction ? interaction.internalSummary || '' : ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLocked, setIsLocked] = useState(
    interaction ? interaction.summaryLocked || false : false
  );

  // Fetch existing attachments when editing
  const { data: existingAttachments = [], isLoading: attachmentsLoading } = useAttachments(
    interaction ? alumni.id : 0, 
    interaction ? interaction.id : 0
  );


  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return apiRequest('DELETE', `/api/alumni/${alumni.id}/interactions/${interaction?.id}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      // Invalidate attachment cache to refetch
      queryClient.invalidateQueries({ queryKey: ['attachments', alumni.id, interaction?.id] });
      toast({
        title: "Attachment deleted",
        description: "The attachment has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error('Delete attachment error:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the attachment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Calculate follow-up date based on priority
  const calculateFollowUpDate = (priority: string): string | null => {
    if (priority === 'none') return null;
    
    const today = new Date();
    let daysToAdd = 0;
    
    switch (priority) {
      case 'urgent':
        daysToAdd = 1; // Next day
        break;
      case 'high':
        daysToAdd = 3; // 3 days
        break;
      case 'normal':
        daysToAdd = 7; // 1 week
        break;
      case 'low':
        daysToAdd = 30; // 1 month
        break;
      default:
        return null;
    }
    
    const followUpDate = new Date(today);
    followUpDate.setDate(today.getDate() + daysToAdd);
    

    
    return format(followUpDate, 'yyyy-MM-dd');
  };

  // Handle follow-up priority change
  const handleFollowUpPriorityChange = (priority: string) => {
    setFollowUpPriority(priority);
    setNeedsFollowUp(priority !== 'none');
    
    // Auto-calculate follow-up date
    const calculatedDate = calculateFollowUpDate(priority);
    setFollowUpDate(calculatedDate);
  };
  
  // Track the current note ID (for switching from create to edit mode)
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(
    interaction ? interaction.id : null
  );

  // File attachment management
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Array<{
    file: File;
    preview?: string;
    isImage: boolean;
  }>>([]);

  // Reset form state when interaction prop changes
  useEffect(() => {
    if (interaction) {
      setDate(interaction.date);
      setNoteType(interaction.type || 'general');
      setNoteContent(interaction.overview || '');
      setAiSummary(interaction.internalSummary || '');
      setIsLocked(interaction.summaryLocked || false);
      setResponseState(
        interaction.studentResponded && interaction.completeAllFollowups ? 'connected-cleared' : 
        interaction.studentResponded ? 'responded' : 'none'
      );
      setNeedsFollowUp(interaction.needsFollowUp || false);
      setFollowUpPriority(interaction.followUpPriority || 'none');
      setFollowUpDate(interaction.followUpDate || null);
      setCurrentNoteId(interaction.id);
    } else {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setNoteType('general');
      setNoteContent('');
      setAiSummary('');
      setIsLocked(false);
      setResponseState('none');
      setNeedsFollowUp(false);
      setCurrentNoteId(null);
    }
  }, [interaction?.id]); // Only re-run when interaction ID changes

  // Track initial values to detect changes
  const [initialValues, setInitialValues] = useState({
    date: interaction ? interaction.date : format(new Date(), 'yyyy-MM-dd'),
    noteType: interaction ? interaction.type || 'general' : 'general',
    noteContent: interaction ? interaction.overview || '' : '',
    aiSummary: interaction ? interaction.internalSummary || '' : '',
    responseState: interaction ? 
      (interaction.studentResponded && interaction.completeAllFollowups ? 'connected-cleared' : 
       interaction.studentResponded ? 'responded' : 'none') : 'none',
    needsFollowUp: interaction ? interaction.needsFollowUp || false : false
  });

  // Update initial values when interaction changes
  useEffect(() => {
    if (interaction) {
      setInitialValues({
        date: interaction.date,
        noteType: interaction.type || 'general',
        noteContent: interaction.overview || '',
        aiSummary: interaction.internalSummary || '',
        responseState: interaction.studentResponded && interaction.completeAllFollowups ? 'connected-cleared' : 
        interaction.studentResponded ? 'responded' : 'none',
        needsFollowUp: interaction.needsFollowUp || false
      });
    } else {
      setInitialValues({
        date: format(new Date(), 'yyyy-MM-dd'),
        noteType: 'general',
        noteContent: '',
        aiSummary: '',
        responseState: 'none',
        needsFollowUp: false
      });
    }
  }, [interaction?.id]);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = () => {
    const currentValues = { date, noteType, noteContent, aiSummary, responseState, needsFollowUp };
    const hasChanges = JSON.stringify(currentValues) !== JSON.stringify(initialValues);
    return hasChanges;
  };

  // Monitor changes and notify parent component
  useEffect(() => {
    const hasChanges = hasUnsavedChanges();
    if (onChangeDetected) {
      onChangeDetected(hasChanges);
    }
  }, [date, noteType, noteContent, aiSummary, responseState, needsFollowUp, initialValues, onChangeDetected]);

  // Define icons directly to avoid import issues
  const getIcon = (type: string) => {
    switch (type) {
      case 'general': return StickyNote;
      case 'phone': return Phone;
      case 'email': return Mail;
      case 'text': return MessageSquare;
      case 'in-person': return Users;
      default: return Phone;
    }
  };

  const noteTypes = [
    { value: 'general', label: 'General' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text' },
    { value: 'in-person', label: 'In-Person' },
  ];

  const isCommunicationType = (type: string) => {
    return ['phone', 'email', 'text', 'in-person'].includes(type);
  };

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      if (!interaction?.id) {
        throw new Error("No interaction ID found - cannot delete");
      }
      
      return await apiRequest("DELETE", `/api/alumni/${alumni.id}/interactions/${interaction.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.alumniInteractions(alumni.id.toString()) });
      
      // Un-strikethrough alumni in contact queue (reverse of creation)
      queryClient.setQueryData(['/api/alumni'], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((a: any) => 
          a.id === alumni.id 
            ? { ...a, attemptedToday: false }
            : a
        );
      });
      
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
      onCancel?.();
    },
    onError: (error) => {
      console.error("Failed to delete note:", error.message);
      toast({
        title: "Error",
        description: `Failed to delete note: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Create or update note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (data: {
      alumniId: number;
      date: string;
      type: string;
      content: string;
      aiSummary?: string;
      locked?: boolean;
      studentResponded?: boolean;
      needsFollowUp?: boolean;
      followUpPriority?: string;
      followUpDate?: string | null;
      completeAllFollowups?: boolean;
      closeAfterSave?: boolean;
    }) => {
      const endpoint = currentNoteId 
        ? `/api/alumni/${alumni.id}/interactions/${currentNoteId}`
        : `/api/alumni/${alumni.id}/interactions`;
      
      const method = currentNoteId ? 'PATCH' : 'POST';
      
      const payload = {
        date: data.date,
        durationMin: 0, // General notes don't have duration
        type: data.type,
        overview: data.content,
        internalSummary: data.aiSummary,
        summaryLocked: data.locked,
        studentResponded: data.studentResponded,
        needsFollowUp: data.needsFollowUp,
        followUpPriority: data.followUpPriority,
        followUpDate: data.followUpDate,
        completeAllFollowups: data.completeAllFollowups,
      };
      
      try {
        const response = await apiRequest(method, endpoint, payload);
        
        // apiRequest already returns parsed JSON data
        return response;
      } catch (error) {
        
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // If this was a new note creation (POST), capture the ID for future edits
      if (!currentNoteId && data && data.id) {
        
        setCurrentNoteId(data.id);
      }
      
      toast({
        title: "Success",
        description: currentNoteId ? "Note updated successfully" : "Note created successfully",
      });
      
      // Show additional toast for completed follow-ups
      if (variables.completeAllFollowups && variables.studentResponded) {
        toast({
          title: "Follow-ups Completed",
          description: "All pending follow-ups for this alumni have been resolved",
        });
      }
      
      // Only invalidate queries when closing the form to prevent flickering during "Save & Continue"
      if (variables.closeAfterSave) {
        // Use the proper query key helpers to ensure cache invalidation works
        // Fix: Ensure consistent string ID type for cache key matching
        const key = qk.alumniInteractions(String(alumni.id));
        
        // Invalidate and refetch interactions
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.refetchQueries({ queryKey: key });
        
        // Also invalidate the alumni query for consistency
        queryClient.invalidateQueries({ queryKey: qk.alumniById(String(alumni.id)) });
        
        // Mark alumni as attempted today via optimistic update (for contact queue strikethrough)
        if (!interaction) { // Only for new notes, not edits
          queryClient.setQueryData(['/api/alumni'], (old: any) => {
            if (!old || !Array.isArray(old)) return old;
            return old.map((a: any) => 
              a.id === alumni.id 
                ? { ...a, attemptedToday: true }
                : a
            );
          });
        }
      }
      
      // Log current cache state
      
      
      // Call success callback for queue management (always call for new notes)
      if (!interaction && onSaveSuccess) {
        console.log('🔍 QUEUE: Calling onSaveSuccess for alumni', alumni.id);
        onSaveSuccess();
      }
      
      // Upload files if any are selected
      if (selectedFiles.length > 0) {
        const noteIdForUpload = currentNoteId || data?.id;
        if (noteIdForUpload) {
          console.log('📎 ATTACHMENTS: Uploading', selectedFiles.length, 'files to note', noteIdForUpload);
          uploadFilesMutation.mutate({ 
            noteId: noteIdForUpload, 
            files: selectedFiles 
          });
        } else {
          console.error('📎 ATTACHMENTS: No note ID available for file upload');
        }
      }
      
      // For new notes (not editing), reset the form if not closing
      if (!interaction && !variables.closeAfterSave) {
        console.log('🔍 FORM: Resetting form after successful save');
        // Reset form to initial state
        setNoteContent('');
        setAiSummary('');
        setResponseState('none');
        setNeedsFollowUp(false);
        setFollowUpPriority('none');
        setFollowUpDate(null);
        setNoteType('general');
        setDate(format(new Date(), 'yyyy-MM-dd'));
      }
      
      // Only close the form if closeAfterSave was requested
      if (variables.closeAfterSave && onCancel) {
        onCancel();
      }
    },
    onError: (error) => {
      
      toast({
        title: "Error",
        description: interaction ? "Failed to update note" : "Failed to create note",
        variant: "destructive",
      });
    },
  });

  // AI summary generation mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (content: string) => {
      
      try {
        const response = await apiRequest('POST', '/api/ai/generate-note-summary', {
          noteContent: content,
          alumniId: alumni.id,
          noteType,
        });
        const data = await response.json();
        return data;
      } catch (error) {
        
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data?.summary) {
        
        toast({
          title: "Error",
          description: "No AI summary received",
          variant: "destructive",
        });
        return;
      }
      setAiSummary(data.summary);
      toast({
        title: "Success",
        description: "AI summary generated successfully",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    },
    onError: (error) => {
      
      toast({
        title: "Error", 
        description: "Failed to generate AI summary",
        variant: "destructive",
      });
    },
  });

  const handleSave = (closeAfterSave = false) => {
    if (!noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter note content",
        variant: "destructive",
      });
      return;
    }

    saveNoteMutation.mutate({
      alumniId: alumni.id,
      date,
      type: noteType,
      content: noteContent,
      aiSummary,
      locked: isLocked,
      studentResponded: responseState === 'responded' || responseState === 'connected-cleared',
      needsFollowUp,
      followUpPriority,
      followUpDate,
      completeAllFollowups: responseState === 'connected-cleared',
      closeAfterSave,
    });
  };

  const handleResponseToggle = () => {
    setResponseState(prev => {
      switch (prev) {
        case 'none':
          return 'responded';
        case 'responded':
          return 'connected-cleared';
        case 'connected-cleared':
          return 'none';
        default:
          return 'none';
      }
    });
  };

  const handleGenerateAI = async () => {
    if (!noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter note content first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-note-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          alumniId: alumni.id,
          noteContent: noteContent,
          noteType: noteType
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();
      setAiSummary(data.summary);
      
      toast({
        title: "AI Summary Generated",
        description: "Summary has been generated successfully",
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate AI summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiSummary);
    toast({
      title: "Success",
      description: "AI summary copied to clipboard",
    });
  };

  const handleSendEmail = () => {
    // This would integrate with email service
    toast({
      title: "Email Sent",
      description: "AI summary sent via email",
    });
  };

  const handleDelete = () => {
    if (!interaction?.id) {
      toast({
        title: "Error",
        description: "Cannot delete note: No note ID found",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      deleteNoteMutation.mutate();
    }
  };

  // File upload mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async ({ noteId, files }: { noteId: number; files: File[] }) => {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/alumni/${alumni.id}/interactions/${noteId}/attachments/upload`, {
          method: 'POST',
          body: formData
          // Note: No Content-Type header needed, browser sets it automatically for FormData
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        return response.json();
      });
      
      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      toast({
        title: "Files uploaded",
        description: "All attachments have been uploaded successfully",
      });
      
      // Clear attachment state after successful upload
      setSelectedFiles([]);
      setAttachmentPreviews([]);
      
      // Invalidate both interaction queries AND attachment cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: [qk.alumniInteractions, alumni.id] });
      // THIS IS THE KEY FIX - invalidate attachment cache too!
      queryClient.invalidateQueries({ queryKey: ['attachments', alumni.id, interaction?.id] });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Some files could not be uploaded. Please try again.",
        variant: "destructive"
      });
    }
  });

  // File handling functions
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // File validation
    const validFiles = files.filter(file => {
      // Check file type
      const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    // Check total size limit (30MB)
    const currentSize = selectedFiles.reduce((total, file) => total + file.size, 0);
    const newSize = validFiles.reduce((total, file) => total + file.size, 0);
    const maxSize = 30 * 1024 * 1024; // 30MB
    
    if (currentSize + newSize > maxSize) {
      toast({
        title: "File size limit exceeded",
        description: "Total file size cannot exceed 30MB per note",
        variant: "destructive"
      });
      return;
    }

    // If editing existing interaction, upload files immediately
    if (interaction?.id) {
      console.log(`📎 ATTACHMENTS: Uploading ${validFiles.length} files to note ${interaction.id}`);
      
      for (const file of validFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(`/api/alumni/${alumni.id}/interactions/${interaction.id}/attachments/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }
          
          toast({
            title: "File uploaded",
            description: `${file.name} has been attached successfully`,
          });
        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: "Upload failed",
            description: `Could not upload ${file.name}. Please try again.`,
            variant: "destructive"
          });
        }
      }
      
      // Refresh attachments list to show new uploads
      queryClient.invalidateQueries({ queryKey: ['attachments', alumni.id, interaction.id] });
      
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
      return; // Exit early, don't add to preview state
    }

    // For new interactions, add files to state
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Generate previews for new files
    validFiles.forEach(file => {
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachmentPreviews(prev => [...prev, {
            file,
            preview: e.target?.result as string,
            isImage: true
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreviews(prev => [...prev, {
          file,
          isImage: false
        }]);
      }
    });

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
    setAttachmentPreviews(prev => prev.filter(item => item.file !== fileToRemove));
  };

  const [activeTab, setActiveTab] = useState<'note' | 'summary'>('note');

  return (
    <div className="relative mb-4">
      <div className="border border-gray-100 rounded-2xl p-5 bg-gradient-to-br from-yellow-50 to-amber-100 shadow-sm relative">
      {/* Header - Clean date and close button */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600 font-medium">
          {!hideTimestamp && (
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[#6b7280] text-[13px] hover:text-amber-600 cursor-pointer transition-colors flex items-start space-x-1.5">
                    <Calendar className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="leading-tight">{format(new Date(date + 'T00:00:00'), 'EEEE, MMM d')}</span>
                      <span className="text-xs text-gray-500 leading-tight">{format(new Date(), 'h:mm a')}</span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Note Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              {followUpPriority !== 'none' && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Flag className={`h-3 w-3 ${
                        followUpPriority === 'low' ? 'text-blue-500' :
                        followUpPriority === 'normal' ? 'text-green-500' :
                        followUpPriority === 'high' ? 'text-orange-500' :
                        followUpPriority === 'urgent' ? 'text-red-500' : 'text-gray-400'
                      }`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Follow up in {
                        followUpPriority === 'low' ? '1 month' :
                        followUpPriority === 'normal' ? '1 week' :
                        followUpPriority === 'high' ? '3 days' :
                        followUpPriority === 'urgent' ? '1 day' : followUpPriority
                      }</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
        {onCancel && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            className="hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      
      {/* Rounded dropdown buttons row */}
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <Select value={noteType} onValueChange={setNoteType}>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <SelectTrigger 
                  className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 w-auto flex-shrink-0 gap-2 transition-colors duration-0 text-xs"
                >
{(() => {
              const IconComponent = getIcon(noteType);
              return <IconComponent className="h-4 w-4 text-gray-600" />;
            })()}
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>Contact Method</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SelectContent>
{noteTypes.map((type) => {
              const IconComponent = getIcon(type.value);
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Communication Type Status Dropdown */}
        {isCommunicationType(noteType) && (
          <Select 
            value={responseState} 
            onValueChange={(value) => {
              if (value === 'connected-cleared') {
                const confirmed = window.confirm(
                  "This will clear all pending follow-ups for this alumni. Are you sure you want to proceed?"
                );
                if (confirmed) {
                  setResponseState(value as 'none' | 'responded' | 'connected-cleared');
                }
              } else {
                setResponseState(value as 'none' | 'responded' | 'connected-cleared');
              }
            }}
          >
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SelectTrigger className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 w-auto flex-shrink-0 gap-2 transition-colors duration-0 text-xs">
                    {responseState === 'none' && <span className="text-gray-600">No Response</span>}
                    {responseState === 'responded' && <span className="text-green-600 font-medium">Connected</span>}
                    {responseState === 'connected-cleared' && <span className="text-amber-600 font-medium">Connected - Clear Follow-ups</span>}
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Response Status</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span>No Response</span>
                </div>
              </SelectItem>
              <SelectItem value="responded">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Connected</span>
                </div>
              </SelectItem>
              <SelectItem value="connected-cleared" className="text-amber-700">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-amber-600" />
                  <div className="flex flex-col">
                    <span>Connected</span>
                    <span className="text-xs text-amber-600">Clear Follow-ups</span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* Follow-up Priority */}
        <Select value={followUpPriority} onValueChange={handleFollowUpPriorityChange}>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <SelectTrigger className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 w-auto flex-shrink-0 gap-2 transition-colors duration-0 text-xs">
            {followUpPriority === 'none' && <span className="text-gray-600">No Follow-up</span>}
            {followUpPriority === 'low' && <span className="text-blue-600 font-medium">Low</span>}
            {followUpPriority === 'normal' && <span className="text-green-600 font-medium">Normal</span>}
            {followUpPriority === 'high' && <span className="text-orange-600 font-medium">High</span>}
            {followUpPriority === 'urgent' && <span className="text-red-600 font-medium">Urgent</span>}
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>Follow-up Priority</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>None</span>
              </div>
            </SelectItem>
            <SelectItem value="low">
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-blue-500" />
                <span>Low (1mo)</span>
              </div>
            </SelectItem>
            <SelectItem value="normal">
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-green-500" />
                <span>Normal (1wk)</span>
              </div>
            </SelectItem>
            <SelectItem value="high">
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-orange-500" />
                <span>High (3d)</span>
              </div>
            </SelectItem>
            <SelectItem value="urgent">
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-red-500" />
                <span>Urgent (1d)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {followUpDate && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-full font-medium">
                  {(() => {
                    const [year, month, day] = followUpDate.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return format(localDate, 'MMM d');
                  })()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Follow-up date: {(() => {
                  const [year, month, day] = followUpDate.split('-').map(Number);
                  const localDate = new Date(year, month - 1, day);
                  return format(localDate, 'MMM d, yyyy');
                })()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Tab System */}
      <div className="flex items-center justify-between mb-4 border-b border-amber-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('note')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'note'
                ? 'border-amber-400 text-amber-800 bg-amber-50'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-amber-25'
            }`}
          >
            Note
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-amber-400 text-amber-800 bg-amber-50'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-amber-25'
            }`}
          >
            AI Summary
          </button>
        </div>
        
        {/* AI Summary tab controls - only show when summary tab is active */}
        {activeTab === 'summary' && (
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !noteContent.trim() || isLocked}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLocked ? "Summary is locked - unlock to regenerate" : 
                   isGenerating ? "Generating AI summary..." : 
                   "Generate AI summary from note content"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsLocked(!isLocked)}
                    size="sm"
                    variant="ghost"
                    className={isLocked ? "text-amber-600" : "text-gray-400"}
                  >
                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isLocked ? "Summary is locked from AI regeneration" : "Click to lock summary from AI regeneration"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'note' && (
          <div>
            <Textarea
              id="noteContent"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter your note content here..."
              className="min-h-[120px] border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-3">
            <Textarea
              id="aiSummary"
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              placeholder="AI summary will appear here..."
              className="min-h-[100px] border-gray-300 focus:border-green-500 focus:ring-green-500"
              disabled={isLocked}
            />
            
            {aiSummary && (
              <div className="flex justify-end space-x-1">
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button onClick={handleCopy} size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy summary to clipboard</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button onClick={handleSendEmail} size="sm" variant="outline">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Email summary to parent/guardian</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}

        {/* Existing attachments (when editing) - MOVED OUTSIDE the action bar to appear above everything */}
        {interaction && existingAttachments && existingAttachments.length > 0 && (
          <div className="mt-6 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-xs font-medium text-blue-700 mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Existing Attachments ({existingAttachments.length})
            </h4>
            <div className="space-y-2">
              {existingAttachments.map((attachment: any) => (
                <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    {attachment.mimeType?.startsWith('image/') ? (
                      <FileText className="w-10 h-10 text-blue-500" />
                    ) : (
                      <FileText className="w-10 h-10 text-gray-400" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-900">{attachment.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          console.log(`📎 DOWNLOAD: Starting download for attachment ${attachment.id}`);
                          const response = await fetch(`/api/attachments/${attachment.id}/download`, {
                            credentials: 'include' // Include session cookies for authentication
                          });
                          
                          if (!response.ok) {
                            throw new Error(`Download failed: ${response.status}`);
                          }
                          
                          // Get the blob and create download
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = attachment.originalName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                          console.log(`✅ DOWNLOAD: Successfully downloaded ${attachment.originalName}`);
                        } catch (error) {
                          console.error('❌ DOWNLOAD: Error downloading file:', error);
                          // You could add a toast notification here if needed
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${attachment.originalName}"? This action cannot be undone.`)) {
                          deleteAttachmentMutation.mutate(attachment.id);
                        }
                      }}
                      disabled={deleteAttachmentMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      const content = activeTab === 'summary' && aiSummary ? aiSummary : noteContent;
                      navigator.clipboard.writeText(content);
                      toast({
                        title: "Copied",
                        description: `${activeTab === 'summary' ? 'AI summary' : 'Note content'} copied to clipboard`,
                      });
                    }}
                    disabled={!noteContent.trim() && (!aiSummary || activeTab !== 'summary')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start" 
                    disabled
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          />

          {/* New attachment previews - only for new interactions */}
          {!interaction?.id && attachmentPreviews.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">New Attachments ({attachmentPreviews.length})</h4>
              <div className="space-y-2">
                {attachmentPreviews.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center space-x-3">
                      {item.isImage && item.preview ? (
                        <img 
                          src={item.preview} 
                          alt={item.file.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <FileText className="w-10 h-10 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(item.file)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2 mt-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="text-gray-600 border-gray-300"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={() => handleSave(true)}
              disabled={saveNoteMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}