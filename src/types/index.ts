export interface Location {
  postcode: string;
  latitude: number;
  longitude: number;
  town: string;
  county: string;
  street1: string;
  district1: string;
  district2: string;
}

export type SearchType = 'postcode' | 'town' | 'county';
