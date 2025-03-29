import type { Location as BaseLocation } from '@/types';

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
  // Optional fields
  within_geofence?: boolean | null;
  distance?: number | null;
  isMock?: boolean;
}

export type { BaseLocation }; 