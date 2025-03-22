
import React, { useState } from 'react';
import { SearchType } from '@/types';
import { Search, MapPin, Building, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchPanelProps {
  onSearch: (type: SearchType, value: string) => void;
  loading: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, loading }) => {
  const [postcode, setPostcode] = useState('');
  const [town, setTown] = useState('');
  const [county, setCounty] = useState('');
  const [activeInput, setActiveInput] = useState<SearchType | null>(null);

  const handleInputFocus = (type: SearchType) => {
    setActiveInput(type);
  };

  const handleInputBlur = () => {
    setActiveInput(null);
  };

  const handleSearch = (type: SearchType, value: string) => {
    if (!value.trim() || loading) return;
    onSearch(type, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: SearchType, value: string) => {
    if (e.key === 'Enter') {
      handleSearch(type, value);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-elevated p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className={cn(
            "relative transition-all duration-300 rounded-lg", 
            activeInput === 'postcode' ? "ring-2 ring-primary/30 shadow-sm" : ""
          )}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <MapPin size={18} />
          </div>
          <input
            type="text"
            id="postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'postcode', postcode)}
            onFocus={() => handleInputFocus('postcode')}
            onBlur={handleInputBlur}
            placeholder="Enter postcode"
            className={cn(
              "w-full px-10 py-3 rounded-lg border bg-background transition-all",
              "focus:ring-0 focus:outline-none",
              "placeholder:text-muted-foreground/70",
              activeInput === 'postcode' ? "border-primary/30" : "border-input hover:border-input/80"
            )}
            disabled={loading}
          />
          <button 
            onClick={() => handleSearch('postcode', postcode)}
            disabled={!postcode.trim() || loading}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md",
              "text-muted-foreground hover:text-primary transition-colors",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
            aria-label="Search by postcode"
          >
            <Search size={18} />
          </button>
          <label 
            htmlFor="postcode" 
            className={cn(
              "absolute -top-2 left-2 px-1 text-xs font-medium bg-card",
              activeInput === 'postcode' ? "text-primary" : "text-muted-foreground"
            )}
          >
            Postcode
          </label>
        </div>

        <div 
          className={cn(
            "relative transition-all duration-300 rounded-lg", 
            activeInput === 'town' ? "ring-2 ring-primary/30 shadow-sm" : ""
          )}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Building size={18} />
          </div>
          <input
            type="text"
            id="town"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'town', town)}
            onFocus={() => handleInputFocus('town')}
            onBlur={handleInputBlur}
            placeholder="Enter town"
            className={cn(
              "w-full px-10 py-3 rounded-lg border bg-background transition-all",
              "focus:ring-0 focus:outline-none",
              "placeholder:text-muted-foreground/70",
              activeInput === 'town' ? "border-primary/30" : "border-input hover:border-input/80"
            )}
            disabled={loading}
          />
          <button 
            onClick={() => handleSearch('town', town)}
            disabled={!town.trim() || loading}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md",
              "text-muted-foreground hover:text-primary transition-colors",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
            aria-label="Search by town"
          >
            <Search size={18} />
          </button>
          <label 
            htmlFor="town" 
            className={cn(
              "absolute -top-2 left-2 px-1 text-xs font-medium bg-card",
              activeInput === 'town' ? "text-primary" : "text-muted-foreground"
            )}
          >
            Town
          </label>
        </div>

        <div 
          className={cn(
            "relative transition-all duration-300 rounded-lg", 
            activeInput === 'county' ? "ring-2 ring-primary/30 shadow-sm" : ""
          )}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Landmark size={18} />
          </div>
          <input
            type="text"
            id="county"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'county', county)}
            onFocus={() => handleInputFocus('county')}
            onBlur={handleInputBlur}
            placeholder="Enter county"
            className={cn(
              "w-full px-10 py-3 rounded-lg border bg-background transition-all",
              "focus:ring-0 focus:outline-none",
              "placeholder:text-muted-foreground/70",
              activeInput === 'county' ? "border-primary/30" : "border-input hover:border-input/80"
            )}
            disabled={loading}
          />
          <button 
            onClick={() => handleSearch('county', county)}
            disabled={!county.trim() || loading}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md", 
              "text-muted-foreground hover:text-primary transition-colors",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
            aria-label="Search by county"
          >
            <Search size={18} />
          </button>
          <label 
            htmlFor="county" 
            className={cn(
              "absolute -top-2 left-2 px-1 text-xs font-medium bg-card",
              activeInput === 'county' ? "text-primary" : "text-muted-foreground"
            )}
          >
            County
          </label>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
