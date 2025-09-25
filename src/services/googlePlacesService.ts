import { z } from 'zod';

// Google Places API Types
export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  photos?: GooglePlacePhoto[];
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  price_level?: 0 | 1 | 2 | 3 | 4;
}

export interface GooglePlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

export interface GooglePlacesSearchParams {
  query?: string;
  location?: string; // "lat,lng"
  radius?: number; // meters
  type?: string;
  language?: string;
  region?: string;
}

export interface GooglePlacesSearchResult {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

// Validation schemas
const GooglePlaceSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  formatted_address: z.string(),
  geometry: z.object({
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  formatted_phone_number: z.string().optional(),
  website: z.string().optional(),
  rating: z.number().optional(),
  user_ratings_total: z.number().optional(),
  types: z.array(z.string()),
  photos: z.array(z.object({
    photo_reference: z.string(),
    height: z.number(),
    width: z.number(),
    html_attributions: z.array(z.string()),
  })).optional(),
  business_status: z.enum(['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY']).optional(),
  opening_hours: z.object({
    open_now: z.boolean().optional(),
    weekday_text: z.array(z.string()).optional(),
  }).optional(),
  price_level: z.number().min(0).max(4).optional(),
});

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private rateLimitDelay = 100; // ms between requests
  private lastRequestTime = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for places using Google Places API
   */
  async searchPlaces(params: GooglePlacesSearchParams): Promise<GooglePlace[]> {
    await this.rateLimit();
    
    const searchParams = new URLSearchParams({
      key: this.apiKey,
      ...(params.query && { query: params.query }),
      ...(params.location && { location: params.location }),
      ...(params.radius && { radius: params.radius.toString() }),
      ...(params.type && { type: params.type }),
      language: params.language || 'tr',
      region: params.region || 'tr',
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/textsearch/json?${searchParams}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data: GooglePlacesSearchResult = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      // Validate results
      const validatedResults = data.results.map(place => {
        const result = GooglePlaceSchema.safeParse(place);
        if (!result.success) {
          console.warn('Invalid Google Place data:', result.error);
          return null;
        }
        return result.data;
      }).filter(Boolean) as GooglePlace[];

      return validatedResults;
    } catch (error) {
      console.error('Google Places search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed place information by place_id
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    await this.rateLimit();

    const searchParams = new URLSearchParams({
      place_id: placeId,
      key: this.apiKey,
      fields: 'place_id,name,formatted_address,geometry,formatted_phone_number,website,rating,user_ratings_total,types,photos,business_status,opening_hours,price_level',
      language: 'tr',
      region: 'tr',
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/details/json?${searchParams}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const result = GooglePlaceSchema.safeParse(data.result);
      if (!result.success) {
        console.warn('Invalid Google Place details:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Google Places details error:', error);
      throw error;
    }
  }

  /**
   * Search for beauty-related businesses in Turkey
   */
  async searchBeautyBusinesses(
    location: { lat: number; lng: number },
    radius: number = 50000 // 50km default
  ): Promise<GooglePlace[]> {
    const beautyTypes = [
      'beauty_salon',
      'hair_care',
      'spa',
      'barber',
      'nail_salon'
    ];

    const allResults: GooglePlace[] = [];

    for (const type of beautyTypes) {
      try {
        const results = await this.searchPlaces({
          location: `${location.lat},${location.lng}`,
          radius,
          type,
          language: 'tr',
          region: 'tr',
        });

        allResults.push(...results);
        
        // Small delay between different type searches
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error searching for ${type}:`, error);
      }
    }

    // Remove duplicates based on place_id
    const uniqueResults = allResults.filter((place, index, self) => 
      index === self.findIndex(p => p.place_id === place.place_id)
    );

    return uniqueResults;
  }

  /**
   * Get photo URL from photo reference
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }

  /**
   * Check if place is a beauty-related business
   */
  isBeautyBusiness(types: string[]): boolean {
    const beautyTypes = [
      'beauty_salon',
      'hair_care',
      'spa',
      'barber',
      'nail_salon',
      'hair_salon',
      'barber_shop'
    ];

    return types.some(type => beautyTypes.includes(type));
  }

  /**
   * Get business category from Google Places types
   */
  getBusinessCategory(types: string[]): string {
    if (types.includes('beauty_salon') || types.includes('spa')) {
      return 'Beauty Salon';
    }
    if (types.includes('hair_care') || types.includes('hair_salon')) {
      return 'Hair Salon';
    }
    if (types.includes('barber') || types.includes('barber_shop')) {
      return 'Barber Shop';
    }
    if (types.includes('nail_salon')) {
      return 'Nail Salon';
    }
    
    return 'Beauty Salon'; // Default
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Search with pagination support
   */
  async searchPlacesWithPagination(
    params: GooglePlacesSearchParams,
    maxPages: number = 3
  ): Promise<GooglePlace[]> {
    const allResults: GooglePlace[] = [];
    let nextPageToken: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const searchParams = {
        ...params,
        ...(nextPageToken && { pageToken: nextPageToken }),
      };

      const results = await this.searchPlaces(searchParams);
      allResults.push(...results);

      // Check if there's a next page
      if (!nextPageToken) {
        break;
      }

      // Wait before next page request (required by Google)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return allResults;
  }

  /**
   * Batch process multiple locations
   */
  async searchMultipleLocations(
    locations: Array<{ lat: number; lng: number; radius?: number }>,
    type: string = 'beauty_salon'
  ): Promise<GooglePlace[]> {
    const allResults: GooglePlace[] = [];

    for (const location of locations) {
      try {
        const results = await this.searchPlaces({
          location: `${location.lat},${location.lng}`,
          radius: location.radius || 50000,
          type,
          language: 'tr',
          region: 'tr',
        });

        allResults.push(...results);
        
        // Delay between location searches
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error searching location ${location.lat},${location.lng}:`, error);
      }
    }

    // Remove duplicates
    return allResults.filter((place, index, self) => 
      index === self.findIndex(p => p.place_id === place.place_id)
    );
  }
}

// Singleton instance
let googlePlacesService: GooglePlacesService | null = null;

export function getGooglePlacesService(): GooglePlacesService {
  if (!googlePlacesService) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }
    googlePlacesService = new GooglePlacesService(apiKey);
  }
  return googlePlacesService;
}

export default GooglePlacesService;
