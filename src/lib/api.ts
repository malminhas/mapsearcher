import { Location, SearchType } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { getMockPostcode, mockTownMap, mockCountyMap } from "./mockData";

const API_BASE_URL = "http://localhost:8000";

// Helper to determine if we're in the Lovable preview environment
const isPreviewEnvironment = (): boolean => {
  return window.location.hostname.includes('lovable.app') || 
         window.location.hostname.includes('preview') || 
         window.location.hostname.includes('staging');
};

// Safe fetch wrapper that handles network errors
const safeFetch = async (url: string): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      signal: controller.signal,
    }).catch((error) => {
      throw new Error('NetworkError');
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    throw new Error('NetworkError');
  }
};

export async function searchLocations(type: SearchType, value: string, limit: number = 1000): Promise<Location[]> {
  if (!value.trim()) {
    return [];
  }

  // Use mock data if we're in preview mode
  if (isPreviewEnvironment()) {
    console.log("Using mock data for preview environment");
    return getMockLocations(type, value, limit);
  }

  let useMockData = false;
  let response: Response | null = null;

  try {
    response = await safeFetch(
      `${API_BASE_URL}/search/${type}/${encodeURIComponent(value)}?limit=${limit}`
    );
  } catch (error) {
    useMockData = true;
  }

  // If we got a network error or no response, use mock data
  if (useMockData || !response) {
    console.log("Network error or backend not available, using mock data");
    return getMockLocations(type, value, limit);
  }

  try {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error: ${response.status}`);
    }

    const data = await response.json();
    let locations = data.locations || [];

    // Filter out locations with longitude 0 and latitude 0 when searching by town or county
    if (type === 'town' || type === 'county') {
      locations = locations.filter(location => !(location.longitude === 0 && location.latitude === 0));
    }

    return locations;
  } catch (error) {
    console.log("Error processing response, using mock data:", error);
    return getMockLocations(type, value, limit);
  }
}

// Mock data implementation
function getMockLocations(type: SearchType, value: string, limit: number): Location[] {
  let results: Location[] = [];
  const searchValue = value.toLowerCase().trim();

  switch (type) {
    case 'postcode':
      results = getMockPostcode(searchValue);
      break;
    
    case 'town':
      // Handle town searches
      for (const [town, locations] of mockTownMap.entries()) {
        if (town.toLowerCase().includes(searchValue)) {
          results.push(...locations);
        }
      }
      break;
    
    case 'county':
      // Handle county searches
      for (const [county, locations] of mockCountyMap.entries()) {
        if (county.toLowerCase().includes(searchValue)) {
          results.push(...locations);
        }
      }
      break;
  }

  // Add isMock flag to all results
  results = results.map(location => ({
    ...location,
    isMock: true
  }));

  // Simulate the delay of a real API call
  return results.slice(0, limit);
}
