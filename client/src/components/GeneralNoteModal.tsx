import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { X, Calendar, Clock, FileText, Sparkles, Copy, Mail, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import type { Alumni } from "@shared/schema";

interface GeneralNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alumni: Alumni;
  noteId?: number; // For editing existing notes
}

export default function GeneralNoteModal({ open, onOpenChange, alumni, noteId }: GeneralNoteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [noteType, setNoteType] = useState<string>('general');
  const [noteContent, setNoteContent] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const noteTypes = [
    { value: 'general', label: 'General Note' },
    { value: 'company', label: 'Company Note' },
    { value: 'parent', label: 'Parent Log' },
    { value: 'progress', label: 'Progress Note' },
  ];

  // Create or update note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (data: {
      alumniId: number;
      date: string;
      type: string;
      content: string;
      aiSummary?: string;
      locked?: boolean;
    }) => {
      const endpoint = noteId 
        ? `/api/alumni/${alumni.id}/interactions/${noteId}`
        : `/api/alumni/${alumni.id}/interactions`;
      
      const method = noteId ? 'PATCH' : 'POST';
      
      return apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          date: data.date,
          durationMin: 0, // General notes don't have duration
          type: data.type,
          overview: data.content,
          internalSummary: data.aiSummary,
          summaryLocked: data.locked,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: noteId ? "Note updated successfully" : "Note created successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/alumni/${alumni.id}/interactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/alumni/${alumni.id}`] });
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate AI summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('/api/ai/generate-note-summary', {
        method: 'POST',
        body: JSON.stringify({
          alumniId: alumni.id,
          noteContent: content,
          noteType: noteType,
        }),
      });
    },
    onSuccess: (data) => {
      setAiSummary(data.summary);
      toast({
        title: "Success",
        description: "AI summary generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate AI summary. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNoteType('general');
    setNoteContent('');
    setAiSummary('');
    setIsLocked(false);
  };

  const handleSave = () => {
    if (!noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for the note",
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
    });
  };

  const handleSaveAndClose = () => {
    handleSave();
  };

  const handleGenerateAI = () => {
    if (!noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content before generating AI summary",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateSummaryMutation.mutate(noteContent);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    const textToCopy = aiSummary || noteContent;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const handleSendEmail = () => {
    // TODO: Implement email sending functionality
    toast({
      title: "Coming Soon",
      description: "Email functionality will be implemented soon",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {alumni.firstName} {alumni.lastName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Date and Type Selection */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
          
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select note type" />
            </SelectTrigger>
            <SelectContent>
              {noteTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Note Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {noteTypes.find(t => t.value === noteType)?.label || 'General Note'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Quick observations, reminders, or any other relevant information about the student..."
                className="min-h-[300px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Right Side - AI Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">AI Summary</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !noteContent.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Summary'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLocked(!isLocked)}
                    className="p-2"
                  >
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-red-500" />
                    ) : (
                      <Unlock className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                placeholder="AI-generated summary will appear here..."
                className="min-h-[300px] resize-none"
                disabled={isLocked}
              />
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!aiSummary && !noteContent}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={!aiSummary}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="destructive"
            size="sm"
            onClick={resetForm}
          >
            Clear
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveNoteMutation.isPending}
            >
              Save
            </Button>
            <Button
              onClick={handleSaveAndClose}
              disabled={saveNoteMutation.isPending}
              className="bg-gray-800 hover:bg-gray-900"
            >
              Save & Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}