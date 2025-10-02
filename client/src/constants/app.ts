// Application-wide constants
export const APP_CONSTANTS = {
  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 100,
    DEFAULT_PAGE: 1,
  },

  // Query settings
  QUERY: {
    STALE_TIME: 5 * 60 * 1000, // 5 minutes
    GC_TIME: 30 * 60 * 1000,   // 30 minutes
    MAX_RETRIES: 1,
  },

  // LocalStorage keys
  STORAGE_KEYS: {
    FILTER_PANEL_COLLAPSED: 'filterPanelCollapsed',
    ACTIVE_FILTER_TAB: 'activeFilterTab',
    LAST_VIEWED_ALUMNI: 'lastViewedAlumni',
  },

  // UI settings
  UI: {
    TOAST_LIMIT: 1,
    DEBOUNCE_DELAY: 300,
  },

  // API endpoints
  API: {
    ALUMNI: '/api/alumni',
    ALUMNI_PAGINATED: '/api/alumni/paginated',
    ALUMNI_LOCATIONS: '/api/alumni-locations',
  },

  // Query keys
  QUERY_KEYS: {
    ALUMNI: 'alumni',
    INTERACTIONS: 'interactions',
    LOCATIONS: 'locations',
  },
} as const;