export type SearchType = 'postcode' | 'town' | 'county' | 'search';

export interface BaseLocation {
  // Required fields
  postcode: string;
  latitude: number;
  longitude: number;
  town: string;
  county: string;
  street1: string;
  street2: string;
  district1: string;
  district2: string;
  
  // Optional fields
  within_geofence?: boolean;
  distance?: number;
  isMock?: boolean;
}

export type Location = BaseLocation; 