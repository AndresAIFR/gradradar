// Centralized query keys for React Query
export const qk = {
  alumniList: ['alumni'] as const,
  alumniById: (id: number | string) => ['alumni', id] as const,
  alumniInteractions: (id: number | string) => ['alumni', id, 'interactions'] as const,
  alumniNotes: (id: number | string) => ['alumni', id, 'notes'] as const,
};