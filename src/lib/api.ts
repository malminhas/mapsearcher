import { Location, SearchType } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { getMockPostcode, mockTownMap, mockCountyMap } from "./mockData";
import type { Location as ComponentLocation } from '@/components/types';
import type { Location as BaseLocation } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response;
}

interface SearchParams {
  limit?: number;
  center_lat?: number;
  center_lon?: number;
  radius_meters?: number;
}

export async function searchLocations(
  type: SearchType,
  value: string,
  params: SearchParams = {}
): Promise<ComponentLocation[]> {
  if (!value.trim()) {
    return [];
  }

  try {
    const searchParams = new URLSearchParams();
    
    // Add limit parameter if provided
    if (params.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    
    // Add spatial parameters if provided
    if (params.center_lat !== undefined) {
      searchParams.append('center_lat', params.center_lat.toString());
    }
    if (params.center_lon !== undefined) {
      searchParams.append('center_lon', params.center_lon.toString());
    }
    if (params.radius_meters !== undefined) {
      searchParams.append('radius_meters', params.radius_meters.toString());
    }

    const response = await safeFetch(
      `${API_BASE_URL}/search/${type}/${encodeURIComponent(value)}?${searchParams.toString()}`
    );

    const data = await response.json();
    const locations = data.locations || [];

    // Filter out locations with longitude and latitude of 0
    const filteredLocations = locations.filter((location: BaseLocation) => 
      !(location.longitude === 0 && location.latitude === 0)
    );

    // Transform the API response to match our component-specific Location type
    return filteredLocations.map((location: BaseLocation & { within_geofence?: boolean; distance?: number }) => ({
      ...location,
      within_geofence: location.within_geofence ?? null,
      distance: location.distance ?? null
    }));
  } catch (error) {
    console.warn("API connection failed, falling back to mock data:", error);
    return getMockLocations(type, value, params.limit || 1000);
  }
}

// Mock data implementation
function getMockLocations(type: SearchType, value: string, limit: number): ComponentLocation[] {
  let results: ComponentLocation[] = [];
  const searchValue = value.toLowerCase().trim();

  switch (type) {
    case 'postcode':
      results = getMockPostcode(searchValue).map(loc => ({
        ...loc,
        within_geofence: null,
        distance: null,
        isMock: true
      }));
      break;
    
    case 'town':
      // Handle town searches
      for (const [town, locations] of mockTownMap.entries()) {
        if (town.toLowerCase().includes(searchValue)) {
          results.push(...locations.map(loc => ({
            ...loc,
            within_geofence: null,
            distance: null,
            isMock: true
          })));
        }
      }
      break;
    
    case 'county':
      // Handle county searches
      for (const [county, locations] of mockCountyMap.entries()) {
        if (county.toLowerCase().includes(searchValue)) {
          results.push(...locations.map(loc => ({
            ...loc,
            within_geofence: null,
            distance: null,
            isMock: true
          })));
        }
      }
      break;
  }

  return results.slice(0, limit);
}
