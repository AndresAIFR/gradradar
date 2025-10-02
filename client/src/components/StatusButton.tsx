import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Check, Target, AlertTriangle } from "lucide-react";

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusButtonProps {
  currentStatus: string | undefined;
  options: StatusOption[];
  onUpdate: (status: string) => void;
  compact?: boolean;
}

export function StatusButton({ currentStatus, options, onUpdate, compact = false }: StatusButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentOption = options.find(opt => opt.value === currentStatus);
  
  // Determine icon based on option type
  const getIcon = () => {
    if (options.some(opt => opt.value.includes('track'))) {
      return <Target className="h-4 w-4" />;
    } else {
      return <AlertTriangle className="h-4 w-4" />;
    }
  };
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => setIsOpen(!isOpen)}
        className={compact ? "px-2" : "w-full justify-between"}
      >
        {compact ? (
          <span className="flex items-center space-x-1">
            {getIcon()}
            {currentOption && (
              <div className={`w-2 h-2 rounded-full ${currentOption.color}`} />
            )}
          </span>
        ) : (
          <>
            <span className="flex items-center space-x-2">
              {currentOption && (
                <div className={`w-3 h-3 rounded-full ${currentOption.color}`} />
              )}
              <span>{currentOption?.label || "Not Set"}</span>
            </span>
            <ChevronDown className="h-4 w-4" />
          </>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1">
          <Card className="shadow-lg">
            <CardContent className="p-2">
              <div className="space-y-1">
                {options.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    className="w-full justify-start text-left"
                    onClick={() => {
                      onUpdate(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${option.color}`} />
                      <span>{option.label}</span>
                      {currentStatus === option.value && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}