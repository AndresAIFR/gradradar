import React from 'react';

interface ProgressCircleProps {
  current: number;
  target: number;
  firstScore?: number;
  size?: 'small' | 'large';
  isTestOver?: boolean;
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  current,
  target,
  firstScore = 0,
  size = 'small',
  isTestOver = false
}) => {
  // Calculate percentage using baseline logic
  let percentage = 0;
  
  if (current === 0 && target > 0) {
    // Show blue quarter-circle for students with targets but no scores yet
    percentage = 25;
  } else if (current > 0 && target > 0) {
    if (firstScore === 0 || !firstScore) {
      // If no baseline, show current vs target as simple percentage
      percentage = Math.min(100, Math.round((current / target) * 100));
    } else {
      // Show progress from first score to target (baseline calculation)
      const totalNeeded = target - firstScore;
      const achieved = current - firstScore;
      
      if (totalNeeded <= 0) {
        // If target is same or lower than baseline, show current vs target
        percentage = Math.min(100, Math.round((current / target) * 100));
      } else {
        // Normal case: show progress from baseline to target
        percentage = Math.min(100, Math.max(0, Math.round((achieved / totalNeeded) * 100)));
        

      }
    }
    
    // Update percentage logic for test completion
    if (isTestOver && current > 0) {
      // Test is over - use completion logic
      const targetHit = current >= target;
      
      if (targetHit) {
        percentage = 100; // Show full circle when target hit
      } else {
        percentage = Math.round((current / target) * 100);
      }
    }
  }



  // Color logic for progress circles
  const getColorClass = (percentage: number, currentScore: number, targetScore: number, isTestOver: boolean) => {
    // Gray ring for students with targets but no scores yet
    if (currentScore === 0 && targetScore > 0) {
      return 'text-gray-400';
    }
    
    if (isTestOver) {
      // Test is over - use completion logic with filled circles
      const targetHit = currentScore >= targetScore;
      const closeToTarget = currentScore >= (targetScore * 0.9); // within 10%
      

      
      if (targetHit) return 'text-green-500'; // green filled - target hit
      if (closeToTarget) return 'text-orange-500'; // orange filled - close to target
      return 'text-red-500'; // red filled - target not hit
    } else {
      // Test is upcoming - use progress logic
      // First check if target is actually achieved (crucial for Lisa Hercot case)
      if (currentScore >= targetScore) return 'text-green-500';
      if (percentage >= 60) return 'text-orange-500';
      return 'text-red-500';
    }
  };

  // SVG circle configuration
  const radius = size === 'large' ? 40 : (size === 'small' ? 10 : 40);
  const svgSize = size === 'large' ? 'w-36 h-36' : 'w-8 h-8';
  const viewBox = size === 'large' ? '0 0 100 100' : '0 0 24 24';
  const cx = size === 'large' ? '50' : '12';
  const cy = size === 'large' ? '50' : '12';
  const strokeWidth = size === 'large' ? '5' : '2';

  // Generate tooltip text based on state
  const getTooltipText = () => {
    if (isTestOver) {
      // Filled circles - completed tests
      if (!target) {
        return `Complete: ${current}`;
      } else if (current >= target) {
        return `Complete: ${current}/${target}`;
      } else if (current >= target * 0.9) {
        return `Target Close: ${current}/${target}`;
      } else {
        return `Target Missed: ${current}/${target}`;
      }
    } else {
      // Progress circles - upcoming tests
      if (current === 0 && target > 0) {
        return `No Scores Yet`;
      } else if (current >= target) {
        return `Ahead: ${current}/${target}`;
      } else if (current >= target * 0.9) {
        return `Close: ${current}/${target}`;
      } else {
        return `Behind: ${current}/${target}`;
      }
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${size === 'large' ? 'w-36 h-36' : 'w-8 h-8'} group`}>
      <svg className={`${svgSize} transform -rotate-90`} viewBox={viewBox}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        {isTestOver ? (
          // Test completed - show filled circle with achievement color
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="currentColor"
            className={getColorClass(percentage, current, target, isTestOver)}
          />
        ) : (
          // Test upcoming - show progress circle
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * radius}`}
            strokeDashoffset={`${2 * Math.PI * radius * (1 - percentage / 100)}`}
            className={getColorClass(percentage, current, target, isTestOver)}
            strokeLinecap="round"
          />
        )}
      </svg>
      {size === 'large' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${getColorClass(percentage, current, target, isTestOver)}`}>
            {current}
          </span>
          <span className="text-sm text-gray-500">of {target}</span>
        </div>
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
        {getTooltipText()}
      </div>
    </div>
  );
};