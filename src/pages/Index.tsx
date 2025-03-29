import React, { useState } from 'react';
import Map from '@/components/Map';
import { SearchPanel } from '@/components/search';
import ResultList from '@/components/ResultList';
import { SearchType } from '@/types';
import type { Location } from '@/components/types';
import { searchLocations } from '@/lib/api';
import RadiusSlider from '@/components/RadiusSlider';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [results, setResults] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  const handleReset = () => {
    setResults([]);
    setSelectedLocation(null);
    setError(null);
  };

  const handleSearch = async (type: SearchType, value: string, limit: number) => {
    setLoading(true);
    setError(null);
    
    // Always reset state for a new search
    setSelectedLocation(null);
    setResults([]);
    
    try {
      // For a new search, don't include any spatial parameters
      const searchParams = { limit };
      
      const searchResults = await searchLocations(type, value, searchParams);
      setResults(searchResults);
      
      // If we got mock results, show a notification
      if (searchResults.length > 0 && searchResults[0].isMock) {
        toast({
          title: "Using mock data",
          description: "The backend server is unavailable. Showing mock results instead.",
          variant: "default"
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    
    // Update the within_geofence property for all locations based on the new selection
    const updatedLocations = results.map(loc => ({
      ...loc,
      within_geofence: calculateIsWithinGeofence(
        loc.latitude,
        loc.longitude,
        location.latitude,
        location.longitude,
        radiusKm
      ),
      distance: calculateDistance(
        loc.latitude,
        loc.longitude,
        location.latitude,
        location.longitude
      )
    }));
    
    setResults(updatedLocations);
  };

  // Separate function for spatial search after selecting a location
  const handleSpatialSearch = async () => {
    if (!selectedLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = {
        limit: 1000, // Use max limit for spatial searches
        center_lat: selectedLocation.latitude,
        center_lon: selectedLocation.longitude,
        radius_meters: radiusKm * 1000
      };
      
      // Use the selected location's most specific field for the search
      const searchValue = selectedLocation.postcode || selectedLocation.town || selectedLocation.county;
      const searchType = selectedLocation.postcode ? 'postcode' : 
                        selectedLocation.town ? 'town' : 'county';
      
      const searchResults = await searchLocations(searchType, searchValue, searchParams);
      
      // Merge new results with existing ones, removing duplicates
      const mergedResults = [...results];
      searchResults.forEach(newLoc => {
        if (!mergedResults.some(existingLoc => existingLoc.postcode === newLoc.postcode)) {
          mergedResults.push({
            ...newLoc,
            within_geofence: calculateIsWithinGeofence(
              newLoc.latitude,
              newLoc.longitude,
              selectedLocation.latitude,
              selectedLocation.longitude,
              radiusKm
            ),
            distance: calculateDistance(
              newLoc.latitude,
              newLoc.longitude,
              selectedLocation.latitude,
              selectedLocation.longitude
            )
          });
        }
      });
      
      setResults(mergedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during spatial search');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate if a point is within the geofence
  const calculateIsWithinGeofence = (
    lat1: number,
    lon1: number,
    centerLat: number,
    centerLon: number,
    radiusKm: number
  ): boolean => {
    const distance = calculateDistance(lat1, lon1, centerLat, centerLon);
    return distance <= radiusKm * 1000; // Convert km to meters for comparison
  };

  // Helper function to calculate distance between two points using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    
    // If we have a selected location, update the geofence calculations
    if (selectedLocation) {
      const updatedLocations = results.map(loc => ({
        ...loc,
        within_geofence: calculateIsWithinGeofence(
          loc.latitude,
          loc.longitude,
          selectedLocation.latitude,
          selectedLocation.longitude,
          newRadius
        ),
        distance: calculateDistance(
          loc.latitude,
          loc.longitude,
          selectedLocation.latitude,
          selectedLocation.longitude
        )
      }));
      
      setResults(updatedLocations);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 sm:px-6 h-screen max-h-screen overflow-hidden flex flex-col">
        <header className="mb-6">
          <h1 className="text-2xl font-medium text-foreground">Location Database Browser</h1>
          <p className="text-muted-foreground mt-1">Search and explore locations across the UK</p>
        </header>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <div className="flex flex-col space-y-4 min-h-0">
            <SearchPanel 
              onSearch={handleSearch} 
              loading={loading}
              onReset={handleReset}
            />
            {selectedLocation && (
              <RadiusSlider
                value={radiusKm}
                onChange={handleRadiusChange}
              />
            )}
            <div className="flex-1 min-h-0 bg-card rounded-xl border border-border/50 shadow-elevated overflow-hidden">
              <Map 
                locations={results} 
                selectedLocation={selectedLocation}
                hoveredLocation={hoveredLocation}
                radiusKm={radiusKm}
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0 bg-card rounded-xl border border-border/50 shadow-elevated overflow-hidden">
            <ResultList 
              locations={results} 
              loading={loading} 
              error={error}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              onHoverLocation={setHoveredLocation}
              radiusKm={radiusKm}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
