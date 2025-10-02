import { useState } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { User, Building2, MessageSquare, Sparkles, Copy, Mail, Check, Lock, Unlock } from "lucide-react";

interface SessionSummaryTabsProps {
  form: any;
  studentId: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  sentNotifications: Array<{type: 'email' | 'text' | 'company', timestamp: Date}>;
  onSendEmail: () => void;
  onSendText: () => void;
  onSendCompany: () => void;
}

export function SessionSummaryTabs({
  form,
  studentId,
  activeTab,
  setActiveTab,
  isGenerating,
  setIsGenerating,
  sentNotifications,
  onSendEmail,
  onSendText,
  onSendCompany
}: SessionSummaryTabsProps) {
  const { toast } = useToast();

  const { data: student } = useQuery({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
  });

  const generateAISummary = async () => {
    try {
      setIsGenerating(true);
      const sessionData = form.getValues();
      
      // Check lock states to determine what to generate
      const parentEmailLocked = form.getValues("parentMdLocked");
      const parentSmsLocked = form.getValues("parentSmsLocked");
      const companyLocked = form.getValues("companyMdLocked");
      
      // Generate parent email and SMS summaries
      if (!parentEmailLocked || !parentSmsLocked) {
        // Format homework assignments for AI
        const homeworkList = sessionData.homeworkAssignments && sessionData.homeworkAssignments.length > 0
          ? sessionData.homeworkAssignments
              .filter((hw: any) => {
                // Include homework if it has any content
                return hw.resource || hw.chapterPage || hw.notes;
              })
              .map((hw: any) => {
                // Build homework string from available fields
                const parts = [];
                if (hw.resource) parts.push(hw.resource);
                if (hw.chapterPage) parts.push(hw.chapterPage);
                if (hw.notes) parts.push(hw.notes);
                
                const homeworkText = parts.length > 0 ? parts.join(' - ') : 'Practice assignment';
                const dueText = hw.dueDate ? ` (due ${hw.dueDate})` : '';
                return `${homeworkText}${dueText}`;
              })
              .join('\n- ')
          : '';

        const requestData = {
          // New field structure
          sinceLastSession: sessionData.sinceLastSession || 'General work',
          overview: sessionData.overview || 'General review session',
          strengthsWeaknesses: sessionData.strengthsWeaknesses || 'Good engagement and participation',
          // Legacy support (remove once fully migrated)
          topicsCovered: sessionData.overview || sessionData.topicsCovered || 'General review session',
          strengths: sessionData.strengthsWeaknesses || 'Good engagement and participation',
          weaknesses: null, // We use a single combined field now
          homeworkAssigned: homeworkList,
          nextSteps: sessionData.nextSteps || 'Continue practicing concepts covered',
          studentName: (student as any)?.name || 'the student',
          parentName: (student as any)?.parentName || (student as any)?.parentFirstName || 'there',
          companyNotes: sessionData.companyMd || sessionData.companySummaryMd || '',
        };
        
        const response = await apiRequest("POST", "/api/ai/generate-summary", requestData);
        
        // Try to parse as JSON if it's a Response object
        let responseData = response;
        if (response instanceof Response) {
          responseData = await response.json();
        }

        if ((responseData as any).emailSummary && !parentEmailLocked) {
          form.setValue("parentMd", (responseData as any).emailSummary);
        }
        if ((responseData as any).smsSummary && !parentSmsLocked) {
          form.setValue("parentSms", (responseData as any).smsSummary);
        }
        if ((responseData as any).companySummary && !companyLocked) {
          form.setValue("companySummaryMd", (responseData as any).companySummary);
        }
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

  const copyToClipboard = async () => {
    try {
      const activeContent = form.getValues(
        activeTab === "email" ? "parentMd" : 
        activeTab === "text" ? "parentSms" : 
        "companySummaryMd"
      );
      
      // Convert HTML to plain text
      const htmlToText = (html: string) => {
        // Create a temporary div element to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Replace common HTML elements with appropriate text formatting
        temp.querySelectorAll('p').forEach(p => {
          p.innerHTML = p.innerHTML + '\n\n';
        });
        temp.querySelectorAll('strong').forEach(strong => {
          strong.innerHTML = strong.innerHTML;
        });
        temp.querySelectorAll('ul').forEach(ul => {
          ul.innerHTML = '\n' + ul.innerHTML;
        });
        temp.querySelectorAll('li').forEach(li => {
          li.innerHTML = '• ' + li.innerHTML + '\n';
        });
        
        // Get plain text and clean up extra whitespace
        return temp.textContent || temp.innerText || '';
      };
      
      const plainText = activeContent ? htmlToText(activeContent) : "";
      await navigator.clipboard.writeText(plainText);
      toast({
        title: "Copied to clipboard",
        description: "Content copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Session Summaries</h3>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger 
          value="email" 
          className={`flex items-center gap-2 ${
            student?.parentPreferredCommunication === 'email' 
              ? 'ring-2 ring-blue-400 ring-offset-1' 
              : ''
          }`}
        >
          <User className="h-4 w-4" />
          Parent
          {student?.parentPreferredCommunication === 'email' && <span className="text-xs">(Preferred)</span>}
        </TabsTrigger>
        <TabsTrigger 
          value="text" 
          className={`flex items-center gap-2 ${
            student?.parentPreferredCommunication === 'text' 
              ? 'ring-2 ring-green-400 ring-offset-1' 
              : ''
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Parent Text
          {student?.parentPreferredCommunication === 'text' && <span className="text-xs">(Preferred)</span>}
        </TabsTrigger>
        <TabsTrigger value="company" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Company Summary
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="email" className="space-y-2 relative">
        <FormField
          control={form.control}
          name="parentMd"
          render={({ field }) => {

            
            return (
              <FormItem>
                <FormControl>
                  <RichTextEditor
                    content={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Email summary will appear here - you can edit it before saving..."
                    className="h-[240px] overflow-y-auto"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
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
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendEmail}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
          </div>
          
          <FormField
            control={form.control}
            name="parentMdLocked"
            render={({ field }) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => field.onChange(!field.value)}
                className={`p-2 ${field.value ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                title={field.value ? "Locked - click to unlock" : "Unlocked - click to lock"}
              >
                {field.value ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            )}
          />
        </div>
        
        {sentNotifications.filter(n => n.type === 'email').length > 0 && (
          <div className="mt-2 space-y-1">
            {sentNotifications.filter(n => n.type === 'email').map((notification, index) => (
              <div key={index} className="text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>
                  Summary emailed on {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="text" className="space-y-2 relative">
        <FormField
          control={form.control}
          name="parentSms"
          render={({ field }) => {

            
            return (
              <FormItem>
                <FormControl>
                  <div className="border rounded-md bg-white">
                    <textarea
                      {...field}
                      placeholder="Text summary will appear here - you can edit it before saving..."
                      className="w-full h-[240px] resize-none bg-white border-0 rounded-md px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
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
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendText}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Send Text
            </Button>
          </div>
          
          <FormField
            control={form.control}
            name="parentSmsLocked"
            render={({ field }) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => field.onChange(!field.value)}
                className={`p-2 ${field.value ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                title={field.value ? "Locked - click to unlock" : "Unlocked - click to lock"}
              >
                {field.value ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            )}
          />
        </div>
        
        {sentNotifications.filter(n => n.type === 'text').length > 0 && (
          <div className="mt-2 space-y-1">
            {sentNotifications.filter(n => n.type === 'text').map((notification, index) => (
              <div key={index} className="text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>
                  Summary texted on {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="company" className="space-y-2 relative">
        <FormField
          control={form.control}
          name="companySummaryMd"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RichTextEditor
                  content={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Company summary will appear here - you can edit it before saving..."
                  className="h-[240px] overflow-y-auto"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
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
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendCompany}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Send Summary
            </Button>
          </div>
          
          <FormField
            control={form.control}
            name="companyMdLocked"
            render={({ field }) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => field.onChange(!field.value)}
                className={`p-2 ${field.value ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                title={field.value ? "Locked - click to unlock" : "Unlocked - click to lock"}
              >
                {field.value ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            )}
          />
        </div>
        
        {sentNotifications.filter(n => n.type === 'company').length > 0 && (
          <div className="mt-2 space-y-1">
            {sentNotifications.filter(n => n.type === 'company').map((notification, index) => (
              <div key={index} className="text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>
                  Summary sent on {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
    </div>
  );
}