import { Location } from "@/types";

// Mock data for development and testing
export const getMockPostcode = (postcode: string): Location[] => {
  return [{
    id: 1,
    postcode: postcode,
    latitude: 51.5074,
    longitude: -0.1276,
    street1: "10 Downing Street",
    street2: "",
    district1: "Westminster",
    district2: "",
    town: "London",
    county: "Greater London",
    country: "England"
  }];
};

// Create mock locations for each town
const createTownLocations = (
  town: string,
  county: string,
  basePostcode: string,
  lat: number,
  lon: number
): Location[] => {
  return Array(5).fill(null).map((_, i) => ({
    id: i + 1,
    postcode: `${basePostcode}${i + 1}AA`,
    latitude: lat + (Math.random() - 0.5) * 0.01,
    longitude: lon + (Math.random() - 0.5) * 0.01,
    street1: `${i + 1} High Street`,
    street2: "",
    district1: `${town} Central`,
    district2: "",
    town,
    county,
    country: "England"
  }));
};

export const mockTownMap = new Map<string, Location[]>([
  ["London", createTownLocations("London", "Greater London", "SW1A", 51.5074, -0.1276)],
  ["Manchester", createTownLocations("Manchester", "Greater Manchester", "M1", 53.4808, -2.2426)],
  ["Birmingham", createTownLocations("Birmingham", "West Midlands", "B1", 52.4862, -1.8904)],
  ["Leeds", createTownLocations("Leeds", "West Yorkshire", "LS1", 53.7997, -1.5492)],
  ["Glasgow", createTownLocations("Glasgow", "Glasgow City", "G1", 55.8642, -4.2518)]
]);

// Create mock locations for each county
const createCountyLocations = (
  county: string,
  basePostcode: string,
  lat: number,
  lon: number
): Location[] => {
  return Array(5).fill(null).map((_, i) => ({
    id: i + 1,
    postcode: `${basePostcode}${i + 1}AA`,
    latitude: lat + (Math.random() - 0.5) * 0.05,
    longitude: lon + (Math.random() - 0.5) * 0.05,
    street1: `${i + 1} County Road`,
    street2: "",
    district1: `${county} District`,
    district2: "",
    town: `${county} Town ${i + 1}`,
    county,
    country: "England"
  }));
};

export const mockCountyMap = new Map<string, Location[]>([
  ["Greater London", createCountyLocations("Greater London", "SW", 51.5074, -0.1276)],
  ["Greater Manchester", createCountyLocations("Greater Manchester", "M", 53.4808, -2.2426)],
  ["West Midlands", createCountyLocations("West Midlands", "B", 52.4862, -1.8904)],
  ["West Yorkshire", createCountyLocations("West Yorkshire", "LS", 53.7997, -1.5492)],
  ["Glasgow City", createCountyLocations("Glasgow City", "G", 55.8642, -4.2518)]
]); 