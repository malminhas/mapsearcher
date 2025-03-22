
import React from 'react';
import { Location } from '@/types';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface LocationCardProps {
  location: Location;
  isSelected: boolean;
  onClick: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, isSelected, onClick }) => {
  return (
    <div 
      className={cn(
        "border rounded-lg p-2 transition-all duration-300 cursor-pointer transform-gpu",
        "hover:shadow-elevated hover:-translate-y-0.5",
        "border-border/50 group",
        isSelected ? "ring-2 ring-primary/30 bg-primary/5" : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {location.postcode}
            </h3>
            <div className="text-sm text-muted-foreground flex items-center">
              <span>{location.town || '-'}</span>
              {location.town && location.county && <span className="mx-1">·</span>}
              <span>{location.county || '-'}</span>
            </div>
            <div className="text-xs text-muted-foreground/70 ml-auto">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </div>
          </div>
        </div>
        <div className="ml-2 text-primary/70 group-hover:text-primary transition-colors flex items-center justify-center">
          <MapPin size={isSelected ? 16 : 14} className="transition-all" />
        </div>
      </div>
    </div>
  );
};

export default LocationCard;
