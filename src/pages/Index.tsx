
import React, { useState } from 'react';
import Map from '@/components/Map';
import SearchPanel from '@/components/SearchPanel';
import ResultList from '@/components/ResultList';
import { Location, SearchType } from '@/types';
import { searchLocations } from '@/lib/api';

const Index = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (type: SearchType, value: string, limit?: number) => {
    if (!value.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const results = await searchLocations(type, value, limit);
      setLocations(results);
      setSelectedLocation(null);
      
      if (results.length === 0) {
        setError(`No locations found for ${type}: "${value}"`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 sm:px-6 h-screen max-h-screen overflow-hidden flex flex-col">
        <header className="mb-6">
          <h1 className="text-2xl font-medium text-foreground">Location Database Browser</h1>
          <p className="text-muted-foreground mt-1">Search and explore locations across the UK</p>
        </header>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <div className="flex flex-col space-y-4 min-h-0">
            <SearchPanel onSearch={handleSearch} loading={loading} />
            <div className="flex-1 min-h-0">
              <Map 
                locations={locations} 
                selectedLocation={selectedLocation} 
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResultList 
              locations={locations} 
              loading={loading} 
              error={error}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
