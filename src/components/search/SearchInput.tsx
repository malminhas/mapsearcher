
import React from 'react';
import { SearchType } from '@/types';
import { Search, MapPin, Building, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  type: SearchType;
  value: string;
  onChange: (value: string) => void;
  onSearch: (type: SearchType, value: string) => void;
  onFocus: (type: SearchType) => void;
  onBlur: () => void;
  activeInput: SearchType | null;
  loading: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  type,
  value,
  onChange,
  onSearch,
  onFocus,
  onBlur,
  activeInput,
  loading
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(type, value);
    }
  };

  // Determine the icon based on the search type
  const getIcon = () => {
    switch (type) {
      case 'postcode':
        return <MapPin size={18} />;
      case 'town':
        return <Building size={18} />;
      case 'county':
        return <Landmark size={18} />;
    }
  };

  // Format the label based on the search type
  const getLabel = () => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div 
      className={cn(
        "relative transition-all duration-300 rounded-lg", 
        activeInput === type ? "ring-2 ring-primary/30 shadow-sm" : ""
      )}
    >
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {getIcon()}
      </div>
      <input
        type="text"
        id={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus(type)}
        onBlur={onBlur}
        placeholder={`Enter ${type}`}
        className={cn(
          "w-full px-10 py-3 rounded-lg border bg-background transition-all",
          "focus:ring-0 focus:outline-none",
          "placeholder:text-muted-foreground/70",
          activeInput === type ? "border-primary/30" : "border-input hover:border-input/80"
        )}
        disabled={loading}
      />
      <button 
        onClick={() => onSearch(type, value)}
        disabled={!value.trim() || loading}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md",
          "text-muted-foreground hover:text-primary transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
        aria-label={`Search by ${type}`}
      >
        <Search size={18} />
      </button>
      <label 
        htmlFor={type} 
        className={cn(
          "absolute -top-2 left-2 px-1 text-xs font-medium bg-card",
          activeInput === type ? "text-primary" : "text-muted-foreground"
        )}
      >
        {getLabel()}
      </label>
    </div>
  );
};

export default SearchInput;
