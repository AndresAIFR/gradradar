import type { ExamScore } from '@shared/schema';
import { ScoreProgressCard } from '@/components/ScoreProgressCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ScoreProgressTabsProps {
  profileExamTypes: string[];
  examScores: ExamScore[];
  student: any;
  onAddScore: () => void;
  onEditScore?: (score: ExamScore) => void;
}

export function ScoreProgressTabs({ 
  profileExamTypes, 
  examScores, 
  student, 
  onAddScore,
  onEditScore 
}: ScoreProgressTabsProps) {

  
  // If no exam types, show fallback
  if (profileExamTypes.length === 0) {

    return (
      <div className="bg-white rounded-lg border p-8">
        <p className="text-center text-gray-500">No exam types configured</p>
      </div>
    );
  }

  // Default to first exam type
  const defaultTab = profileExamTypes[0];
  return (
    <div className="bg-white rounded-lg border !min-h-0 !h-fit !max-h-none">
      <Tabs defaultValue={defaultTab} className="w-full !min-h-0 !h-fit !max-h-none">
        {/* Header bar matching Active Students styling */}
        <div className="bg-slate-100 rounded-t-lg px-4 py-3 flex items-center justify-between">
          <TabsList className="bg-transparent p-0 h-auto space-x-1">
            {profileExamTypes.map((examType) => (
              <TabsTrigger 
                key={examType} 
                value={examType} 
                className="bg-transparent text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-6 py-3 rounded-md text-sm font-medium"
              >
                {examType}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            onClick={onAddScore}
            className="inline-flex items-center px-6 py-2 bg-slate-600 text-white text-sm font-medium rounded-md hover:bg-slate-700"
          >
            <span className="text-lg mr-2">+</span>
            Add Score
          </button>
        </div>
        
        {profileExamTypes.map((examType) => {
          const examScoresForType = examScores.filter(score => score.examType === examType);
          const customTarget = student.customTargets?.[examType];
          const fallbackTarget = student[`${examType.toLowerCase()}TargetScore`];
          const targetScore = customTarget ?? fallbackTarget;
          const customTestDate = student.customTestDates?.[examType];
          const fallbackTestDate = student[`${examType.toLowerCase()}TestDate`];
          const testDate = customTestDate ?? fallbackTestDate;
          

          
          return (
            <TabsContent key={examType} value={examType} className="mt-0 p-4 !min-h-0 !h-fit !max-h-none">
              <ScoreProgressCard
                scores={examScoresForType}
                examType={examType}
                targetScore={targetScore}
                testDate={testDate}
                onAddScore={onAddScore}
                onEditScore={onEditScore}
                hideHeader={true}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}