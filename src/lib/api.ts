
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

export async function searchLocations(type: SearchType, value: string, limit: number = 1000): Promise<Location[]> {
  if (!value.trim()) {
    return [];
  }

  // Use mock data if we're in preview mode
  if (isPreviewEnvironment()) {
    console.log("Using mock data for preview environment");
    return getMockLocations(type, value, limit);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/search/${type}/${encodeURIComponent(value)}?limit=${limit}`);
    
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
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    toast({
      title: "Search Failed",
      description: message,
      variant: "destructive",
    });
    throw error;
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
      Object.keys(mockTownMap).forEach(town => {
        if (town.includes(searchValue)) {
          results = [...results, ...mockTownMap[town]];
        }
      });
      break;
    
    case 'county':
      // Handle county searches
      Object.keys(mockCountyMap).forEach(county => {
        if (county.includes(searchValue)) {
          results = [...results, ...mockCountyMap[county]];
        }
      });
      break;
  }

  // Simulate the delay of a real API call
  return results.slice(0, limit);
}
