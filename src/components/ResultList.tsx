import React, { useMemo, useEffect, useRef } from 'react';
import type { Location } from './types';
import LocationCard from './LocationCard';
import { cn } from '@/lib/utils';

interface ResultListProps {
  locations: Location[];
  loading: boolean;
  error: string;
  selectedLocation: Location | null;
  onSelectLocation: (location: Location) => void;
  onHoverLocation: (location: Location | null) => void;
  radiusKm?: number;
}

const ResultList: React.FC<ResultListProps> = ({
  locations,
  loading,
  error,
  selectedLocation,
  onSelectLocation,
  onHoverLocation,
  radiusKm = 15
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when selected location changes
  useEffect(() => {
    if (selectedLocation && listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedLocation]);

  // Memoize the sorted locations
  const sortedLocations = useMemo(() => {
    // Always sort alphabetically first
    const alphabeticallySorted = [...locations].sort((a, b) => 
      a.postcode.localeCompare(b.postcode)
    );

    if (!selectedLocation) return alphabeticallySorted;

    // When there's a selected location, sort into three groups:
    // 1. Selected location
    // 2. Locations within geofence (alphabetically)
    // 3. Locations outside geofence (alphabetically)
    return alphabeticallySorted.sort((a, b) => {
      // Selected location always comes first
      const isASelected = a.postcode === selectedLocation.postcode && 
                         a.latitude === selectedLocation.latitude && 
                         a.longitude === selectedLocation.longitude;
      const isBSelected = b.postcode === selectedLocation.postcode && 
                         b.latitude === selectedLocation.latitude && 
                         b.longitude === selectedLocation.longitude;
      
      if (isASelected) return -1;
      if (isBSelected) return 1;

      // Then sort by within geofence status
      const aWithin = a.within_geofence === true;
      const bWithin = b.within_geofence === true;
      if (aWithin !== bWithin) {
        return aWithin ? -1 : 1;
      }

      // Both locations are in the same group (either both within or both outside geofence)
      // They're already sorted alphabetically from the initial sort
      return 0;
    });
  }, [locations, selectedLocation]);

  // Count locations within geofence
  const locationsWithinGeofence = useMemo(() => {
    if (!selectedLocation) return 0;
    return locations.filter(location => location.within_geofence === true).length;
  }, [locations, selectedLocation]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Search Results</h2>
        {selectedLocation && locations.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {locationsWithinGeofence} locations found within {radiusKm}km of {selectedLocation.postcode}
          </p>
        )}
        {!selectedLocation && locations.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {locations.length} locations found
          </p>
        )}
      </div>

      <div ref={listContainerRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="text-destructive text-center">{error}</div>
          </div>
        ) : locations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <p className="text-muted-foreground">No results found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try searching for a location</p>
          </div>
        ) : (
          <div className="relative p-2">
            <div 
              className="relative"
              style={{ 
                height: `${sortedLocations.length * (100 + 4)}px`
              }}
            >
              {sortedLocations.map((location, index) => (
                <div
                  key={`${location.postcode}-${location.latitude}-${location.longitude}-${location.street1}-${index}`}
                  className="transition-all duration-300 ease-in-out absolute left-0 right-0"
                  style={{
                    transform: `translateY(${index * (100 + 4)}px)`
                  }}
                  onMouseEnter={() => onHoverLocation(location)}
                  onMouseLeave={() => onHoverLocation(null)}
                >
                  <LocationCard
                    location={location}
                    isSelected={selectedLocation && 
                      location.postcode === selectedLocation.postcode &&
                      location.latitude === selectedLocation.latitude &&
                      location.longitude === selectedLocation.longitude}
                    onClick={() => onSelectLocation(location)}
                    selectedLocation={selectedLocation}
                    radiusKm={radiusKm}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultList;
