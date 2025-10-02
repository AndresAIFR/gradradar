import React from 'react';
import type { ExamScore } from '@shared/schema';
import { SingleSubjectChart } from './SingleSubjectChart';
import { ProgressCircle } from './ProgressCircle';
import { SubjectPills } from './SubjectPills';

interface ChartProgressSplitProps {
  activeSubject: string;
  examScores: ExamScore[];
  student: any;
  onAddScore: () => void;
  onEditScore: (score: ExamScore) => void;
  onSubjectChange: (subject: string) => void;
}

export function ChartProgressSplit({ 
  activeSubject, 
  examScores, 
  student, 
  onAddScore, 
  onEditScore,
  onSubjectChange 
}: ChartProgressSplitProps) {
  // Extract available subjects from student data - only show subjects from tutoringType
  const getAvailableSubjects = (): string[] => {
    // Use tutoringType as the authoritative source for which subjects student is taking
    const tutoringTypes = Array.isArray(student.tutoringType) 
      ? student.tutoringType 
      : (typeof student.tutoringType === 'string' 
          ? JSON.parse(student.tutoringType || '[]') 
          : []);
    
    return tutoringTypes.length > 0 ? tutoringTypes : ['SAT']; // Default to SAT if none found
  };
  
  const availableSubjects = getAvailableSubjects();
  // Filter scores for active subject
  const activeSubjectScores = examScores.filter(score => score.examType === activeSubject);
  
  // Get target score for active subject
  const customTarget = student.customTargets?.[activeSubject];
  const fallbackTarget = student[`${activeSubject.toLowerCase()}TargetScore`];
  const targetScore = customTarget ?? fallbackTarget ?? 100;
  
  // Get test date for active subject
  const customTestDate = student.customTestDates?.[activeSubject];
  const fallbackTestDate = student[`${activeSubject.toLowerCase()}TestDate`];
  const testDate = customTestDate ?? fallbackTestDate;
  
  // Calculate progress circle data
  const sortedScores = [...activeSubjectScores].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const currentScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1].score : 0;
  const firstScore = sortedScores.length > 0 ? sortedScores[0].score : 0;
  const isTestOver = testDate ? new Date(testDate) < new Date() : false;

  return (
    <div className="bg-white rounded-lg border">      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 p-6">
        {/* Chart Section - 70% width (7 columns) */}
        <div className="lg:col-span-7">
          {/* Chart Title */}
          <div className="mb-4" style={{ paddingLeft: '50px' }}>
            <h3 className="text-lg font-semibold text-gray-900">{activeSubject} Progress</h3>
          </div>
          <SingleSubjectChart
            scores={activeSubjectScores}
            examType={activeSubject}
            targetScore={targetScore}
            testDate={testDate}
            onEditScore={onEditScore}
            onAddScore={onAddScore}
          />
        </div>
        
        {/* Progress Circle Section - 30% width (3 columns) */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center border-2 border-slate-200 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-white shadow-sm">
          {/* Subject Pills positioned over progress circle */}
          <div className="mb-4">
            <SubjectPills 
              subjects={availableSubjects}
              activeSubject={activeSubject}
              onSubjectChange={onSubjectChange}
            />
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <ProgressCircle
                current={currentScore}
                target={targetScore}
                firstScore={firstScore}
                size="large"
                isTestOver={false}
              />
            </div>
            {/* Calendar Countdown */}
            {testDate ? (() => {
              const today = new Date();
              const examDate = new Date(testDate + 'T00:00:00.000Z');
              const diffTime = examDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // Handle past test dates
              if (diffDays < 0) {
                return (
                  <div className="text-center">
                    <div className="calendar-style bg-white rounded-md shadow-md overflow-hidden w-16 h-16 mx-auto">
                      <div className="bg-gray-400 h-4"></div>
                      <div className="px-1 py-3 text-center h-12 flex items-center justify-center">
                        <div className="text-xs font-medium text-gray-600 leading-tight">
                          Test Passed
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Determine color classes based on days remaining for future tests
              let headerColor = 'bg-green-500'; // Default: 15+ days
              let numberColor = 'text-gray-800';
              
              if (diffDays <= 7) {
                headerColor = 'bg-red-500'; // Urgent: 7 days or less
                numberColor = 'text-red-500';
              } else if (diffDays <= 14) {
                headerColor = 'bg-orange-500'; // Warning: 8-14 days
                numberColor = 'text-orange-500';
              }
              
              return (
                <div className="text-center">
                  <div className="calendar-style bg-white rounded-md shadow-md overflow-hidden w-16 h-16 mx-auto">
                    <div className={`${headerColor} h-4`}></div>
                    <div className="px-1 py-3 text-center h-12 flex flex-col items-center justify-center">
                      <div className={`text-xl font-bold leading-none ${numberColor}`}>
                        {diffDays === 0 ? '0' : diffDays}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {diffDays === 0 ? 'today' : 'days'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="text-center">
                <span className="text-sm text-gray-500">Not scheduled</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}