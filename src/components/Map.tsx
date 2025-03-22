import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Location } from '@/types';

// Use environment variable for Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapProps {
  locations: Location[];
  selectedLocation?: Location | null;
}

const Map: React.FC<MapProps> = ({ locations, selectedLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showError, setShowError] = useState(!mapboxgl.accessToken);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showModal, setShowModal] = useState(!mapboxgl.accessToken || mapboxgl.accessToken === 'REPLACE_WITH_YOUR_MAPBOX_TOKEN');

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxgl.accessToken) return;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v10',
        center: [-1.1437, 52.6376], // Center of UK
        zoom: 5,
        pitch: 0,
        attributionControl: false
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
          showCompass: true
        }),
        'bottom-right'
      );

      map.current.addControl(
        new mapboxgl.AttributionControl({
          compact: true
        })
      );

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setShowError(true);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !mapLoaded || locations.length === 0) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Add new markers and update bounds
    const bounds = new mapboxgl.LngLatBounds();
    
    locations.forEach(location => {
      const marker = new mapboxgl.Marker({
        color: selectedLocation?.postcode === location.postcode ? '#3b82f6' : '#6b7280',
        scale: selectedLocation?.postcode === location.postcode ? 1 : 0.8,
      })
        .setLngLat([location.longitude, location.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: '300px' }).setHTML(`
            <div class="p-2">
              <h3 class="text-sm font-medium">${location.postcode}</h3>
              <p class="text-xs text-gray-500">
                ${[
                  location.street1,
                  location.district1,
                  location.district2,
                  location.town,
                  location.county
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          `)
        );
        
      marker.addTo(map.current!);
      markersRef.current.push(marker);
      bounds.extend([location.longitude, location.latitude]);
    });
    
    // Only fit bounds if we have multiple locations
    if (locations.length > 1) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        animate: true,
        duration: 1000,
        essential: true
      });
    }
  }, [locations, mapLoaded, selectedLocation]);

  // Handle selected location changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedLocation) return;
    
    // Fly to the selected location
    map.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 14,
      essential: true,
      duration: 1200,
      padding: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Update marker colors
    markersRef.current.forEach(marker => {
      const markerElement = marker.getElement();
      const lngLat = marker.getLngLat();
      
      if (lngLat.lng === selectedLocation.longitude && lngLat.lat === selectedLocation.latitude) {
        // Highlight selected marker
        marker.setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: '300px' }).setHTML(`
            <div class="p-2">
              <h3 class="text-sm font-medium">${selectedLocation.postcode}</h3>
              <p class="text-xs text-gray-500">
                ${[
                  selectedLocation.street1,
                  selectedLocation.district1,
                  selectedLocation.district2,
                  selectedLocation.town,
                  selectedLocation.county
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          `)
        ).togglePopup();
      }
    });
  }, [selectedLocation, mapLoaded]);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setShowModal(false);
      localStorage.setItem('mapbox_token', apiKeyInput.trim());
    }
  };

  // Try to get API key from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('mapbox_token');
    if (savedToken) {
      setApiKey(savedToken);
      setShowModal(false);
    }
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden shadow-elevated relative">
        {showError && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-medium mb-2">Map Configuration Error</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Unable to load the map. Please make sure the Mapbox API key is properly configured in your environment variables.
                Contact your administrator for assistance.
              </p>
            </div>
          </div>
        )}
        {!apiKey && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-medium mb-2">Mapbox API Key Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please enter your Mapbox API key to display the map. You can get one by signing up at <a href="https://mapbox.com" target="_blank" rel="noreferrer" className="text-primary underline">mapbox.com</a>.
              </p>
              <form onSubmit={handleApiKeySubmit}>
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Mapbox API key"
                  className="w-full px-3 py-2 border border-input rounded-md mb-3"
                />
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md w-full"
                >
                  Save and Load Map
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Map;
