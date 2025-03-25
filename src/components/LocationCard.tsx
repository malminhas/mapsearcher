import React from 'react';
import { MapPin } from 'lucide-react';
import { Location } from '@/types';
import { cn } from '@/lib/utils';
import { isWithinRadius } from '@/lib/geo-utils';

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
  const isWithinGeofence = selectedLocation && isWithinRadius(
    location,
    selectedLocation,
    radiusKm
  );

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-all',
        'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        isSelected && 'bg-accent',
        isWithinGeofence && !isSelected && 'bg-green-50 dark:bg-green-950/30'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn(
          'mt-1 transition-colors',
          isSelected ? 'text-primary' : 'text-muted-foreground',
          isWithinGeofence && !isSelected && 'text-green-500'
        )}>
          <MapPin size={isSelected ? 16 : 14} className="transition-all" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className={cn(
              'font-medium',
              isSelected ? 'text-primary' : 'text-foreground',
              isWithinGeofence && !isSelected && 'text-green-600 dark:text-green-400'
            )}>
              {location.postcode}
            </h3>
            {isWithinGeofence && !isSelected && (
              <span className="text-xs text-green-500 dark:text-green-400">Within {radiusKm}km</span>
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
