import React, { useCallback, useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal } from 'lucide-react';

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const RadiusSlider: React.FC<RadiusSliderProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange handler
  const handleChange = useCallback(([newValue]: number[]) => {
    setLocalValue(newValue);
  }, []);

  // Format the display value to show decimals only when needed
  const formatDistance = (km: number) => {
    return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(2)}km`;
  };

  // Debounced commit handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border/50">
      <SlidersHorizontal size={14} className="text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">Geofence Radius</span>
          <span className="text-sm font-medium">{formatDistance(localValue)}</span>
        </div>
        <Slider
          value={[localValue]}
          onValueChange={handleChange}
          min={0}
          max={30}
          step={0.25}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default RadiusSlider; 