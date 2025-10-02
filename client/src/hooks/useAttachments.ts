import { useQuery } from '@tanstack/react-query';

export function useAttachments(alumniId: number | string, interactionId: number | string) {
  const enabled = Boolean(alumniId && interactionId && alumniId !== 0 && interactionId !== 0);

  return useQuery({
    queryKey: ['attachments', alumniId, interactionId],
    queryFn: async () => {
      const url = `/api/alumni/${alumniId}/interactions/${interactionId}/attachments`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      return response.json();
    },
    enabled
  });
}