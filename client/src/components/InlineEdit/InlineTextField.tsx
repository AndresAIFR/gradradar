import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { formatPhoneNumber, isPhoneNumberField } from "@/utils/phoneFormat";

interface InlineTextFieldProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  fieldLabel?: string;
  fieldType?: 'text' | 'email' | 'tel' | 'number' | 'date';
  placeholder?: string;
  className?: string;
  validation?: (value: string) => string | null;
  disabled?: boolean;
}

export default function InlineTextField({
  value,
  onSave,
  fieldLabel = "Field",
  fieldType = 'text',
  placeholder = "Click to edit",
  className = "",
  validation,
  disabled = false
}: InlineTextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    isEditing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    shouldSelectText,
    clearSelectFlag,
    isSaving
  } = useInlineEdit({
    initialValue: value,
    onSave,
    fieldLabel,
    fieldType,
    validation
  });

  // Auto-focus when editing starts, but only select text when it's a fresh edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (shouldSelectText) {
        inputRef.current.select();
        clearSelectFlag(); // Clear the flag after selecting
      } else {
        // Position cursor at the end for restored editing state
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }
  }, [isEditing, shouldSelectText, clearSelectFlag]);

  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            type={fieldType}
            className={`h-8 text-sm ${fieldType === 'date' ? 'w-[160px]' : 'flex-1'}`}
            disabled={isSaving}
          />
          <div className="flex items-center space-x-1">
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
      </div>
    );
  }

  return (
    <div
      className={`inline-block min-w-[100px] px-2 py-1 rounded transition-all ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100 cursor-text'
      } ${className}`}
      onClick={disabled ? undefined : startEdit}
    >
      <span className="text-sm">
        {value ? (
          isPhoneNumberField(fieldLabel) ? formatPhoneNumber(value) : value
        ) : (
          <span className="text-gray-400 italic">{placeholder}</span>
        )}
      </span>
    </div>
  );
}