import React, { useState } from 'react';
import { SearchType } from '@/types';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import SearchInput from './SearchInput';

interface SearchPanelProps {
  onSearch: (type: SearchType, value: string, limit: number) => void;
  loading?: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, loading = false }) => {
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
      <SearchPanelHeader 
        limit={limit}
        onSliderChange={handleSliderChange}
        onSliderCommit={handleSliderCommit}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SearchInput
          type="postcode"
          value={postcode}
          onChange={setPostcode}
          onSearch={handleSearch}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          activeInput={activeInput}
          loading={loading}
        />
        
        <SearchInput
          type="town"
          value={town}
          onChange={setTown}
          onSearch={handleSearch}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          activeInput={activeInput}
          loading={loading}
        />
        
        <SearchInput
          type="county"
          value={county}
          onChange={setCounty}
          onSearch={handleSearch}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          activeInput={activeInput}
          loading={loading}
        />
      </div>
    </div>
  );
};

interface SearchPanelHeaderProps {
  limit: number[];
  onSliderChange: (value: number[]) => void;
  onSliderCommit: () => void;
}

const SearchPanelHeader: React.FC<SearchPanelHeaderProps> = ({ limit, onSliderChange, onSliderCommit }) => {
  return (
    <div className="flex justify-between items-center mb-4">
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
          min={100} 
          max={5000} 
          step={100}
          onValueChange={onSliderChange}
          onValueCommit={onSliderCommit}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">{limit[0]} results</span>
      </div>
    </div>
  );
};

export default SearchPanel;
