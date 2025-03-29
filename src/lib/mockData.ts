import type { Location as ComponentLocation } from "@/components/types";

// Mock data for development and testing
export const getMockPostcode = (postcode: string): ComponentLocation[] => {
  return [{
    postcode: postcode,
    latitude: 51.5074,
    longitude: -0.1276,
    street1: "10 Downing Street",
    street2: "",
    district1: "Westminster",
    district2: "",
    town: "London",
    county: "Greater London",
    within_geofence: null,
    distance: null,
    isMock: true
  }];
};

// Create mock locations for each town
const createTownLocations = (
  town: string,
  county: string,
  basePostcode: string,
  lat: number,
  lon: number
): ComponentLocation[] => {
  return Array(5).fill(null).map((_, i) => ({
    postcode: `${basePostcode}${i + 1}AA`,
    latitude: lat + (Math.random() - 0.5) * 0.01,
    longitude: lon + (Math.random() - 0.5) * 0.01,
    street1: `${i + 1} High Street`,
    street2: "",
    district1: `${town} Central`,
    district2: "",
    town,
    county,
    within_geofence: null,
    distance: null,
    isMock: true
  }));
};

export const mockTownMap = new Map<string, ComponentLocation[]>([
  ["London", createTownLocations("London", "Greater London", "SW1A", 51.5074, -0.1276)],
  ["Manchester", createTownLocations("Manchester", "Greater Manchester", "M1", 53.4808, -2.2426)],
  ["Birmingham", createTownLocations("Birmingham", "West Midlands", "B1", 52.4862, -1.8904)],
  ["Leeds", createTownLocations("Leeds", "West Yorkshire", "LS1", 53.7997, -1.5492)],
  ["Glasgow", createTownLocations("Glasgow", "Glasgow City", "G1", 55.8642, -4.2518)],
  ["Twyford", createTownLocations("Twyford", "Berkshire", "RG10", 51.4757, -0.8606)],
  ["Reading", createTownLocations("Reading", "Berkshire", "RG1", 51.4543, -0.9781)],
  ["Wokingham", createTownLocations("Wokingham", "Berkshire", "RG40", 51.4112, -0.8357)],
  ["Maidenhead", createTownLocations("Maidenhead", "Berkshire", "SL6", 51.5225, -0.7222)],
  ["Newbury", createTownLocations("Newbury", "Berkshire", "RG14", 51.4038, -1.3213)]
]);

// Create mock locations for each county
const createCountyLocations = (
  county: string,
  basePostcode: string,
  lat: number,
  lon: number
): ComponentLocation[] => {
  return Array(5).fill(null).map((_, i) => ({
    postcode: `${basePostcode}${i + 1}AA`,
    latitude: lat + (Math.random() - 0.5) * 0.05,
    longitude: lon + (Math.random() - 0.5) * 0.05,
    street1: `${i + 1} County Road`,
    street2: "",
    district1: `${county} District`,
    district2: "",
    town: `${county} Town ${i + 1}`,
    county,
    within_geofence: null,
    distance: null,
    isMock: true
  }));
};

export const mockCountyMap = new Map<string, ComponentLocation[]>([
  ["Greater London", createCountyLocations("Greater London", "SW", 51.5074, -0.1276)],
  ["Greater Manchester", createCountyLocations("Greater Manchester", "M", 53.4808, -2.2426)],
  ["West Midlands", createCountyLocations("West Midlands", "B", 52.4862, -1.8904)],
  ["West Yorkshire", createCountyLocations("West Yorkshire", "LS", 53.7997, -1.5492)],
  ["Glasgow City", createCountyLocations("Glasgow City", "G", 55.8642, -4.2518)],
  ["Berkshire", createCountyLocations("Berkshire", "RG", 51.4543, -0.9781)]
]); 