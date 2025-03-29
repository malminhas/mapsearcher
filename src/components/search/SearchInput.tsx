import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchType } from '@/types';

interface SearchInputProps {
  type: SearchType;
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  label?: string;
}

const SearchInput = ({ type, value, onChange, onSearch, loading = false, label = 'Location' }: SearchInputProps) => {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          className={cn(
            "block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10",
            "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
            "placeholder:text-gray-400"
          )}
          placeholder="Enter location..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearch();
            }
          }}
        />
        <button
          onClick={onSearch}
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          disabled={loading}
        >
          <Search className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default SearchInput;
