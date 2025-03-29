export type SearchType = 'postcode' | 'town' | 'county';

export interface Location {
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
} 