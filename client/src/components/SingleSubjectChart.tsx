import type { ExamScore } from '@shared/schema';
import { format } from 'date-fns';
import { useState, useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Edit2, ChevronDown } from 'lucide-react';

interface SingleSubjectChartProps {
  scores: ExamScore[];
  examType: string;
  targetScore?: number;
  testDate?: string;
  onEditScore?: (score: ExamScore) => void;
  onAddScore?: () => void;
}

export function SingleSubjectChart({ 
  scores, 
  examType, 
  targetScore, 
  testDate, 
  onEditScore,
  onAddScore
}: SingleSubjectChartProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    score: number;
    target: number | undefined;
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<{
    target: number;
    x: number;
    y: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(500);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const resize = () => {
      if (!wrapperRef.current) return; // Additional safety check
      const containerWidth = wrapperRef.current.offsetWidth;
      const minWidth = 300;
      const adjustedWidth = Math.max(containerWidth - 40, minWidth);
      setChartWidth(adjustedWidth);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);
  
  const sortedScores = [...scores].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sortedScores.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <div className="text-center mb-6">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-6">No {examType} scores yet</p>
        </div>
        {onAddScore && (
          <button
            onClick={onAddScore}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">+</span>
            Add First Score
          </button>
        )}
      </div>
    );
  }

  const latestScore = sortedScores[sortedScores.length - 1];
  const firstScore = sortedScores[0];
  const scoreDelta = sortedScores.length > 1 ? latestScore.score - firstScore.score : null;
  const chartHeight = 240;
  const padding = 25;
  const bottomPadding = 35;

  // Calculate score range for scaling with padding
  const allScores = sortedScores.map(s => s.score);
  const rawMinScore = Math.min(...allScores);
  const rawMaxScore = Math.max(...allScores, targetScore || 0);
  const rawRange = rawMaxScore - rawMinScore;
  
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
      
      const cp1x = prevX + (currX - prevX) * 0.5;
      const cp1y = prevY;
      const cp2x = currX - (currX - prevX) * 0.5;
      const cp2y = currY;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currX} ${currY}`;
    }
    
    return path;
  };

  // Generate shadow area path
  const generateShadowPath = () => {
    const curvePath = generateSmoothPath();
    const baseY = chartHeight - bottomPadding;
    const lastX = xScale(sortedScores.length - 1);
    const firstX = xScale(0);
    
    return `${curvePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  // Format dates
  const startDate = format(new Date(sortedScores[0].date + 'T00:00:00.000Z'), 'MMM d');
  const latestScoreDate = format(new Date(latestScore.date + 'T00:00:00.000Z'), 'MMM d');
  const testDateFormatted = testDate ? format(new Date(testDate + 'T12:00:00.000Z'), 'MMM d') : null;
  const isTestDateInFuture = testDate && new Date(testDate + 'T12:00:00.000Z') > new Date();

  return (
    <div className="h-full">
      {/* Hero Score Display - Fixed height to prevent overlap */}
      <div className="mb-6 h-20 flex items-start gap-3" style={{ paddingLeft: `${padding + 50}px` }}>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {latestScore.score}
          </div>
          {scoreDelta && (
            <div className={`text-lg font-medium ${scoreDelta > 0 ? 'text-green-600' : scoreDelta < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {scoreDelta > 0 ? '+' : ''}{scoreDelta}
            </div>
          )}
        </div>
        {onAddScore && (
          <button
            onClick={onAddScore}
            className="inline-flex items-center justify-center w-6 h-6 bg-slate-400 text-white rounded-md hover:bg-slate-500 mt-3"
            title="Add Score"
          >
            <span className="text-sm">+</span>
          </button>
        )}
      </div>

      {/* SVG Chart */}
      <div ref={wrapperRef} className="mb-4 w-full" style={{ paddingLeft: '50px' }}>
        <svg width={chartWidth} height={chartHeight}>
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

          {/* X-axis line */}
          <line
            x1={padding}
            y1={chartHeight - bottomPadding}
            x2={chartWidth - padding}
            y2={chartHeight - bottomPadding}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Target Score Line */}
          {targetScore && yScale(targetScore) >= padding && yScale(targetScore) <= chartHeight - bottomPadding && (
            <>
              <line
                x1={padding}
                y1={yScale(targetScore)}
                x2={chartWidth - padding}
                y2={yScale(targetScore)}
                stroke="#e5e7eb"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              {/* Invisible hover area for target line */}
              <rect
                x={padding}
                y={yScale(targetScore) - 8}
                width={chartWidth - (padding * 2)}
                height="16"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (svgRect) {
                    setHoveredTarget({
                      target: targetScore,
                      x: svgRect.left + chartWidth / 2,
                      y: svgRect.top + yScale(targetScore)
                    });
                  }
                }}
                onMouseLeave={() => setHoveredTarget(null)}
              />
            </>
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

      {/* Score Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: hoveredPoint.x,
            top: hoveredPoint.y - 60,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">Score: {hoveredPoint.score}</div>
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

      {/* Target Line Tooltip */}
      {hoveredTarget && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: hoveredTarget.x,
            top: hoveredTarget.y - 50,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">Target: {hoveredTarget.target}</div>
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
      <div className="mt-4 pt-4 border-t border-gray-100" style={{ paddingLeft: '50px' }}>
        <button
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="flex items-center mb-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer w-full"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''} mr-2`} />
          <h4 className="text-sm font-medium text-gray-700">Score History</h4>
        </button>
        {isHistoryExpanded && (
          <div className="max-h-64 overflow-y-auto space-y-2 -ml-[50px] pl-[50px] pr-0">
            {[...sortedScores].reverse().map((score) => (
              <div 
                key={score.id}
                className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => onEditScore?.(score)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-wrap">
                    <Edit2 className="h-3 w-3 text-slate-400" />
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}