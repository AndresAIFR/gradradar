// src/components/analytics/FunnelGraph.tsx

// Custom SVG Funnel Component
export default function FunnelGraphComponent({ 
  data, 
  title,
  inverted = false,
  isRed = false,
  onStageClick
}: {
  data: { label: string; value: number }[];
  title?: string;
  inverted?: boolean;
  isRed?: boolean;
  onStageClick?: (stageName: string) => void;
}) {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const gradientId = `gradient-${title?.toLowerCase().replace(/\s+/g, '-') || 'funnel'}-${isRed ? 'red' : 'green'}`;

  const funnelHeight = 400;
  const funnelWidth = 350;
  const stageHeight = funnelHeight / data.length;

  return (
    <div className="flex flex-col items-center">
      {title && <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: isRed ? '#b91c1c' : '#15803d' }}>{title}</h3>}
      
      <svg width={funnelWidth} height={funnelHeight} viewBox={`0 0 ${funnelWidth} ${funnelHeight}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isRed ? '#fca5a5' : '#4ade80'} />
            <stop offset="100%" stopColor={isRed ? '#b91c1c' : '#14532d'} />
          </linearGradient>
        </defs>
        
        {data.map((item, index) => {
          const y = index * stageHeight;
          const progress = inverted ? (index + 1) / data.length : (data.length - index) / data.length;
          
          // Calculate trapezoid dimensions
          const topWidth = inverted ? funnelWidth * (0.3 + 0.7 * (index / data.length)) : funnelWidth * (0.3 + 0.7 * progress);
          const bottomWidth = inverted ? funnelWidth * (0.3 + 0.7 * ((index + 1) / data.length)) : funnelWidth * (0.3 + 0.7 * ((data.length - index - 1) / data.length));
          
          const topX = (funnelWidth - topWidth) / 2;
          const bottomX = (funnelWidth - bottomWidth) / 2;
          
          const pathData = `M ${topX} ${y} L ${topX + topWidth} ${y} L ${bottomX + bottomWidth} ${y + stageHeight} L ${bottomX} ${y + stageHeight} Z`;
          
          const isClickable = !!onStageClick;

          return (
            <g key={index}>
              <path
                d={pathData}
                fill={`url(#${gradientId})`}
                stroke="#ffffff"
                strokeWidth="2"
                opacity={0.9}
                className={`transition-all duration-300 hover:opacity-100 ${isClickable ? 'cursor-pointer hover:stroke-yellow-400 hover:stroke-4' : ''}`}
                onClick={isClickable ? () => onStageClick(item.label) : undefined}
              />
              
              {/* Label */}
              {item.label === "> Nat'l Median Salary" ? (
                <>
                  <text
                    x={funnelWidth / 2}
                    y={y + stageHeight / 2 - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="600"
                    className={isClickable ? "cursor-pointer" : "pointer-events-none"}
                    onClick={isClickable ? () => onStageClick(item.label) : undefined}
                  >
                    {">"} Nat'l Median
                  </text>
                  <text
                    x={funnelWidth / 2}
                    y={y + stageHeight / 2 + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="600"
                    className={isClickable ? "cursor-pointer" : "pointer-events-none"}
                    onClick={isClickable ? () => onStageClick(item.label) : undefined}
                  >
                    Salary
                  </text>
                </>
              ) : (
                <text
                  x={funnelWidth / 2}
                  y={y + stageHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="600"
                  className={isClickable ? "cursor-pointer" : "pointer-events-none"}
                  onClick={isClickable ? () => onStageClick(item.label) : undefined}
                >
                  {item.label}
                </text>
              )}
              
              {/* Value */}
              <text
                x={funnelWidth / 2}
                y={y + stageHeight / 2 + 18}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12"
                fontWeight="400"
                className={isClickable ? "cursor-pointer" : "pointer-events-none"}
                onClick={isClickable ? () => onStageClick(item.label) : undefined}
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}