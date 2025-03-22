
import { Location, SearchType } from "@/types";
import { toast } from "@/components/ui/use-toast";

const API_BASE_URL = "http://localhost:8000";

export async function searchLocations(type: SearchType, value: string): Promise<Location[]> {
  if (!value.trim()) {
    return [];
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/search/${type}/${encodeURIComponent(value)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.locations || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    toast({
      title: "Search Failed",
      description: message,
      variant: "destructive",
    });
    throw error;
  }
}
