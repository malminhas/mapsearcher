
export type SearchType = 'postcode' | 'town' | 'county';

export interface Location {
  id: number;
  postcode: string;
  latitude: number;
  longitude: number;
  street1: string;
  street2: string;
  district1: string; // E.g. Clarendon Park
  district2: string; // E.g. Knighton
  town: string;      // E.g. Leicester
  county: string;    // E.g. Leicestershire
  country: string;   // E.g. England
}
