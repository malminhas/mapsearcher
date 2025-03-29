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
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radiusKm, setRadiusKm] = useState(15);
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  const handleSearch = async (type: SearchType, value: string, limit: number) => {
    if (!value.trim()) return;
    
    setLoading(true);
    setError('');
    setLocations([]);
    setSelectedLocation(null);

    try {
      // Prepare search parameters
      const searchParams: any = { limit };

      // If we have a selected location, add spatial parameters
      if (selectedLocation) {
        searchParams.center_lat = selectedLocation.latitude;
        searchParams.center_lon = selectedLocation.longitude;
        searchParams.radius_meters = radiusKm * 1000; // Convert km to meters
      }

      const results = await searchLocations(type, value, searchParams);
      setLocations(results);

      // Check if we're using mock data
      if (results.length > 0 && results[0].isMock) {
        toast({
          title: 'Using Mock Data',
          description: 'The backend server is not available. Showing mock results instead.',
          variant: 'default'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      toast({
        title: 'Search Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    
    // Update the within_geofence property for all locations based on the new selection
    const updatedLocations = locations.map(loc => ({
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
    
    setLocations(updatedLocations);
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
      const updatedLocations = locations.map(loc => ({
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
      
      setLocations(updatedLocations);
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
            <SearchPanel onSearch={handleSearch} loading={loading} />
            {selectedLocation && (
              <RadiusSlider
                value={radiusKm}
                onChange={handleRadiusChange}
              />
            )}
            <div className="flex-1 min-h-0 bg-card rounded-xl border border-border/50 shadow-elevated overflow-hidden">
              <Map 
                locations={locations} 
                selectedLocation={selectedLocation}
                hoveredLocation={hoveredLocation}
                radiusKm={radiusKm}
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0 bg-card rounded-xl border border-border/50 shadow-elevated overflow-hidden">
            <ResultList 
              locations={locations} 
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
