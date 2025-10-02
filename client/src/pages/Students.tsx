import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Edit2, Star } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { Student } from "@shared/schema";
import EditStudentModalEnhanced from "@/components/EditStudentModalEnhanced";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StudentListCard } from "@/components/StudentListCard";

export default function Students() {
  const [, navigate] = useLocation();
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsEditStudentModalOpen(true);
  };

  const getExamTypeColor = (examType: string | null) => {
    switch (examType?.toLowerCase()) {
      case 'sat': return 'bg-blue-100 text-blue-800';
      case 'act': return 'bg-purple-100 text-purple-800';
      case 'gre': return 'bg-green-100 text-green-800';
      case 'gmat': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStudentSubjects = (student: Student) => {
    if (student.tutoringType && Array.isArray(student.tutoringType) && student.tutoringType.length > 0) {
      return student.tutoringType;
    }
    return [];
  };

  const getClosestSubject = (student: Student) => {
    const subjects = getStudentSubjects(student);
    if (subjects.length === 0) return null;
    return subjects[0]; // Simplified for now
  };

  const getDaysTillTest = (student: Student, subject: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check custom test dates first
    if (student.customTestDates && typeof student.customTestDates === 'object') {
      const customDate = (student.customTestDates as Record<string, string>)[subject];
      if (customDate) {
        const testDate = new Date(customDate + 'T00:00:00');
        testDate.setHours(0, 0, 0, 0);
        return Math.ceil((testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    
    return null;
  };

  const getProgressColor = (student: Student, subject: string) => {
    // Simplified progress logic
    return "text-green-600";
  };

  if (isLoadingStudents) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 pt-12 pb-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 pt-12 pb-6">
        <StudentListCard variant="students" />
      </div>

      <EditStudentModalEnhanced
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        mode="add"
      />

      <EditStudentModalEnhanced
        isOpen={isEditStudentModalOpen}
        onClose={() => setIsEditStudentModalOpen(false)}
        mode="edit"
        student={editingStudent}
      />
    </div>
  );
}