import React from 'react';
import { MapPin } from 'lucide-react';
import type { Location } from './types';
import { cn } from '@/lib/utils';

interface LocationCardProps {
  location: Location;
  isSelected: boolean;
  onClick: () => void;
  selectedLocation?: Location | null;
  radiusKm?: number;
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  isSelected,
  onClick,
  selectedLocation,
  radiusKm = 15
}) => {
  const isWithinGeofence = location.within_geofence === true;
  
  // Ensure selection state is accurate by comparing all relevant fields
  const isActuallySelected = isSelected && selectedLocation && 
    location.postcode === selectedLocation.postcode &&
    location.latitude === selectedLocation.latitude &&
    location.longitude === selectedLocation.longitude;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-all',
        'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        isActuallySelected && 'bg-accent',
        isWithinGeofence && !isActuallySelected && 'bg-green-50 dark:bg-green-950/30'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn(
          'mt-1 transition-colors',
          isActuallySelected ? 'text-primary' : 'text-muted-foreground',
          isWithinGeofence && !isActuallySelected && 'text-green-500'
        )}>
          <MapPin size={isActuallySelected ? 16 : 14} className="transition-all" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className={cn(
                'font-medium',
                isActuallySelected ? 'text-primary' : 'text-foreground',
                isWithinGeofence && !isActuallySelected && 'text-green-600 dark:text-green-400'
              )}>
                {location.postcode}
              </h3>
              {isWithinGeofence && !isActuallySelected && location.distance !== null && (
                <span className="text-xs text-green-500 dark:text-green-400">
                  {(location.distance / 1000).toFixed(1)}km
                </span>
              )}
            </div>
            {location.isMock && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1.5 py-0.5 rounded">
                MOCK
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {location.street1}
            {location.street2 && `, ${location.street2}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {location.district1 && `${location.district1}`}
            {location.district1 && location.district2 && ' · '}
            {location.district2 && `${location.district2}`}
            {(location.district1 || location.district2) && location.town && ' · '}
            {location.town}
            {location.town && location.county && ' · '}
            {location.county}
          </p>
        </div>
      </div>
    </button>
  );
};

export default LocationCard;
