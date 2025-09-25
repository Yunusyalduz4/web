import { GooglePlacesService, GooglePlace } from './googlePlacesService';
import { db } from '../server/db/db';

// Turkey's major cities with coordinates
export interface TurkeyCity {
  name: string;
  lat: number;
  lng: number;
  population: number;
  districts?: Array<{
    name: string;
    lat: number;
    lng: number;
  }>;
}

export const TURKEY_CITIES: TurkeyCity[] = [
  // Major metropolitan areas
  {
    name: 'İstanbul',
    lat: 41.0082,
    lng: 28.9784,
    population: 15519267,
    districts: [
      { name: 'Kadıköy', lat: 40.9881, lng: 29.0245 },
      { name: 'Beşiktaş', lat: 41.0427, lng: 29.0099 },
      { name: 'Şişli', lat: 41.0606, lng: 28.9877 },
      { name: 'Beyoğlu', lat: 41.0369, lng: 28.9850 },
      { name: 'Üsküdar', lat: 41.0214, lng: 29.0049 },
      { name: 'Fatih', lat: 41.0055, lng: 28.9769 },
      { name: 'Bakırköy', lat: 40.9850, lng: 28.8717 },
      { name: 'Maltepe', lat: 40.9333, lng: 29.1500 },
      { name: 'Kartal', lat: 40.8875, lng: 29.1903 },
      { name: 'Pendik', lat: 40.8750, lng: 29.2250 },
    ]
  },
  {
    name: 'Ankara',
    lat: 39.9334,
    lng: 32.8597,
    population: 5663322,
    districts: [
      { name: 'Çankaya', lat: 39.9208, lng: 32.8541 },
      { name: 'Keçiören', lat: 40.0167, lng: 32.8667 },
      { name: 'Yenimahalle', lat: 39.9833, lng: 32.7667 },
      { name: 'Mamak', lat: 39.9333, lng: 32.9333 },
      { name: 'Sincan', lat: 39.9667, lng: 32.5500 },
    ]
  },
  {
    name: 'İzmir',
    lat: 38.4192,
    lng: 27.1287,
    population: 4367251,
    districts: [
      { name: 'Konak', lat: 38.4189, lng: 27.1287 },
      { name: 'Karşıyaka', lat: 38.4667, lng: 27.1167 },
      { name: 'Bornova', lat: 38.4667, lng: 27.2167 },
      { name: 'Buca', lat: 38.3833, lng: 27.1667 },
      { name: 'Çiğli', lat: 38.4833, lng: 27.0500 },
    ]
  },
  {
    name: 'Bursa',
    lat: 40.1826,
    lng: 29.0665,
    population: 3097162,
  },
  {
    name: 'Antalya',
    lat: 36.8969,
    lng: 30.7133,
    population: 2586225,
  },
  {
    name: 'Adana',
    lat: 37.0000,
    lng: 35.3213,
    population: 2277726,
  },
  {
    name: 'Konya',
    lat: 37.8667,
    lng: 32.4833,
    population: 2271810,
  },
  {
    name: 'Gaziantep',
    lat: 37.0662,
    lng: 37.3833,
    population: 2135239,
  },
  {
    name: 'Şanlıurfa',
    lat: 37.1591,
    lng: 38.7969,
    population: 2143020,
  },
  {
    name: 'Kocaeli',
    lat: 40.8533,
    lng: 29.8815,
    population: 1999427,
  },
  {
    name: 'Mersin',
    lat: 36.8000,
    lng: 34.6333,
    population: 1897446,
  },
  {
    name: 'Diyarbakır',
    lat: 37.9144,
    lng: 40.2306,
    population: 1833629,
  },
  {
    name: 'Hatay',
    lat: 36.4018,
    lng: 36.3498,
    population: 1670559,
  },
  {
    name: 'Manisa',
    lat: 38.6191,
    lng: 27.4289,
    population: 1476712,
  },
  {
    name: 'Kayseri',
    lat: 38.7312,
    lng: 35.4787,
    population: 1436711,
  },
  {
    name: 'Samsun',
    lat: 41.2928,
    lng: 36.3313,
    population: 1358909,
  },
  {
    name: 'Balıkesir',
    lat: 39.6484,
    lng: 27.8826,
    population: 1277935,
  },
  {
    name: 'Kahramanmaraş',
    lat: 37.5858,
    lng: 36.9371,
    population: 1161984,
  },
  {
    name: 'Van',
    lat: 38.4891,
    lng: 43.4089,
    population: 1237879,
  },
  {
    name: 'Aydın',
    lat: 37.8560,
    lng: 27.8416,
    population: 1148235,
  },
  {
    name: 'Tekirdağ',
    lat: 40.9833,
    lng: 27.5167,
    population: 1128498,
  },
  {
    name: 'Sakarya',
    lat: 40.7889,
    lng: 30.4053,
    population: 1076512,
  },
  {
    name: 'Denizli',
    lat: 37.7765,
    lng: 29.0864,
    population: 1058956,
  },
  {
    name: 'Muğla',
    lat: 37.2153,
    lng: 28.3636,
    population: 1033752,
  },
  {
    name: 'Eskişehir',
    lat: 39.7767,
    lng: 30.5206,
    population: 898369,
  },
  {
    name: 'Trabzon',
    lat: 41.0015,
    lng: 39.7178,
    population: 816684,
  },
  {
    name: 'Ordu',
    lat: 40.9839,
    lng: 37.8764,
    population: 760872,
  },
  {
    name: 'Afyonkarahisar',
    lat: 38.7507,
    lng: 30.5567,
    population: 747555,
  },
  {
    name: 'Malatya',
    lat: 38.3552,
    lng: 38.3095,
    population: 806156,
  },
  {
    name: 'Erzurum',
    lat: 39.9334,
    lng: 41.2767,
    population: 767848,
  }
];

