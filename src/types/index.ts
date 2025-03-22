
export interface Location {
  postcode: string;
  latitude: number;
  longitude: number;
  town: string;
  county: string;
}

export type SearchType = 'postcode' | 'town' | 'county';
