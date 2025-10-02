import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, MessageSquare, X } from "lucide-react";
import { SessionLogCard } from "./SessionLogCard";
import { GeneralNoteCard } from "./GeneralNoteCard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddNoteSelectorProps {
  studentId: number;
  studentName: string;
  onClose: () => void;
}

type NoteType = "session" | "general" | null;

export default function AddNoteSelector({ studentId, studentName, onClose }: AddNoteSelectorProps) {
  const [selectedType, setSelectedType] = useState<NoteType>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      return apiRequest("POST", `/api/students/${studentId}/session-notes`, noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/session-notes`] });
      toast({
        title: "Success",
        description: selectedType === "session" ? "Session log saved successfully" : "General note saved successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveNote = async (noteData: any) => {
    await createNoteMutation.mutateAsync(noteData);
  };

  if (selectedType === "session") {
    return (
      <SessionLogCard
        studentId={studentId}
        studentName={studentName}
        onClose={onClose}
        onSave={handleSaveNote}
      />
    );
  }

  if (selectedType === "general") {
    return (
      <GeneralNoteCard
        studentId={studentId}
        studentName={studentName}
        onClose={onClose}
        onSave={handleSaveNote}
      />
    );
  }

  // Selection screen
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium">Add Note for {studentName}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Note Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedType("session")}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Session Log</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Structured session notes with AI-generated parent summaries
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedType("general")}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">General Note</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Quick notes for parent communication, observations, or reminders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}