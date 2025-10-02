import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Archive, Plus, Users, Edit2, Star } from "lucide-react";
import EditStudentModalEnhanced from "./EditStudentModalEnhanced";
import { ProgressCircle } from "./ProgressCircle";
import type { Student } from "@shared/schema";

interface StudentListCardProps {
  variant?: "dashboard" | "students";
}

export function StudentListCard({ variant = "dashboard" }: StudentListCardProps) {
  const [, setLocation] = useLocation();
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  // Fetch exam scores
  const { data: allExamScores = [] } = useQuery<any[]>({
    queryKey: ['/api/exam-scores'],
  });



  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getClosestSubject = (student: Student) => {
    const subjects = getStudentSubjects(student);
    if (subjects.length === 0) return null;
    
    // For now, return the first subject - in a real app, this would check test dates
    return subjects[0];
  };

  const getStudentSubjects = (student: Student): string[] => {
    const subjects: string[] = [];
    
    // Check SAT targets
    if (student.satMathTarget || student.satReadingWritingTarget || student.satTargetScore) {
      subjects.push('SAT');
    }
    
    // Check ACT targets
    if (student.actTargetScore || student.actEnglishTarget || student.actMathTarget || 
        student.actReadingTarget || student.actScienceTarget) {
      subjects.push('ACT');
    }
    
    // Check GRE targets
    if (student.greTargetScore || student.greVerbalReasoningTarget || 
        student.greQuantitativeReasoningTarget || student.greAnalyticalWritingTarget) {
      subjects.push('GRE');
    }
    
    // Check GMAT targets
    if (student.gmatTargetScore || student.gmatDataInsightsTarget || 
        student.gmatVerbalTarget || student.gmatQuantitativeTarget) {
      subjects.push('GMAT');
    }
    
    // Check tutoring type array for additional subjects
    if (student.tutoringType && Array.isArray(student.tutoringType)) {
      student.tutoringType.forEach((subject: string) => {
        if (!subjects.includes(subject)) {
          subjects.push(subject);
        }
      });
    }
    
    return subjects;
  };

  const getAdditionalSubjectsCount = (student: Student) => {
    const subjects = getStudentSubjects(student);
    return Math.max(0, subjects.length - 1);
  };

  const getDaysTillTest = (student: Student, subject: string): number | null => {
    let testDate: string | null = null;
    
    // Get the appropriate test date based on subject
    switch (subject) {
      case 'SAT':
        testDate = student.satTestDate;
        break;
      case 'ACT':
        testDate = student.actTestDate;
        break;
      case 'GRE':
        testDate = student.greTestDate;
        break;
      case 'GMAT':
        testDate = student.gmatTestDate;
        break;
      default:
        // For other subjects, check if there's a general official test date
        testDate = student.officialTestDate;
        break;
    }
    
    if (!testDate) return null;
    
    // Calculate days difference
    const today = new Date();
    const test = new Date(testDate);
    const diffTime = test.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatDays = (days: number | null) => {
    if (days === null) return '--';
    if (days <= 0) return 'Test passed';
    return days.toString();
  };

  const getDaysColor = (days: number | null) => {
    if (days === null) return 'bg-slate-100 text-slate-600';
    if (days <= 0) return 'bg-slate-100 text-slate-600';
    if (days <= 7) return 'bg-red-100 text-red-800';
    if (days <= 14) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getTargetScore = (student: Student, subject: string) => {
    let score = null;
    switch (subject) {
      case 'SAT':
        score = student.satTargetScore || 
               (student.satMathTarget && student.satReadingWritingTarget 
                 ? student.satMathTarget + student.satReadingWritingTarget 
                 : null);
        break;
      case 'ACT':
        score = student.actTargetScore;
        break;
      case 'GRE':
        score = student.greTargetScore;
        break;
      case 'GMAT':
        score = student.gmatTargetScore;
        break;
      default:
        score = null;
    }



    return score;
  };

  const getLatestScore = (student: Student, subject: string) => {
    // Get all scores for this subject for this student
    const subjectScores = allExamScores
      .filter(score => score.studentId === student.id && score.examType === subject)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const latestScore = subjectScores.length > 0 ? subjectScores[subjectScores.length - 1] : null;
    const currentScore = latestScore?.score ?? 0;
    
    return currentScore;
  };

  const getFirstScore = (student: Student, subject: string) => {
    // Get all scores for this subject for this student
    const subjectScores = allExamScores
      .filter(score => score.studentId === student.id && score.examType === subject)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const firstScore = subjectScores.length > 0 ? subjectScores[0] : null;
    const baselineScore = firstScore?.score ?? 0;
    
    return baselineScore;
  };

  const isTestComplete = (student: Student, subject: string) => {
    const days = getDaysTillTest(student, subject);
    const currentScore = getLatestScore(student, subject);
    
    // Test is complete if:
    // 1. Test date has passed (days <= 0), OR
    // 2. Student has a score but no future test date (indicates test already taken)
    const hasPassedTestDate = days !== null && days <= 0;
    const hasScoreNoFutureTest = currentScore > 0 && days === null;
    const complete = hasPassedTestDate || hasScoreNoFutureTest;
    

    
    return complete;
  };

  if (studentsLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading students...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full rounded-none border-b border-slate-200 bg-slate-200 px-6 py-6 flex justify-between items-center min-h-[70px]">
            <div className="flex">
              <TabsTrigger 
                value="active" 
                className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Active Students
              </TabsTrigger>
              <TabsTrigger 
                value="archived" 
                className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archived
              </TabsTrigger>
            </div>
            <div className="px-4">
              <Button 
                onClick={() => setIsAddStudentModalOpen(true)}
                className="bg-slate-600 hover:bg-slate-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>
          </TabsList>
          
          <TabsContent value="active" className="mt-0">
            <div className="overflow-x-auto">
              {students.filter((s: Student) => !s.isArchived).length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No students yet</h3>
                  <p className="text-slate-600 mb-4">Get started by adding your first student.</p>
                  <Button 
                    onClick={() => setIsAddStudentModalOpen(true)}
                    className="bg-slate-600 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {students.filter((s: Student) => !s.isArchived).map((student: Student, studentIndex) => {
                      const closestSubject = getClosestSubject(student);
                      const additionalCount = getAdditionalSubjectsCount(student);
                      const isLastStudent = studentIndex === students.filter((s: Student) => !s.isArchived).length - 1;
                      
                      return (
                        <tr 
                          key={student.id}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${!isLastStudent ? 'border-b border-slate-200' : ''}`}
                          onClick={() => setLocation(`/student/${student.id}`)}
                        >
                          <td className="px-6 py-6">
                            <div className="flex items-center pl-4">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-slate-300 text-slate-700">
                                  {getInitials(student.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-6">
                                <div className="flex items-center space-x-2">
                                  <div className="relative group">
                                    <div className="text-sm font-medium text-slate-900">{student.name}</div>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                                      {getStudentSubjects(student).join(', ')}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {student.studentTestimonial && (
                                      <div className="relative group">
                                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                                          Student testimonial
                                        </div>
                                      </div>
                                    )}
                                    {student.parentTestimonial && (
                                      <div className="relative group">
                                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                                          Parent testimonial
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-6 text-center">
                            <div className="flex justify-center">
                              {closestSubject && getDaysTillTest(student, closestSubject) !== null ? (
                                (() => {
                                  const days = getDaysTillTest(student, closestSubject);
                                  let headerColor = 'bg-green-500'; // Default: 15+ days
                                  let numberColor = 'text-gray-800';
                                  let tooltipText = `${days} days until ${closestSubject} test`;
                                  
                                  if (days !== null) {
                                    if (days <= 7) {
                                      headerColor = 'bg-red-500'; // Urgent: 7 days or less
                                      numberColor = 'text-red-500';
                                    } else if (days <= 14) {
                                      headerColor = 'bg-orange-500'; // Warning: 8-14 days
                                      numberColor = 'text-orange-500';
                                    }
                                  }
                                  
                                  return (
                                    <div className="relative group">
                                      <div className="calendar-style bg-white rounded-md shadow-md overflow-hidden w-12">
                                        <div className={`${headerColor} h-3`}></div>
                                        <div className="px-1 py-2 text-center">
                                          <div className={`${formatDays(days) === 'Test passed' ? 'text-xs' : 'text-sm'} font-bold leading-none ${numberColor}`}>
                                            {formatDays(days)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                                        {tooltipText}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="relative group">
                                  <span className="text-slate-400">--</span>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                                    Test date passed
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="flex justify-center">
                              {closestSubject ? (
                                (() => {
                                  const currentScore = getLatestScore(student, closestSubject);
                                  const firstScore = getFirstScore(student, closestSubject);
                                  const targetScore = getTargetScore(student, closestSubject);
                                  const testComplete = isTestComplete(student, closestSubject);
                                  
                                  return (
                                    <ProgressCircle
                                      current={currentScore}
                                      target={targetScore || 0}
                                      firstScore={firstScore}
                                      size="small"
                                      isTestOver={testComplete}
                                    />
                                  );
                                })()
                              ) : (
                                <span className="text-slate-400">--</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 transition-colors flex items-center gap-1"
                              title="Edit Student"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudent(student);
                                setIsEditStudentModalOpen(true);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="archived" className="mt-0">
            <div className="overflow-x-auto">
              {students.filter((s: Student) => s.isArchived).length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <Archive className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No archived students</h3>
                  <p className="text-slate-600">Archived students will appear here.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Archived Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {students.filter((s: Student) => s.isArchived).map((student: Student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-slate-300 text-slate-700">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900">{student.name}</div>
                              <div className="text-sm text-slate-500">{student.school || 'No school listed'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-500">
                          {student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : '--'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // TODO: Implement unarchive functionality
                            }}
                          >
                            Restore
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <EditStudentModalEnhanced
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        mode="add"
      />

      <EditStudentModalEnhanced
        isOpen={isEditStudentModalOpen}
        onClose={() => {
          setIsEditStudentModalOpen(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
        mode="edit"
      />
    </>
  );
}