import React from 'react';
import { Location } from '@/types';
import LocationCard from './LocationCard';
import { cn } from '@/lib/utils';

interface ResultListProps {
  locations: Location[];
  loading: boolean;
  error: string;
  selectedLocation: Location | null;
  onSelectLocation: (location: Location) => void;
}

const ResultList: React.FC<ResultListProps> = ({
  locations,
  loading,
  error,
  selectedLocation,
  onSelectLocation,
}) => {
  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-card rounded-xl border border-border/50 shadow-elevated">
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Search Results</h2>
        <div className="text-sm text-muted-foreground">
          {locations.length > 0 && `${locations.length} location${locations.length === 1 ? '' : 's'} found`}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
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
            {locations.length > 0 ? (
              <div className={cn("space-y-1.5", loading ? "opacity-50" : "animate-fade-in")}>
                {locations.map((location) => (
                  <LocationCard
                    key={`${location.postcode}-${location.street1}-${location.latitude}-${location.longitude}`.replace(/\s+/g, '')}
                    location={location}
                    isSelected={selectedLocation?.postcode === location.postcode}
                    onClick={() => onSelectLocation(location)}
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
