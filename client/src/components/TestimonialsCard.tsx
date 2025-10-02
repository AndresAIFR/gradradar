import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Quote } from "lucide-react";
import type { Student } from "@shared/schema";

interface TestimonialsCardProps {
  student: Student;
}

export default function TestimonialsCard({ student }: TestimonialsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [studentTestimonial, setStudentTestimonial] = useState(student.studentTestimonial || "");
  const [parentTestimonial, setParentTestimonial] = useState(student.parentTestimonial || "");

  const updateTestimonialsMutation = useMutation({
    mutationFn: async (data: { studentTestimonial: string; parentTestimonial: string }) => {
      return await apiRequest('PUT', `/api/students/${student.id}/testimonials`, data);
    },
    onSuccess: () => {
      toast({
        title: "Testimonials updated",
        description: "Student testimonials have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${student.id}`] });
      setIsStudentModalOpen(false);
      setIsParentModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update testimonials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveStudent = () => {
    updateTestimonialsMutation.mutate({
      studentTestimonial,
      parentTestimonial: student.parentTestimonial || "",
    });
  };

  const handleSaveParent = () => {
    updateTestimonialsMutation.mutate({
      studentTestimonial: student.studentTestimonial || "",
      parentTestimonial,
    });
  };

  return (
    <Card className="overflow-hidden shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Quote className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Testimonials</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Testimonial */}
          <div className="space-y-3">
            <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
              <DialogTrigger asChild>
                <div 
                  className="cursor-pointer"
                  onClick={() => setStudentTestimonial(student.studentTestimonial || "")}
                >
                  {student.studentTestimonial ? (
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 hover:bg-blue-100 transition-colors">
                      <p className="text-slate-700 italic leading-relaxed">
                        "{student.studentTestimonial}"
                      </p>
                      <p className="text-sm text-slate-500 mt-2">— {student.name}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300 text-center hover:bg-slate-100 transition-colors">
                      <p className="text-slate-500 text-sm">Student Testimonial</p>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {student.studentTestimonial ? 'Edit' : 'Add'} Student Testimonial
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={studentTestimonial}
                    onChange={(e) => setStudentTestimonial(e.target.value)}
                    placeholder="Enter student testimonial..."
                    className="min-h-32"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsStudentModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveStudent}
                      disabled={updateTestimonialsMutation.isPending}
                      className="bg-slate-600 hover:bg-slate-700"
                    >
                      {updateTestimonialsMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Parent Testimonial */}
          <div className="space-y-3">
            <Dialog open={isParentModalOpen} onOpenChange={setIsParentModalOpen}>
              <DialogTrigger asChild>
                <div 
                  className="cursor-pointer"
                  onClick={() => setParentTestimonial(student.parentTestimonial || "")}
                >
                  {student.parentTestimonial ? (
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400 hover:bg-green-100 transition-colors">
                      <p className="text-slate-700 italic leading-relaxed">
                        "{student.parentTestimonial}"
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        — {student.parentName || 'Parent'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300 text-center hover:bg-slate-100 transition-colors">
                      <p className="text-slate-500 text-sm">Parent Testimonial</p>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {student.parentTestimonial ? 'Edit' : 'Add'} Parent Testimonial
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={parentTestimonial}
                    onChange={(e) => setParentTestimonial(e.target.value)}
                    placeholder="Enter parent testimonial..."
                    className="min-h-32"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsParentModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveParent}
                      disabled={updateTestimonialsMutation.isPending}
                      className="bg-slate-600 hover:bg-slate-700"
                    >
                      {updateTestimonialsMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}