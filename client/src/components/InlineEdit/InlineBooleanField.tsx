import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useInlineEdit } from "@/hooks/useInlineEdit";

interface InlineBooleanFieldProps {
  value: boolean | null | undefined;
  onSave: (value: boolean) => Promise<void>;
  fieldLabel?: string;
  className?: string;
  disabled?: boolean;
  showAsToggle?: boolean;
}

export default function InlineBooleanField({
  value,
  onSave,
  fieldLabel = "Field",
  className = "",
  disabled = false,
  showAsToggle = false
}: InlineBooleanFieldProps) {
  
  const {
    isSaving
  } = useInlineEdit({
    initialValue: value,
    onSave: async (val) => onSave(val),
    fieldLabel,
    fieldType: 'boolean'
  });

  const handleToggle = async () => {
    if (disabled || isSaving) return;
    try {
      await onSave(!value);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  if (showAsToggle) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Checkbox
          checked={!!value}
          onCheckedChange={handleToggle}
          disabled={disabled || isSaving}
        />
        {isSaving && (
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-block px-2 py-1 rounded transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-50 cursor-pointer'
      } ${className}`}
      onClick={handleToggle}
    >
      <span className={`text-sm px-2 py-1 rounded-full font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
      {isSaving && (
        <div className="inline-block ml-2 w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}