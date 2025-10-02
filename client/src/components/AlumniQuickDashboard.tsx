import type { Alumni } from '@shared/schema';

interface AlumniQuickDashboardProps {
  alumnus: Alumni;
  interactions: any[];
  createSaveHandler: (field: string) => (value: any) => Promise<void>;
  onAddNote?: () => void;
  onEditNote?: (id: number | 'new') => void;
}

export function AlumniQuickDashboard({ 
  alumnus, 
  interactions, 
  createSaveHandler,
  onAddNote,
  onEditNote
}: AlumniQuickDashboardProps) {
  return null;
}