import React, { useMemo, useEffect, useRef } from 'react';
import { Location } from '@/types';
import LocationCard from './LocationCard';
import { cn } from '@/lib/utils';
import { isWithinRadius } from '@/lib/geo-utils';

interface ResultListProps {
  locations: Location[];
  loading: boolean;
  error: string;
  selectedLocation: Location | null;
  onSelectLocation: (location: Location) => void;
  radiusKm?: number;
}

const ResultList: React.FC<ResultListProps> = ({
  locations,
  loading,
  error,
  selectedLocation,
  onSelectLocation,
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
    if (!selectedLocation) return locations;

    // Create a map of locations to their geofence status
    const locationStatus = new Map(
      locations.map(location => [
        location,
        isWithinRadius(location, selectedLocation, radiusKm)
      ])
    );

    // Sort locations: selected first, then within geofence, then by postcode
    return [...locations].sort((a, b) => {
      // Selected location always comes first
      if (a.postcode === selectedLocation.postcode) return -1;
      if (b.postcode === selectedLocation.postcode) return 1;

      // Then sort by within geofence status
      const aWithin = locationStatus.get(a)!;
      const bWithin = locationStatus.get(b)!;
      
      if (aWithin !== bWithin) {
        return aWithin ? -1 : 1;
      }
      
      // Finally sort by postcode
      return a.postcode.localeCompare(b.postcode);
    });
  }, [locations, selectedLocation, radiusKm]);

  // Count locations within geofence
  const locationsWithinGeofence = useMemo(() => {
    if (!selectedLocation) return 0;
    return locations.filter(location => 
      isWithinRadius(location, selectedLocation, radiusKm)
    ).length;
  }, [locations, selectedLocation, radiusKm]);

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-card rounded-xl border border-border/50 shadow-elevated">
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Search Results</h2>
        <div className="text-sm text-muted-foreground">
          {locations.length > 0 && (
            <>
              {locationsWithinGeofence} within {radiusKm}km
              {locationsWithinGeofence !== locations.length && ` of ${locations.length} total`}
            </>
          )}
        </div>
      </div>
      
      <div ref={listContainerRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {error && (
          <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32 animate-fade-in">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary/40 loading-dot"></div>
              <div className="w-3 h-3 rounded-full bg-primary/40 loading-dot"></div>
              <div className="w-3 h-3 rounded-full bg-primary/40 loading-dot"></div>
            </div>
          </div>
        ) : (
          <>
            {sortedLocations.length > 0 ? (
              <div className={cn("space-y-1.5", loading ? "opacity-50" : "animate-fade-in")}>
                {sortedLocations.map((location, index) => (
                  <LocationCard
                    key={`${location.postcode}-${index}`}
                    location={location}
                    isSelected={selectedLocation?.postcode === location.postcode}
                    onClick={() => onSelectLocation(location)}
                    selectedLocation={selectedLocation}
                    radiusKm={radiusKm}
                  />
                ))}
              </div>
            ) : (
              !loading && !error && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground animate-fade-in">
                  <p className="text-center">No results found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Try searching for a location</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultList;
