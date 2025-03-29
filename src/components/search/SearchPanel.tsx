import React, { useState } from 'react';
import { SearchType } from '@/types';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import SearchInput from './SearchInput';

interface SearchPanelProps {
  onSearch: (type: SearchType, value: string, limit: number) => void;
  loading?: boolean;
  onReset?: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, loading = false, onReset }) => {
  const [searchValue, setSearchValue] = useState('');
  const [limit, setLimit] = useState([1000]); // Default to 1000 results
  const [activeType, setActiveType] = useState<SearchType | null>(null);

  const detectSearchType = (value: string): SearchType => {
    // UK postcode regex patterns
    const fullPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    const partialPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?( ?[0-9])?$/i;
    
    // Clean and uppercase the input
    const cleanValue = value.trim().toUpperCase();
    
    // Check if it matches a full postcode pattern
    if (fullPostcodePattern.test(cleanValue)) {
      return 'postcode';
    }
    
    // Check if it matches a partial postcode pattern
    if (partialPostcodePattern.test(cleanValue)) {
      return 'postcode';
    }
    
    // If it's a known county name (common UK counties)
    const commonCounties = [
      'BERKSHIRE', 'BUCKINGHAMSHIRE', 'DERBYSHIRE', 'DEVON', 'DORSET',
      'ESSEX', 'GLOUCESTERSHIRE', 'HAMPSHIRE', 'KENT', 'LANCASHIRE',
      'LEICESTERSHIRE', 'LINCOLNSHIRE', 'NORFOLK', 'NORTHAMPTONSHIRE',
      'NOTTINGHAMSHIRE', 'OXFORDSHIRE', 'SOMERSET', 'SUFFOLK', 'SURREY',
      'SUSSEX', 'WARWICKSHIRE', 'WILTSHIRE', 'WORCESTERSHIRE', 'YORKSHIRE',
      'LONDON', 'GREATER LONDON', 'WEST MIDLANDS', 'GREATER MANCHESTER',
      'MERSEYSIDE', 'SOUTH YORKSHIRE', 'WEST YORKSHIRE', 'TYNE AND WEAR'
    ];
    
    if (commonCounties.includes(cleanValue)) {
      return 'county';
    }
    
    // Default to town search only if it contains valid town characters
    const townPattern = /^[A-Za-z\s\-'\.]+$/;
    if (townPattern.test(cleanValue)) {
      return 'town';
    }
    
    // If input contains numbers or special characters, treat as postcode
    return 'postcode';
  };

  const handleSearch = async () => {
    if (!searchValue.trim() || loading) return;
    
    // Reset any existing search state first
    if (onReset) {
      onReset();
    }
    
    const searchType = detectSearchType(searchValue);
    setActiveType(searchType);
    onSearch(searchType, searchValue, limit[0]);
  };

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      setActiveType(detectSearchType(value));
    } else {
      setActiveType(null);
    }
  };

  const handleSliderChange = (newLimit: number[]) => {
    setLimit(newLimit);
  };

  const handleSliderCommit = () => {
    if (searchValue.trim()) {
      handleSearch();
    }
  };

  const getSearchTypeLabel = () => {
    if (!searchValue.trim()) return 'Search Location';
    if (!activeType) return 'Search Location';
    return `Search ${activeType.charAt(0).toUpperCase() + activeType.slice(1)}`;
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-elevated p-4">
      <SearchPanelHeader 
        limit={limit}
        onSliderChange={handleSliderChange}
        onSliderCommit={handleSliderCommit}
      />

      <div className="mt-4">
        <SearchInput
          type="search"
          value={searchValue}
          onChange={handleInputChange}
          onSearch={handleSearch}
          loading={loading}
          label={getSearchTypeLabel()}
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
    <div className="flex justify-between items-center">
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
