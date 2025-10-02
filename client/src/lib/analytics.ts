import { apiRequest } from "./queryClient";

export interface TrackEventParams {
  eventType: string;
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  eventValue?: number;
  metadata?: Record<string, any>;
}

export interface TrackErrorParams {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  metadata?: Record<string, any>;
}

class Analytics {
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor() {
    // Generate a session ID for this browser session
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    const storageKey = 'analytics_session_id';
    let sessionId = sessionStorage.getItem(storageKey);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(storageKey, sessionId);
    }
    
    return sessionId;
  }

  /**
   * Track a custom event
   */
  async trackEvent(params: TrackEventParams): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await apiRequest('POST', '/api/analytics/events', {
        ...params,
        sessionId: this.sessionId,
        path: window.location.pathname,
        referrer: document.referrer,
      });
    } catch (error) {
      // Silently fail - don't want analytics to break the app
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track a page view
   */
  async trackPageView(pageName?: string): Promise<void> {
    return this.trackEvent({
      eventType: 'page_view',
      eventCategory: 'navigation',
      eventAction: 'view',
      eventLabel: pageName || window.location.pathname,
      metadata: {
        title: document.title,
        url: window.location.href,
      },
    });
  }

  /**
   * Track a button click
   */
  async trackClick(label: string, category?: string, metadata?: Record<string, any>): Promise<void> {
    return this.trackEvent({
      eventType: 'click',
      eventCategory: category || 'interaction',
      eventAction: 'click',
      eventLabel: label,
      metadata,
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUse(featureName: string, action: string, metadata?: Record<string, any>): Promise<void> {
    return this.trackEvent({
      eventType: 'feature_use',
      eventCategory: featureName,
      eventAction: action,
      metadata,
    });
  }

  /**
   * Track an error
   */
  async trackError(params: TrackErrorParams): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await apiRequest('POST', '/api/analytics/errors', {
        ...params,
        path: window.location.pathname,
      });
    } catch (error) {
      // Silently fail
      console.error('Failed to track error:', error);
    }
  }

  /**
   * Disable analytics tracking
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Enable analytics tracking
   */
  enable(): void {
    this.isEnabled = true;
  }
}

// Export singleton instance
export const analytics = new Analytics();
