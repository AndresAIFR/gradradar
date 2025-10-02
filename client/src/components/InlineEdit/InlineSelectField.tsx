import React, { useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";

interface SelectOption {
  value: string;
  label: string;
}

interface InlineSelectFieldProps {
  value: string | null | undefined;
  options: SelectOption[];
  onSave: (value: string) => Promise<void>;
  fieldLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function InlineSelectField({
  value,
  options,
  onSave,
  fieldLabel = "Field",
  placeholder = "Select option",
  className = "",
  disabled = false
}: InlineSelectFieldProps) {
  
  const {
    isEditing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
    isSaving
  } = useInlineEdit({
    initialValue: value,
    onSave,
    fieldLabel,
    fieldType: 'select'
  });

  const getDisplayLabel = (val: string | null | undefined) => {
    if (!val) return placeholder;
    const option = options.find(opt => opt.value === val);
    return option?.label || val;
  };

  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex items-center space-x-2">
          <Select 
            value={editValue || ""} 
            onValueChange={(value) => {
              setEditValue(value);
            }} 
            disabled={isSaving}
          >
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent 
              position="popper" 
              sideOffset={4}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-end space-x-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-green-100"
            onClick={saveEdit}
            disabled={isSaving}
          >
            <Check className="w-3 h-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={cancelEdit}
            disabled={isSaving}
          >
            <X className="w-3 h-3 text-red-600" />
          </Button>
          {isSaving && (
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-block min-w-[100px] px-2 py-1 rounded transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-50 cursor-pointer'
      } ${className}`}
      onClick={disabled ? undefined : startEdit}
    >
      <span className="text-sm">
        {value ? getDisplayLabel(value) : <span className="text-gray-400 italic">{placeholder}</span>}
      </span>
    </div>
  );
}