export interface FetchProgress {
  currentCity: string;
  currentDistrict?: string;
  totalCities: number;
  completedCities: number;
  totalBusinesses: number;
  errors: number;
  startTime: Date;
  estimatedCompletion?: Date;
}

export class TurkeyDataFetcher {
  private googlePlacesService: GooglePlacesService;
  private isRunning = false;
  private progress: FetchProgress;
  private onProgressCallback?: (progress: FetchProgress) => void;

  constructor(googlePlacesService: GooglePlacesService) {
    this.googlePlacesService = googlePlacesService;
    this.progress = {
      currentCity: '',
      totalCities: TURKEY_CITIES.length,
      completedCities: 0,
      totalBusinesses: 0,
      errors: 0,
      startTime: new Date(),
    };
  }

  /**
   * Start fetching data for all Turkey cities
   */
  async fetchAllTurkeyData(): Promise<{
    totalBusinesses: number;
    totalErrors: number;
    duration: number;
  }> {
    if (this.isRunning) {
      throw new Error('Data fetching is already running');
    }

    this.isRunning = true;
    this.progress.startTime = new Date();
    this.progress.completedCities = 0;
    this.progress.totalBusinesses = 0;
    this.progress.errors = 0;

    console.log('Starting Turkey-wide data fetch...');

    try {
      for (let i = 0; i < TURKEY_CITIES.length; i++) {
        const city = TURKEY_CITIES[i];
        this.progress.currentCity = city.name;
        this.updateProgress();

        console.log(`Fetching data for ${city.name} (${i + 1}/${TURKEY_CITIES.length})`);

        // Fetch city data
        await this.fetchCityData(city);

        // If city has districts, fetch district data too
        if (city.districts && city.districts.length > 0) {
          for (const district of city.districts) {
            this.progress.currentDistrict = district.name;
            this.updateProgress();
            
            console.log(`  Fetching district: ${district.name}`);
            await this.fetchDistrictData(district, city.name);
          }
        }

        this.progress.completedCities++;
        this.updateProgress();

        // Estimate completion time
        const elapsed = Date.now() - this.progress.startTime.getTime();
        const avgTimePerCity = elapsed / this.progress.completedCities;
        const remainingCities = this.progress.totalCities - this.progress.completedCities;
        this.progress.estimatedCompletion = new Date(Date.now() + (avgTimePerCity * remainingCities));

        // Delay between cities to respect rate limits
        await this.delay(1000);
      }

      const duration = Date.now() - this.progress.startTime.getTime();
      console.log(`Data fetch completed in ${Math.round(duration / 1000 / 60)} minutes`);
      console.log(`Total businesses found: ${this.progress.totalBusinesses}`);
      console.log(`Total errors: ${this.progress.errors}`);

      return {
        totalBusinesses: this.progress.totalBusinesses,
        totalErrors: this.progress.errors,
        duration,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch data for a specific city
   */
  private async fetchCityData(city: TurkeyCity): Promise<void> {
    try {
      const businesses = await this.googlePlacesService.searchBeautyBusinesses(
        { lat: city.lat, lng: city.lng },
        50000 // 50km radius for city center
      );

      await this.saveBusinessesToCache(businesses, city.name);
      this.progress.totalBusinesses += businesses.length;

      console.log(`  Found ${businesses.length} businesses in ${city.name}`);
    } catch (error) {
      console.error(`Error fetching data for ${city.name}:`, error);
      this.progress.errors++;
    }
  }

  /**
   * Fetch data for a specific district
   */
  private async fetchDistrictData(district: { name: string; lat: number; lng: number }, cityName: string): Promise<void> {
    try {
      const businesses = await this.googlePlacesService.searchBeautyBusinesses(
        { lat: district.lat, lng: district.lng },
        10000 // 10km radius for district
      );

      await this.saveBusinessesToCache(businesses, `${cityName} - ${district.name}`);
      this.progress.totalBusinesses += businesses.length;

      console.log(`    Found ${businesses.length} businesses in ${district.name}`);
    } catch (error) {
      console.error(`Error fetching data for district ${district.name}:`, error);
      this.progress.errors++;
    }
  }

  /**
   * Save businesses to cache table
   */
  private async saveBusinessesToCache(businesses: GooglePlace[], location: string): Promise<void> {
    for (const business of businesses) {
      try {
        await db.query(`
          INSERT INTO google_places_cache (
            place_id, business_name, address, latitude, longitude,
            phone, website, rating, reviews_count, place_types,
            photos, business_status, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (place_id) DO UPDATE SET
            business_name = EXCLUDED.business_name,
            address = EXCLUDED.address,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            phone = EXCLUDED.phone,
            website = EXCLUDED.website,
            rating = EXCLUDED.rating,
            reviews_count = EXCLUDED.reviews_count,
            place_types = EXCLUDED.place_types,
            photos = EXCLUDED.photos,
            business_status = EXCLUDED.business_status,
            raw_data = EXCLUDED.raw_data,
            updated_at = now(),
            expires_at = now() + interval '7 days'
        `, [
          business.place_id,
          business.name,
          business.formatted_address,
          business.geometry.location.lat,
          business.geometry.location.lng,
          business.formatted_phone_number || null,
          business.website || null,
          business.rating || null,
          business.user_ratings_total || null,
          business.types,
          business.photos ? JSON.stringify(business.photos) : null,
          business.business_status || null,
          JSON.stringify(business),
        ]);
      } catch (error) {
        console.error(`Error saving business ${business.name} to cache:`, error);
        this.progress.errors++;
      }
    }
  }

  /**
   * Process cached data and create businesses
   */
  async processCachedData(): Promise<{
    processed: number;
    created: number;
    updated: number;
    errors: number;
  }> {
    console.log('Processing cached Google Places data...');

    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Get all cached businesses
      const result = await db.query(`
        SELECT * FROM google_places_cache 
        WHERE expires_at > now() 
        ORDER BY created_at DESC
      `);

      const cachedBusinesses = result.rows;

      for (const cachedBusiness of cachedBusinesses) {
        try {
          const result = await this.createOrUpdateBusiness(cachedBusiness);
          if (result.created) {
            created++;
          } else {
            updated++;
          }
          processed++;
        } catch (error) {
          console.error(`Error processing business ${cachedBusiness.business_name}:`, error);
          errors++;
        }

        // Progress update every 100 businesses
        if (processed % 100 === 0) {
          console.log(`Processed ${processed}/${cachedBusinesses.length} businesses...`);
        }
      }

      console.log(`Processing completed: ${processed} processed, ${created} created, ${updated} updated, ${errors} errors`);
    } catch (error) {
      console.error('Error processing cached data:', error);
      throw error;
    }

    return { processed, created, updated, errors };
  }

  /**
   * Create or update business from cached data
   */
  private async createOrUpdateBusiness(cachedBusiness: any): Promise<{ created: boolean }> {
    // Check if business already exists
    const existingBusiness = await db.query(`
      SELECT id FROM businesses WHERE google_place_id = $1
    `, [cachedBusiness.place_id]);

    const categoryId = await this.getOrCreateCategory(cachedBusiness.place_types);

    if (existingBusiness.rows.length > 0) {
      // Update existing business
      await db.query(`
        UPDATE businesses SET
          name = $1,
          address = $2,
          latitude = $3,
          longitude = $4,
          phone = $5,
          website_url = $6,
          google_rating = $7,
          google_reviews_count = $8,
          place_types = $9,
          google_photos = $10,
          google_business_status = $11,
          google_updated_at = now(),
          updated_at = now()
        WHERE google_place_id = $12
      `, [
        cachedBusiness.business_name,
        cachedBusiness.address,
        cachedBusiness.latitude,
        cachedBusiness.longitude,
        cachedBusiness.phone,
        cachedBusiness.website,
        cachedBusiness.rating,
        cachedBusiness.reviews_count,
        cachedBusiness.place_types,
        cachedBusiness.photos,
        cachedBusiness.business_status,
        cachedBusiness.place_id,
      ]);

      return { created: false };
    } else {
      // Create new business
      await db.query(`
        INSERT INTO businesses (
          google_place_id, name, address, latitude, longitude,
          phone, website_url, google_rating, google_reviews_count,
          place_types, google_photos, google_business_status,
          data_source, is_google_verified, google_updated_at,
          owner_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        cachedBusiness.place_id,
        cachedBusiness.business_name,
        cachedBusiness.address,
        cachedBusiness.latitude,
        cachedBusiness.longitude,
        cachedBusiness.phone,
        cachedBusiness.website,
        cachedBusiness.rating,
        cachedBusiness.reviews_count,
        cachedBusiness.place_types,
        cachedBusiness.photos,
        cachedBusiness.business_status,
        'google_places',
        false, // Not verified by owner yet
        new Date(),
        null, // No owner yet
      ]);

      // Get the created business ID
      const businessResult = await db.query(`
        SELECT id FROM businesses WHERE google_place_id = $1
      `, [cachedBusiness.place_id]);

      const businessId = businessResult.rows[0].id;

      // Add category mapping
      await db.query(`
        INSERT INTO business_category_mapping (business_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT (business_id, category_id) DO NOTHING
      `, [businessId, categoryId]);

      return { created: true };
    }
  }

  /**
   * Get or create category based on place types
   */
  private async getOrCreateCategory(placeTypes: string[]): Promise<string> {
    const categoryName = this.googlePlacesService.getBusinessCategory(placeTypes);
    
    const result = await db.query(`
      SELECT id FROM business_categories WHERE name = $1
    `, [categoryName]);

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Create new category
    const newCategory = await db.query(`
      INSERT INTO business_categories (name, description)
      VALUES ($1, $2)
      RETURNING id
    `, [categoryName, `Auto-generated category for ${categoryName}`]);

    return newCategory.rows[0].id;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (progress: FetchProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Update progress and call callback
   */
  private updateProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.progress });
    }
  }

  /**
   * Get current progress
   */
  getProgress(): FetchProgress {
    return { ...this.progress };
  }

  /**
   * Check if fetching is running
   */
  isFetching(): boolean {
    return this.isRunning;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    const result = await db.query(`
      DELETE FROM google_places_cache WHERE expires_at < now()
    `);
    return result.rowCount || 0;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    total: number;
    expired: number;
    byCity: Array<{ city: string; count: number }>;
  }> {
    const totalResult = await db.query(`
      SELECT COUNT(*) as total FROM google_places_cache
    `);
    
    const expiredResult = await db.query(`
      SELECT COUNT(*) as expired FROM google_places_cache WHERE expires_at < now()
    `);

    const byCityResult = await db.query(`
      SELECT 
        CASE 
          WHEN raw_data->>'location' IS NOT NULL 
          THEN raw_data->>'location'
          ELSE 'Unknown'
        END as city,
        COUNT(*) as count
      FROM google_places_cache 
      WHERE expires_at > now()
      GROUP BY raw_data->>'location'
      ORDER BY count DESC
      LIMIT 20
    `);

    return {
      total: parseInt(totalResult.rows[0].total),
      expired: parseInt(expiredResult.rows[0].expired),
      byCity: byCityResult.rows,
    };
  }
}

export default TurkeyDataFetcher;
