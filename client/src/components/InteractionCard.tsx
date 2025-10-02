import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Phone, Mail, FileText, MessageSquare, Building2, User, Calendar, Users, StickyNote, Check, Flag, Edit, X, Paperclip, Download, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAttachments } from "@/hooks/useAttachments";

interface InteractionCardProps {
  interaction: {
    id: number;
    date: string;
    type: string;
    overview?: string;
    internalSummary?: string;
    createdAt?: string;
    studentResponded?: boolean;
    needsFollowUp?: boolean;
    followUpPriority?: string;
    followUpDate?: string;
  };
  alumniId: number;
  onEdit: () => void;
  onDelete: (id: number) => void;
  readOnly?: boolean;
  hideTimeline?: boolean;
}

export function InteractionCard({ interaction, alumniId, onEdit, onDelete, readOnly = false, hideTimeline = false }: InteractionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch attachments for this interaction using shared hook
  const { data: attachments = [], isLoading, error } = useAttachments(alumniId, interaction.id);

  // Calculate if attachments should be shown
  const shouldShowAttachments = attachments && attachments.length > 0;

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/alumni/${alumniId}/interactions/${interaction.id}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete attachment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attachment deleted",
        description: "Attachment has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['attachments', alumniId, interaction.id] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: "Could not delete attachment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    // Fix timezone issue for YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // For other formats, use original parsing
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFullNote = () => {
    // If there's an AI summary, show that
    if (interaction.internalSummary) {
      return interaction.internalSummary;
    }
    
    // Otherwise, show the full note
    if (interaction.overview) {
      return interaction.overview;
    }
    
    return "No content available";
  };

  const getFollowUpColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-500';
      case 'normal':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getFollowUpLabel = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'Urgent Follow-up';
      case 'high':
        return 'High Priority Follow-up';
      case 'normal':
        return 'Normal Follow-up';
      case 'low':
        return 'Low Priority Follow-up';
      default:
        return 'Needs Follow-up';
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phone':
      case 'call':
        return <Phone className="h-3 w-3 text-white" />;
      case 'email':
        return <Mail className="h-3 w-3 text-white" />;
      case 'text':
        return <MessageSquare className="h-3 w-3 text-white" />;
      case 'in-person':
        return <Users className="h-3 w-3 text-white" />;
      case 'meeting':
        return <Calendar className="h-3 w-3 text-white" />;
      case 'company':
      case 'company note':
        return <Building2 className="h-3 w-3 text-white" />;
      case 'progress':
      case 'progress note':
        return <FileText className="h-3 w-3 text-white" />;
      case 'parent log':
        return <User className="h-3 w-3 text-white" />;
      case 'general':
      case 'general note':
      default:
        return <StickyNote className="h-3 w-3 text-white" />;
    }
  };

  const getDotColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phone':
      case 'call':
        return 'bg-green-500';
      case 'email':
        return 'bg-blue-500';
      case 'text':
        return 'bg-indigo-500';
      case 'in-person':
        return 'bg-purple-500';
      case 'meeting':
        return 'bg-purple-500';
      case 'company':
      case 'company note':
        return 'bg-blue-600';
      case 'progress':
      case 'progress note':
        return 'bg-orange-500';
      case 'parent log':
        return 'bg-pink-500';
      case 'general':
      case 'general note':
      default:
        return 'bg-slate-500';
    }
  };



  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phone':
      case 'call':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'email':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'text':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'in-person':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'meeting':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'company':
      case 'company note':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'progress':
      case 'progress note':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'parent log':
        return 'text-pink-700 bg-pink-50 border-pink-200';
      case 'general':
      case 'general note':
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="relative">
      {/* Timeline dot with icon and response indicator */}
      {!hideTimeline && (
      <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 z-10">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className={`w-6 h-6 rounded-full ${getDotColor(interaction.type)} flex items-center justify-center relative z-10`}>
                {getInteractionIcon(interaction.type)}
                {/* White checkmark with green background for successful connections */}
                {interaction.studentResponded && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-green-600 font-bold" />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={10}>
              <div className="text-center">
                <p className="font-medium">{interaction.type === 'general note' ? 'General' : 
                     interaction.type === 'company note' ? 'Company' :
                     interaction.type === 'progress note' ? 'Progress' :
                     interaction.type === 'parent log' ? 'Parent' :
                     interaction.type === 'in-person' ? 'In-Person' :
                     interaction.type === 'text' ? 'Text' :
                     interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1)}</p>
                {interaction.type !== 'general note' && interaction.type !== 'general' && interaction.type !== 'company note' && interaction.type !== 'progress note' && interaction.type !== 'parent log' && (
                  <p className="text-sm text-gray-600 mt-1">
                    {interaction.studentResponded ? 'Connected with alumnus' : 'Did not connect with alumnus'}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      )}
      
      {/* Interaction content */}
      <div 
        className={`group/card relative rounded-lg p-3 ${hideTimeline ? '' : 'ml-4'} border border-gray-100 shadow-sm transition-colors bg-yellow-50 hover:bg-yellow-100`}
      >
        {/* Action buttons - top right - hidden in readOnly mode */}
        {!readOnly && (
        <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md p-1 shadow-sm">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Edit note</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <p>Delete note</p>
            </TooltipContent>
          </Tooltip>
        </div>
        )}

        {/* Content - clickable area */}
        <div 
          className={`${readOnly ? '' : 'cursor-pointer'}`}
          onClick={readOnly ? undefined : onEdit}
        >
          <div className="flex items-center mb-2 gap-2">
            {/* Inline icon badge when timeline is hidden */}
            {hideTimeline && (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className={`w-5 h-5 rounded-full ${getDotColor(interaction.type)} flex items-center justify-center relative flex-shrink-0`}>
                      {getInteractionIcon(interaction.type)}
                      {/* White checkmark with green background for successful connections */}
                      {interaction.studentResponded && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white border-2 border-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-1.5 h-1.5 text-green-600 font-bold" />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{interaction.type === 'general note' ? 'General' : 
                           interaction.type === 'company note' ? 'Company' :
                           interaction.type === 'progress note' ? 'Progress' :
                           interaction.type === 'parent log' ? 'Parent' :
                           interaction.type === 'in-person' ? 'In-Person' :
                           interaction.type === 'text' ? 'Text' :
                           interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1)}</p>
                      {interaction.type !== 'general note' && interaction.type !== 'general' && interaction.type !== 'company note' && interaction.type !== 'progress note' && interaction.type !== 'parent log' && (
                        <p className="text-sm text-gray-600 mt-1">
                          {interaction.studentResponded ? 'Connected with alumnus' : 'Did not connect with alumnus'}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-sm font-medium text-gray-900">
              {interaction.date ? formatDate(interaction.date) : formatDate(interaction.createdAt)}
            </span>
            <span className="text-xs text-gray-500">
              {interaction.createdAt ? formatTime(interaction.createdAt) : formatTime(interaction.date)}
            </span>
            {/* Attachment indicator */}
            {shouldShowAttachments && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded text-xs text-blue-700 cursor-help">
                    <Paperclip className="h-2.5 w-2.5" />
                    <span>{attachments.length}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{attachments.length} attachment{attachments.length !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {interaction.needsFollowUp && interaction.followUpPriority && (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Flag className={`w-3 h-3 ml-2 cursor-help ${getFollowUpColor(interaction.followUpPriority)}`} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{getFollowUpLabel(interaction.followUpPriority)}</p>
                      {interaction.followUpDate && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {formatDate(interaction.followUpDate)}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* Preview */}
          <div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{getFullNote()}</p>
          </div>

          {/* Attachments */}
          {shouldShowAttachments && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="space-y-1">
                {attachments.map((attachment: any) => (
                  <div key={attachment.id} className="flex items-center justify-between bg-gray-50 rounded p-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {attachment.mimeType?.startsWith('image/') ? (
                        <FileText className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-gray-700 truncate" title={attachment.originalName}>
                        {attachment.originalName}
                      </span>
                      <span className="text-gray-400 text-xs">
                        ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-blue-100 hover:text-blue-600"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                console.log(`📎 TIMELINE DOWNLOAD: Starting download for attachment ${attachment.id}`);
                                const response = await fetch(`/api/attachments/${attachment.id}/download`, {
                                  credentials: 'include'
                                });
                                
                                if (!response.ok) {
                                  throw new Error(`Download failed: ${response.status}`);
                                }
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = attachment.originalName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                                console.log(`✅ TIMELINE DOWNLOAD: Successfully downloaded ${attachment.originalName}`);
                              } catch (error) {
                                console.error('❌ TIMELINE DOWNLOAD: Error downloading file:', error);
                              }
                            }}
                          >
                            <Download className="h-2.5 w-2.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete "${attachment.originalName}"? This action cannot be undone.`)) {
                                deleteAttachmentMutation.mutate(attachment.id);
                              }
                            }}
                            disabled={deleteAttachmentMutation.isPending}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(interaction.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}