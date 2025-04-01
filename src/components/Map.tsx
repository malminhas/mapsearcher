import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Location } from './types';

// Use environment variable for Mapbox token if available
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const DEFAULT_RADIUS_KM = 15;
const GEOFENCE_SOURCE_ID = 'geofence-source';
const GEOFENCE_LAYER_ID = 'geofence-layer';

interface MapProps {
  locations: Location[];
  selectedLocation: Location | null;
  hoveredLocation: Location | null;
  radiusKm?: number;
}

const Map: React.FC<MapProps> = ({ locations, selectedLocation, hoveredLocation, radiusKm = DEFAULT_RADIUS_KM }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showError, setShowError] = useState(!mapboxgl.accessToken);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKey, setApiKey] = useState(mapboxgl.accessToken);
  const [showModal, setShowModal] = useState(!mapboxgl.accessToken || mapboxgl.accessToken === 'REPLACE_WITH_YOUR_MAPBOX_TOKEN');

  // Add validation helper function at the top of the file after the interfaces
  const isValidCoordinate = (lat: number, lon: number): boolean => {
    return (
      typeof lat === 'number' && 
      typeof lon === 'number' && 
      !isNaN(lat) && 
      !isNaN(lon) && 
      lat >= -90 && 
      lat <= 90 && 
      lon >= -180 && 
      lon <= 180
    );
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !apiKey) return;
    
    try {
      mapboxgl.accessToken = apiKey;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        // style: 'mapbox://styles/mapbox/lighht-v10', // light-v10
        style: 'mapbox://styles/mapbox/streets-v12',
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
        // Add empty geofence source and layer
        map.current?.addSource(GEOFENCE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            },
            properties: {}
          }
        });

        map.current?.addLayer({
          id: GEOFENCE_LAYER_ID,
          type: 'fill',
          source: GEOFENCE_SOURCE_ID,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.15,
            'fill-outline-color': '#3b82f6'
          }
        });

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
  }, [apiKey]);

  // Memoize the geofence check function
  const isWithinGeofence = React.useCallback((location: Location) => {
    return location.within_geofence === true;
  }, []);

  // Update markers when locations or radius changes
  useEffect(() => {
    if (!map.current || !mapLoaded || locations.length === 0) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Add new markers and update bounds
    const bounds = new mapboxgl.LngLatBounds();
    
    locations.forEach(location => {
      // Validate coordinates before using them
      if (!isValidCoordinate(location.latitude, location.longitude)) {
        console.warn(`Invalid coordinates for location: ${location.postcode}`, {
          latitude: location.latitude,
          longitude: location.longitude
        });
        return; // Skip this location
      }

      // Check if location is within the geofence
      const isWithin = location.within_geofence === true;
      const isSelected = selectedLocation?.postcode === location.postcode;
      
      // Format street address
      const streetAddress = location.street1 + (location.street2 ? `, ${location.street2}` : '');
      
      // Create popup with location info
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        maxWidth: '300px',
        className: 'location-popup'
      }).setHTML(`
        <div class="p-2">
          <h3 class="text-sm font-medium">${location.postcode}</h3>
          <p class="text-xs text-gray-500 mb-1">${streetAddress}</p>
          <p class="text-xs text-gray-500">
            ${location.district1 ? `${location.district1}` : ''}
            ${location.district1 && location.district2 ? ' · ' : ''}
            ${location.district2 ? `${location.district2}` : ''}
            ${(location.district1 || location.district2) && location.town ? ' · ' : ''}
            ${location.town}
            ${location.town && location.county ? ' · ' : ''}
            ${location.county}
          </p>
          ${location.distance !== null ? `
            <p class="text-xs text-green-500 mt-1">
              ${(location.distance / 1000).toFixed(1)}km away
            </p>
          ` : ''}
        </div>
      `);

      let marker = new mapboxgl.Marker({
        color: isSelected ? '#3b82f6' : isWithin ? '#22c55e' : '#6b7280',
        scale: isSelected ? 1 : 0.8,
      })
        .setLngLat([location.longitude, location.latitude]);

      // Update marker color when location is hovered in the list
      if (!isSelected && hoveredLocation && 
          location.postcode === hoveredLocation.postcode && 
          location.latitude === hoveredLocation.latitude && 
          location.longitude === hoveredLocation.longitude) {
        marker.remove();
        marker = new mapboxgl.Marker({
          color: '#3b82f6',
          scale: 1
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current!);
      }

      const markerElement = marker.getElement();
      
      markerElement.addEventListener('mouseenter', () => {
        marker.setPopup(popup);
        popup.addTo(map.current!);
      });
      
      markerElement.addEventListener('mouseleave', () => {
        popup.remove();
      });
        
      marker.addTo(map.current!);
      markersRef.current.push(marker);
      bounds.extend([location.longitude, location.latitude]);
    });
    
    // Only fit bounds if we have multiple locations and no selected location
    if (markersRef.current.length > 1 && !selectedLocation) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        animate: true,
        duration: 1000,
        essential: true
      });
    }
  }, [locations, mapLoaded, selectedLocation, hoveredLocation, radiusKm]);

  // Calculate zoom level based on radius and viewport
  const calculateZoomForRadius = useCallback(() => {
    if (!map.current || !selectedLocation) return;

    const container = map.current.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Calculate the diagonal of the viewport in pixels
    const viewportDiagonal = Math.sqrt(width * width + height * height);
    
    // Convert radius from kilometers to meters
    const radiusMeters = radiusKm * 1000;
    
    // Calculate the meters per pixel at the current latitude
    const metersPerPixel = 156543.03392 * Math.cos(selectedLocation.latitude * Math.PI / 180);
    
    // Calculate the target zoom level
    // Multiply radiusMeters by 4 to show more context around the circle
    const targetZoom = Math.log2(viewportDiagonal * metersPerPixel / (radiusMeters * 4));
    
    // Subtract 1 zoom level to zoom out more
    return Math.min(targetZoom - 1, 15);
  }, [selectedLocation, radiusKm]);

  // Handle selected location changes and update geofence
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Remove any existing popups when selection changes
    const popups = document.getElementsByClassName('mapboxgl-popup');
    while (popups[0]) {
      popups[0].remove();
    }
    
    if (selectedLocation) {
      // Generate circle points using great circle distance
      const points: [number, number][] = [];
      const EARTH_RADIUS = 6371; // Earth's radius in kilometers
      const STEPS = 128; // More points for smoother circle
      
      for (let i = 0; i < STEPS; i++) {
        const bearing = (i * 360) / STEPS;
        const bearingRad = bearing * Math.PI / 180;
        const centerLat = selectedLocation.latitude * Math.PI / 180;
        const centerLon = selectedLocation.longitude * Math.PI / 180;
        const angularDistance = radiusKm / EARTH_RADIUS;

        // Calculate point using spherical law of cosines
        const lat2 = Math.asin(
          Math.sin(centerLat) * Math.cos(angularDistance) +
          Math.cos(centerLat) * Math.sin(angularDistance) * Math.cos(bearingRad)
        );
        
        const lon2 = centerLon + Math.atan2(
          Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(centerLat),
          Math.cos(angularDistance) - Math.sin(centerLat) * Math.sin(lat2)
        );

        points.push([lon2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
      }
      // Close the circle
      points.push(points[0]);

      // Update geofence source with the calculated circle
      const source = map.current.getSource(GEOFENCE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [points]
        },
        properties: {}
      });

      // Calculate and set the appropriate zoom level
      const targetZoom = calculateZoomForRadius();
      
      // Fly to the selected location with the calculated zoom
      map.current.flyTo({
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: targetZoom,
        essential: true,
        duration: 1200,
        padding: { top: 50, bottom: 50, left: 50, right: 50 }
      });
    } else {
      // Clear geofence when no location is selected
      const source = map.current.getSource(GEOFENCE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[]]
        },
        properties: {}
      });
    }
  }, [selectedLocation, mapLoaded, radiusKm, calculateZoomForRadius]);

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
      mapboxgl.accessToken = savedToken;
      setShowModal(false);
    }
  }, []);

  return (
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
  );
};

export default Map;
