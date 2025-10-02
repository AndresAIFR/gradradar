import React from "react";
import { Sparkles, GraduationCap, Wrench, Briefcase } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Alumni } from "@shared/schema";
import { STAGE_OPTIONS, resolveStageAndPath, stagePercent } from "@shared/liberationPath";

interface LiberationPathCardProps {
  alumnus: Alumni;
  onUpdateAlumnus?: (updates: Partial<Alumni>) => void;
  onEditLiberationPath?: () => void;
}

export function LiberationPathCard({
  alumnus,
  onUpdateAlumnus,
  onEditLiberationPath
}: LiberationPathCardProps) {
  
  // Use the new resolver to get correct path and stage
  const { path: resolvedPath, stage: resolvedStage, stageIndex } = resolveStageAndPath(alumnus);
  
  // Get the stages for the resolved path
  const stages = STAGE_OPTIONS[resolvedPath];

  // For null paths (no pathType), show no progress
  const isNullPath = !alumnus.pathType;
  
  // Use the resolved stage index for progress calculation (already clamped by resolver)
  const currentStageIndex = isNullPath ? -1 : stageIndex;
  // Use stagePercent helper for consistent calculation across the app
  const progressPercentage = isNullPath ? 0 : stagePercent(resolvedPath, resolvedStage) * 100;

  // Get path icon
  const getPathIcon = () => {
    switch (alumnus.pathType) {
      case 'college':
        return <GraduationCap className="h-4 w-4 text-gray-400" />;
      case 'training':
      case 'military':
        return <Wrench className="h-4 w-4 text-gray-400" />;
      case 'work':
      case 'other':
        return <Briefcase className="h-4 w-4 text-gray-400" />;
      default:
        return <GraduationCap className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 relative">
      {/* Path icon in top-right */}
      <div className="absolute top-4 right-4">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {getPathIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {alumnus.pathType === 'college' && 'College'}
              {(alumnus.pathType === 'training' || alumnus.pathType === 'military') && 'Vocation/Military'}
              {(alumnus.pathType === 'work' || alumnus.pathType === 'other') && 'Employment'}
              {!alumnus.pathType && 'Path Undefined'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      {/* Progress Visualization */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-12 py-2 cursor-help">
            <div className="relative flex items-center justify-between">
          
          {/* Background progress line */}
          {stages.length > 1 && (
            <>
              <div className="absolute left-3 top-3 h-0.5 bg-gray-200 z-0"
                   style={{ width: `calc(100% - 24px)` }} />
              
              {!isNullPath && (
                <div className="absolute left-3 top-3 h-0.5 z-0 transition-all duration-300"
                     style={{ 
                       backgroundColor: 'var(--csh-green-500)',
                       width: `calc((100% - 24px) * ${Math.min(1, Math.max(0, currentStageIndex / (stages.length - 1)))})`
                     }} />
              )}
            </>
          )}

          {/* Stage circles and labels */}
          {stages.map((stage, index) => {
            const isCompleted = !isNullPath && index <= currentStageIndex;
            const isCurrent = !isNullPath && index === currentStageIndex;

            return (
              <div
                key={stage.value}
                className="relative flex flex-col items-center group z-10"
              >
                {/* Circle with gradient and shadow - muted for null paths */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                  ${isNullPath ? 'bg-gray-100' : 
                    isCompleted 
                    ? 'shadow-lg' 
                    : isCurrent 
                    ? ''
                    : 'bg-gray-100'
                  }
                `}
                style={{
                  backgroundColor: isNullPath ? undefined :
                    isCompleted 
                    ? 'var(--csh-green-500)' 
                    : isCurrent 
                    ? 'var(--csh-green-500)' 
                    : undefined,
                  opacity: isNullPath ? 0.3 : (isCurrent && !isCompleted ? 0.4 : 1),
                  boxShadow: !isNullPath && isCompleted ? '0 4px 14px rgba(63, 184, 113, 0.3)' : undefined
                }}>
                  {!isNullPath && isCompleted && <Sparkles className="w-3.5 h-3.5 text-white" />}
                  {!isNullPath && isCurrent && !isCompleted && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--csh-green-500)' }}></div>}
                  {(isNullPath || (!isCurrent && !isCompleted)) && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
                </div>

                {/* Label - muted for null paths */}
                <span className={`
                  text-xs mt-2 font-medium transition-colors
                  ${isNullPath ? 'text-gray-300' : 
                    isCurrent ? 'text-gray-700' : 'text-gray-400'
                  }
                `}
                style={{
                  color: !isNullPath && isCompleted ? 'var(--csh-green-700)' : undefined
                }}>
                  {stage.label}
                </span>
              </div>
            );
          })}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Liberation Progress</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}