import { useEffect } from 'react';
import { analytics, type TrackEventParams } from '@/lib/analytics';

/**
 * Hook to track page views automatically on mount
 * @param pageName - Optional custom page name (defaults to pathname)
 */
export function usePageView(pageName?: string) {
  useEffect(() => {
    analytics.trackPageView(pageName);
  }, [pageName]);
}

/**
 * Hook to access analytics tracking functions
 */
export function useAnalytics() {
  return {
    trackEvent: (params: TrackEventParams) => analytics.trackEvent(params),
    trackClick: (label: string, category?: string, metadata?: Record<string, any>) => 
      analytics.trackClick(label, category, metadata),
    trackFeatureUse: (featureName: string, action: string, metadata?: Record<string, any>) => 
      analytics.trackFeatureUse(featureName, action, metadata),
    trackPageView: (pageName?: string) => analytics.trackPageView(pageName),
  };
}
