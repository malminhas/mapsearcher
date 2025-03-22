import React, { useState } from 'react';
import { SearchType } from '@/types';
import { Search, MapPin, Building, Landmark, BookOpen, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface SearchPanelProps {
  onSearch: (type: SearchType, value: string, limit?: number) => void;
  loading: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, loading }) => {
  const [postcode, setPostcode] = useState('');
  const [town, setTown] = useState('');
  const [county, setCounty] = useState('');
  const [activeInput, setActiveInput] = useState<SearchType | null>(null);
  const [limit, setLimit] = useState([1000]); // Default to 1000 results

  const handleInputFocus = (type: SearchType) => {
    setActiveInput(type);
  };

  const handleInputBlur = () => {
    setActiveInput(null);
  };

  const handleSearch = (type: SearchType, value: string) => {
    if (!value.trim() || loading) return;
    onSearch(type, value, limit[0]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: SearchType, value: string) => {
    if (e.key === 'Enter') {
      handleSearch(type, value);
    }
  };

  const handleSliderChange = (newLimit: number[]) => {
    setLimit(newLimit);
  };

  const handleSliderCommit = () => {
    if (activeInput && (
      (activeInput === 'postcode' && postcode.trim()) || 
      (activeInput === 'town' && town.trim()) || 
      (activeInput === 'county' && county.trim())
    )) {
      const value = activeInput === 'postcode' ? postcode : activeInput === 'town' ? town : county;
      onSearch(activeInput, value, limit[0]);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-elevated p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <a 
            href="http://localhost:8000/redoc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="API Documentation"
          >
            <BookOpen size={16} />
          </a>
        </div>
        <div className="flex items-center space-x-2 flex-1 max-w-md mx-4">
          <SlidersHorizontal size={14} className="text-muted-foreground" />
          <Slider 
            value={limit} 
            min={1} 
            max={5000} 
            step={10}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{limit[0]} results</span>
        </div>
      </div>

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
