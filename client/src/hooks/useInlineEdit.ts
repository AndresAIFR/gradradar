import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface UseInlineEditOptions {
  initialValue: any;
  onSave: (value: any) => Promise<void>;
  fieldLabel?: string;
  fieldType?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'boolean' | 'select';
  validation?: (value: any) => string | null;
}

export function useInlineEdit({
  initialValue,
  onSave,
  fieldLabel = "Field",
  fieldType = 'text',
  validation
}: UseInlineEditOptions) {
  // Generate a unique key for this field's editing state
  const editingStateKey = `inlineEdit_${fieldLabel}_${initialValue}`;
  
  // Restore editing state from sessionStorage
  const [isEditing, setIsEditing] = useState(() => {
    const stored = sessionStorage.getItem(editingStateKey);
    return stored === 'true';
  });
  const [editValue, setEditValue] = useState(() => {
    if (isEditing) {
      const storedValue = sessionStorage.getItem(`${editingStateKey}_value`);
      return storedValue || String(initialValue || '');
    }
    return String(initialValue || '');
  });
  // Track whether this is a fresh edit start (should select text) vs restored state (shouldn't select)
  const [shouldSelectText, setShouldSelectText] = useState(false);
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async (value: any) => {
      // Type conversion based on field type
      let convertedValue: any = value;
      
      if (fieldType === 'number') {
        convertedValue = value === '' ? null : Number(value);
      } else if (fieldType === 'boolean') {
        convertedValue = value === 'true';
      }

      // Validation
      if (validation) {
        const error = validation(convertedValue);
        if (error) {
          throw new Error(error);
        }
      }

      await onSave(convertedValue);
      return convertedValue;
    },
    onSuccess: () => {
      setIsEditing(false);
      setShouldSelectText(false);
      // Clear editing state from sessionStorage
      sessionStorage.removeItem(editingStateKey);
      sessionStorage.removeItem(`${editingStateKey}_value`);
      toast({
        title: "Updated successfully",
        description: `${fieldLabel} has been updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || `Failed to update ${fieldLabel.toLowerCase()}.`,
        variant: "destructive",
      });
    }
  });

  const startEdit = () => {
    // Check if we already have a stored value (user was editing when component remounted)
    const storedValue = sessionStorage.getItem(`${editingStateKey}_value`);
    const valueToUse = storedValue || String(initialValue || '');
    
    setIsEditing(true);
    setEditValue(valueToUse);
    setShouldSelectText(true); // This is a fresh edit start, should select text
    // Persist editing state to sessionStorage
    sessionStorage.setItem(editingStateKey, 'true');
    sessionStorage.setItem(`${editingStateKey}_value`, valueToUse);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue(String(initialValue || ''));
    setShouldSelectText(false);
    // Clear editing state from sessionStorage
    sessionStorage.removeItem(editingStateKey);
    sessionStorage.removeItem(`${editingStateKey}_value`);
  };

  const saveEdit = () => {
    saveMutation.mutate(editValue);
  };

  const handleEditValueChange = (newValue: string) => {
    setEditValue(newValue);
    // Update stored value when editing
    if (isEditing) {
      sessionStorage.setItem(`${editingStateKey}_value`, newValue);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  const clearSelectFlag = () => {
    setShouldSelectText(false);
  };

  return {
    isEditing,
    editValue,
    setEditValue: handleEditValueChange,
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    shouldSelectText,
    clearSelectFlag,
    isSaving: saveMutation.isPending,
    error: saveMutation.error
  };
}