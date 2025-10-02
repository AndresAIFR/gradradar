import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Save, X, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const generalNoteFormSchema = z.object({
  studentId: z.number(),
  type: z.literal("general"),
  date: z.string(),
  durationMin: z.number().default(0), // Not applicable for general notes
  overview: z.string(), // We'll use this field for the general note content
});

type GeneralNoteFormData = z.infer<typeof generalNoteFormSchema>;

interface GeneralNoteCardProps {
  studentId: number;
  studentName: string;
  onClose: () => void;
  onSave: (data: GeneralNoteFormData) => Promise<void>;
}

export function GeneralNoteCard({ studentId, studentName, onClose, onSave }: GeneralNoteCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<GeneralNoteFormData>({
    resolver: zodResolver(generalNoteFormSchema),
    defaultValues: {
      studentId,
      type: "general",
      date: format(new Date(), "yyyy-MM-dd"),
      durationMin: 0,
      overview: "",
    },
  });

  const handleSave = async (data: GeneralNoteFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {

    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">{studentName}</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(), "MMMM d, yyyy")}</span>
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* General Note Card */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-gray-900">General Note</h4>
                </div>
                
                <FormField
                  control={form.control}
                  name="overview"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Parent communication, observations, reminders, or any other notes..."
                          className="min-h-[200px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Note"}</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}