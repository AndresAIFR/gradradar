import type { ExamScore } from '@shared/schema';
import { format } from 'date-fns';
import { useState, useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Edit2, ChevronDown } from 'lucide-react';

interface ScoreProgressCardProps {
  scores: ExamScore[];
  examType: string;
  targetScore?: number;
  testDate?: string;
  onAddScore: () => void;
  hideHeader?: boolean;
  onEditScore?: (score: ExamScore) => void;
}

export function ScoreProgressCard({ 
  scores, 
  examType, 
  targetScore, 
  testDate, 
  onAddScore,
  hideHeader = false,
  onEditScore 
}: ScoreProgressCardProps) {
  // All hooks must be called at the top level
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    score: number;
    target: number | undefined;
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(500);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const resize = () => {
      const containerWidth = wrapperRef.current!.offsetWidth;
      // Use full container width with minimum width constraint
      const minWidth = 300;
      const adjustedWidth = Math.max(containerWidth - 40, minWidth); // Account for padding
      setChartWidth(adjustedWidth);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);
  
  // Sort scores by date
  const sortedScores = [...scores].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sortedScores.length === 0) {
    const containerClass = hideHeader ? "" : "bg-white rounded-lg border p-6";
    return (
      <div className={containerClass}>
        {!hideHeader && (
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Score Progress</h3>
            <button
              onClick={onAddScore}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="text-lg mr-2">+</span>
              Add Score
            </button>
          </div>
        )}
        <div className="text-center py-12 text-gray-500">
          <p>No scores yet. Add your first score to see progress.</p>
        </div>
      </div>
    );
  }

  const latestScore = sortedScores[sortedScores.length - 1];
  const firstScore = sortedScores[0];
  const scoreDelta = sortedScores.length > 1 ? latestScore.score - firstScore.score : null;
  const chartHeight = 240;
  const padding = 50;
  const bottomPadding = 35; // Room for date labels below x-axis
  


  // Calculate score range for scaling with padding
  const allScores = sortedScores.map(s => s.score);
  const rawMinScore = Math.min(...allScores);
  const rawMaxScore = Math.max(...allScores, targetScore || 0);
  const rawRange = rawMaxScore - rawMinScore;
  
  // Add 15% padding above and below for better visual spacing
  const rangePadding = rawRange * 0.15;
  const minScore = rawMinScore - rangePadding;
  const maxScore = rawMaxScore + rangePadding;
  const scoreRange = maxScore - minScore;
  
  const yScale = (score: number) => {
    const normalizedScore = (score - minScore) / (scoreRange || 1);
    const availableHeight = chartHeight - padding - bottomPadding;
    return chartHeight - bottomPadding - (normalizedScore * availableHeight);
  };

  // Calculate x positions based on actual dates
  const startDateMs = new Date(sortedScores[0].date + 'T00:00:00.000Z').getTime();
  const endDateMs = testDate ? 
    new Date(testDate + 'T12:00:00.000Z').getTime() : 
    new Date(sortedScores[sortedScores.length - 1].date + 'T00:00:00.000Z').getTime();
  const totalTimeSpan = endDateMs - startDateMs;
  
  const xScale = (index: number) => {
    const scoreDate = new Date(sortedScores[index].date + 'T00:00:00.000Z').getTime();
    const timeFromStart = scoreDate - startDateMs;
    const proportion = totalTimeSpan > 0 ? timeFromStart / totalTimeSpan : 0;
    return padding + (proportion * (chartWidth - 2 * padding));
  };

  // Generate smooth curve path
  const generateSmoothPath = () => {
    if (sortedScores.length < 2) {
      const x = xScale(0);
      const y = yScale(sortedScores[0].score);
      return `M ${x} ${y}`;
    }

    let path = `M ${xScale(0)} ${yScale(sortedScores[0].score)}`;
    
    for (let i = 1; i < sortedScores.length; i++) {
      const prevX = xScale(i - 1);
      const prevY = yScale(sortedScores[i - 1].score);
      const currX = xScale(i);
      const currY = yScale(sortedScores[i].score);
      
      // Control point for smooth curve
      const cp1x = prevX + (currX - prevX) * 0.5;
      const cp1y = prevY;
      const cp2x = currX - (currX - prevX) * 0.5;
      const cp2y = currY;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currX} ${currY}`;
    }
    
    return path;
  };

  // Generate shadow area path (curve + bottom line)
  const generateShadowPath = () => {
    const curvePath = generateSmoothPath();
    const baseY = chartHeight - bottomPadding;
    const lastX = xScale(sortedScores.length - 1);
    const firstX = xScale(0);
    
    return `${curvePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  // Format dates with timezone handling
  const startDate = format(new Date(sortedScores[0].date + 'T00:00:00.000Z'), 'MMM d');
  const latestScoreDate = format(new Date(latestScore.date + 'T00:00:00.000Z'), 'MMM d');
  
  // Always show the test date if it exists, otherwise show the latest score date
  const testDateFormatted = testDate ? format(new Date(testDate + 'T12:00:00.000Z'), 'MMM d') : null;
  const isTestDateInFuture = testDate && new Date(testDate + 'T12:00:00.000Z') > new Date();
  const useTestDateStyling = testDate && isTestDateInFuture;

  const containerClass = hideHeader ? "" : "bg-white rounded-lg border p-8";
  
  return (
    <div className={containerClass} style={{ minHeight: '0', height: 'fit-content', maxHeight: 'none' }}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Score Progress</h3>
          <button
            onClick={onAddScore}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="text-lg mr-2">+</span>
            Add Score
          </button>
        </div>
      )}

      {/* Hero Score Display - Positioned to align with first date */}
      <div className="mb-2 relative" style={{ paddingTop: '20px' }}>
        <div className="absolute" style={{ left: `${padding}px` }}>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {latestScore.score}
          </div>
          {scoreDelta && (
            <div className={`text-lg font-medium ${scoreDelta > 0 ? 'text-green-600' : scoreDelta < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {scoreDelta > 0 ? '+' : ''}{scoreDelta}
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div ref={wrapperRef} className="mb-4 w-full">
        <svg width={chartWidth} height={chartHeight}>
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.15)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.02)" />
            </linearGradient>
          </defs>

          {/* Soft X-axis line */}
          <line
            x1={padding}
            y1={chartHeight - bottomPadding}
            x2={chartWidth - padding}
            y2={chartHeight - bottomPadding}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Target Score Line (if provided) */}
          {targetScore && yScale(targetScore) >= padding && yScale(targetScore) <= chartHeight - bottomPadding && (
            <line
              x1={padding}
              y1={yScale(targetScore)}
              x2={chartWidth - padding}
              y2={yScale(targetScore)}
              stroke="#e5e7eb"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Gradient Shadow Area */}
          <path
            d={generateShadowPath()}
            fill="url(#shadowGradient)"
          />

          {/* Smooth Curve */}
          <path
            d={generateSmoothPath()}
            stroke="url(#scoreGradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {sortedScores.map((score, index) => (
            <circle
              key={score.id}
              cx={xScale(index)}
              cy={yScale(score.score)}
              r="6"
              fill={score.isReal ? "#dc2626" : "#06b6d4"}
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (svgRect) {
                  setHoveredPoint({
                    score: score.score,
                    target: targetScore,
                    date: format(new Date(score.date), 'MMM d, yyyy'),
                    x: svgRect.left + xScale(index),
                    y: svgRect.top + yScale(score.score)
                  });
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* Vertical line from latest score (if test date exists) */}
          {testDate && (
            <line
              x1={xScale(sortedScores.length - 1)}
              y1={yScale(latestScore.score)}
              x2={xScale(sortedScores.length - 1)}
              y2={chartHeight - bottomPadding}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {/* Date labels */}
          <text
            x={padding}
            y={chartHeight - 8}
            textAnchor="start"
            fill="#6b7280"
            fontSize="14"
            fontWeight="500"
          >
            {startDate}
          </text>
          {testDate && isTestDateInFuture && (
            <text
              x={chartWidth - padding}
              y={chartHeight - 8}
              textAnchor="end"
              fill="#ef4444"
              fontSize="14"
              fontWeight="500"
            >
              {testDateFormatted}
            </text>
          )}

        </svg>
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: hoveredPoint.x,
            top: hoveredPoint.y - 85,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">Score: {hoveredPoint.score}</div>
          {hoveredPoint.target && (
            <div className="text-gray-300">Target: {hoveredPoint.target}</div>
          )}
          <div className="text-gray-300">{hoveredPoint.date}</div>
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #111827'
            }}
          />
        </div>
      )}

      {/* Score History Section */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="flex items-center mb-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''} mr-2`} />
          <h4 className="text-sm font-medium text-gray-700">Score History</h4>
        </button>
        {isHistoryExpanded && (
          <div className="max-h-64 overflow-y-auto space-y-2" style={{ minHeight: '0' }}>
            {sortedScores.length > 0 ? (
              [...sortedScores].reverse().map((score) => (
                <div 
                  key={score.id}
                  className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => onEditScore?.(score)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <div className="text-sm text-slate-600">
                        {format(new Date(score.date), 'MMM d')}
                      </div>
                      <Badge variant="default" className={`text-xs ${score.isReal ? 'bg-red-100 text-red-800' : 'bg-cyan-100 text-cyan-800'}`} style={{
                        backgroundColor: score.isReal ? '#fecaca' : '#cdfdf7', 
                        color: score.isReal ? '#dc2626' : '#0e7490'
                      }}>
                        {score.isReal ? "Real" : "Mock"}
                      </Badge>
                    <div className="font-semibold text-slate-900">
                      {score.score}
                    </div>
                    {score.resource && score.resource.trim() !== "" && (
                      <Badge variant="outline" className="text-xs">
                        {score.resource}
                      </Badge>
                    )}
                    {score.notes && score.notes.trim() !== "" && (
                      <span className="text-sm text-slate-600 italic">
                        {score.notes}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="text-sm text-slate-400">
                      {Math.round((score.score / score.maxScore) * 100)}%
                    </div>
                    <Edit2 className="h-3 w-3 text-slate-400" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-4">
                <p className="text-sm">No {examType} scores yet</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}