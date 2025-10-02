// Client-side college service - now acts as a thin wrapper around server API calls
// Maintains backward compatibility while leveraging server-side IPEDS processing

interface CollegeMatch {
  standardName: string;
  latitude?: number;
  longitude?: number;
}

interface CollegeResolution {
  originalName: string;
  standardName: string | null;
  latitude: number | null;
  longitude: number | null;
  confidence: number;
  source: 'ipeds' | 'existing' | 'unmatched';
}

// Simplified client service that wraps server API calls
class ClientCollegeService {
  
  // Search colleges using server endpoint
  async searchColleges(query: string): Promise<string[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }

    try {
      const response = await fetch(`/api/colleges/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search colleges');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to search colleges:', error);
      return [];
    }
  }

  // Check standardized colleges using server resolution endpoint
  async checkStandardizedColleges(collegeNames: string[]): Promise<Record<string, CollegeMatch | null>> {
    try {
      const response = await fetch('/api/resolve-colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeNames })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve colleges');
      }

      const resolutions: CollegeResolution[] = await response.json();
      const results: Record<string, CollegeMatch | null> = {};

      resolutions.forEach(resolution => {
        if (resolution.standardName) {
          results[resolution.originalName] = {
            standardName: resolution.standardName,
            latitude: resolution.latitude || undefined,
            longitude: resolution.longitude || undefined
          };
        } else {
          results[resolution.originalName] = null;
        }
      });

      return results;
    } catch (error) {
      console.error('Failed to check standardized colleges:', error);
      // Return empty result for all colleges on error
      const results: Record<string, CollegeMatch | null> = {};
      collegeNames.forEach(name => {
        results[name] = null;
      });
      return results;
    }
  }
}

// Create singleton instance
const ClientCollegeServiceInstance = new ClientCollegeService();

// Export individual methods for direct import
export const searchCollegesClient = (query: string): Promise<string[]> => {
  return ClientCollegeServiceInstance.searchColleges(query);
};

export const checkStandardizedCollegesClient = (collegeNames: string[]): Promise<Record<string, CollegeMatch | null>> => {
  return ClientCollegeServiceInstance.checkStandardizedColleges(collegeNames);
};

// Export the CollegeMatch interface for use by other modules
export type { CollegeMatch };

// Export the service instance
export { ClientCollegeServiceInstance };
export default ClientCollegeServiceInstance;