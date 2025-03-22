
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
        "border rounded-xl p-4 transition-all duration-300 cursor-pointer transform-gpu",
        "hover:shadow-elevated hover:-translate-y-1",
        "border-border/50 group",
        isSelected ? "ring-2 ring-primary/30 bg-primary/5" : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {location.postcode}
          </h3>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            <div className="transition-all">{location.town || '-'}</div>
            <div className="transition-all">{location.county || '-'}</div>
          </div>
        </div>
        <div className="ml-3 text-primary/70 group-hover:text-primary transition-colors flex items-center justify-center">
          <MapPin size={isSelected ? 18 : 16} className="transition-all" />
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground/70 flex items-center">
        <span className="inline-block">{location.latitude.toFixed(4)},</span>
        <span className="inline-block ml-1">{location.longitude.toFixed(4)}</span>
      </div>
    </div>
  );
};

export default LocationCard;
