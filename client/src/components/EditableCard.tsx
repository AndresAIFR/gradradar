import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditableCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  fields: Array<{
    name: string;
    label: string;
    value: string | undefined;
    type?: "text" | "email" | "tel" | "textarea";
    required?: boolean;
  }>;
  alumniId: number;
  sectionKey: string;
  onSave?: () => void;
}

export function EditableCard({
  icon,
  title,
  children,
  fields,
  alumniId,
  sectionKey,
  onSave,
}: EditableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize edited values when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const initialValues: Record<string, string> = {};
      fields.forEach(field => {
        initialValues[field.name] = field.value || "";
      });
      setEditedValues(initialValues);
    }
  }, [isEditing, fields]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PATCH", `/api/alumni/${alumniId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/alumni/${alumniId}`] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: `${title} updated successfully`,
      });
      onSave?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update ${title.toLowerCase()}`,
        variant: "destructive",
      });
      
    },
  });

  const handleSave = () => {
    // Only send changed values
    const changedValues: Record<string, string> = {};
    fields.forEach(field => {
      const newValue = editedValues[field.name] || "";
      const oldValue = field.value || "";
      if (newValue !== oldValue) {
        changedValues[field.name] = newValue;
      }
    });

    if (Object.keys(changedValues).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(changedValues);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues({});
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  return (
    <Card className={isEditing ? "border-gray-300 bg-gray-50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </div>
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    value={editedValues[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.label}
                    required={field.required}
                    className="bg-white"
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || "text"}
                    value={editedValues[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.label}
                    required={field.required}
                    className="bg-white"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}