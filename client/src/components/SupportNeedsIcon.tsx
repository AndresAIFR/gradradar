import { AlertTriangle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SupportNeedsIconProps {
  supportNeeds: string;
}

export default function SupportNeedsIcon({ supportNeeds }: SupportNeedsIconProps) {
  const getSupportNeedsConfig = (supportNeeds: string) => {
    // Normalize the input by trimming and converting to lowercase for comparison
    const normalized = supportNeeds.trim().toLowerCase();
    
    // High needs indicators (red triangle)
    if (normalized.includes("high") || normalized === "high needs") {
      return {
        icon: AlertTriangle,
        color: "text-red-500",
        bgColor: "bg-red-50",
        tooltip: "High Needs - Immediate Attention"
      };
    }
    
    // Medium needs indicators (orange circle)  
    if (normalized.includes("medium") || normalized === "medium needs") {
      return {
        icon: AlertCircle,
        color: "text-orange-500",
        bgColor: "bg-orange-50", 
        tooltip: "Medium Needs - Regular Check-ins"
      };
    }
    
    // Low needs or success cases (no icon)
    if (normalized.includes("low") || normalized.includes("success") || normalized === "low needs") {
      return null;
    }
    
    // Default case - no icon
    return null;
  };

  const config = getSupportNeedsConfig(supportNeeds);
  
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}>
          <IconComponent className={`w-4 h-4 ${config.color}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}