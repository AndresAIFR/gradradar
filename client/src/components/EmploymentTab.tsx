import type { Alumni } from "@shared/schema";
import { EmploymentHistorySection } from "./EmploymentHistorySection";
import { useUpdateAlumniField } from "@/hooks/useUpdateAlumniField";

interface EmploymentTabProps {
  alumnus: Alumni;
}

export function EmploymentTab({ alumnus }: EmploymentTabProps) {
  const updateFieldMutation = useUpdateAlumniField(alumnus.id.toString());

  // Helper function to handle field updates
  const handleFieldUpdate = async (field: string, value: any) => {
    await updateFieldMutation.mutateAsync({ field, value });
  };

  return (
    <EmploymentHistorySection
      employmentHistory={alumnus.employmentHistory || []}
      isEditing={true}
      onEmploymentHistoryChange={(history) => handleFieldUpdate('employmentHistory', history)}
    />
  );
}
