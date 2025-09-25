import { GooglePlacesService, GooglePlace } from './googlePlacesService';
import { db } from '../server/db/index';

// Marmara Bölgesi şehirleri ve ilçeleri
export interface MarmaraCity {
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

export const MARMARA_CITIES: MarmaraCity[] = [
  // İstanbul - Ana şehir + ilçeler
  {
    name: 'İstanbul',
    lat: 41.0082,
    lng: 28.9784,
    population: 15519267,
    districts: [
      // Avrupa Yakası
      { name: 'Beşiktaş', lat: 41.0427, lng: 29.0099 },
      { name: 'Şişli', lat: 41.0606, lng: 28.9877 },
      { name: 'Beyoğlu', lat: 41.0369, lng: 28.9850 },
      { name: 'Fatih', lat: 41.0055, lng: 28.9769 },
      { name: 'Bakırköy', lat: 40.9850, lng: 28.8717 },
      { name: 'Bahçelievler', lat: 40.9983, lng: 28.8603 },
      { name: 'Küçükçekmece', lat: 41.0167, lng: 28.7833 },
      { name: 'Büyükçekmece', lat: 41.0167, lng: 28.6167 },
      { name: 'Başakşehir', lat: 41.0833, lng: 28.8333 },
      { name: 'Arnavutköy', lat: 41.1667, lng: 28.7333 },
      { name: 'Sultangazi', lat: 41.1167, lng: 28.8667 },
      { name: 'Gaziosmanpaşa', lat: 41.0667, lng: 28.9167 },
      { name: 'Eyüpsultan', lat: 41.0500, lng: 28.9333 },
      { name: 'Bayrampaşa', lat: 41.0333, lng: 28.9167 },
      { name: 'Zeytinburnu', lat: 41.0000, lng: 28.9000 },
      { name: 'Esenler', lat: 41.0500, lng: 28.8667 },
      { name: 'Güngören', lat: 41.0167, lng: 28.8833 },
      { name: 'Sultangazi', lat: 41.1167, lng: 28.8667 },
      
      // Anadolu Yakası
      { name: 'Kadıköy', lat: 40.9881, lng: 29.0245 },
      { name: 'Üsküdar', lat: 41.0214, lng: 29.0049 },
      { name: 'Maltepe', lat: 40.9333, lng: 29.1500 },
      { name: 'Kartal', lat: 40.8875, lng: 29.1903 },
      { name: 'Pendik', lat: 40.8750, lng: 29.2250 },
      { name: 'Tuzla', lat: 40.8833, lng: 29.3167 },
      { name: 'Çekmeköy', lat: 41.0333, lng: 29.1667 },
      { name: 'Sancaktepe', lat: 41.0000, lng: 29.2000 },
      { name: 'Sultanbeyli', lat: 40.9667, lng: 29.2500 },
      { name: 'Ataşehir', lat: 40.9833, lng: 29.1167 },
      { name: 'Ümraniye', lat: 41.0167, lng: 29.1167 },
      { name: 'Çamlıca', lat: 41.0167, lng: 29.0833 },
    ]
  },
  
  // Bursa
  {
    name: 'Bursa',
    lat: 40.1826,
    lng: 29.0665,
    population: 3097162,
    districts: [
      { name: 'Osmangazi', lat: 40.1833, lng: 29.0667 },
      { name: 'Nilüfer', lat: 40.2333, lng: 29.0167 },
      { name: 'Yıldırım', lat: 40.2167, lng: 29.1000 },
      { name: 'İnegöl', lat: 40.0833, lng: 29.5167 },
      { name: 'Mudanya', lat: 40.3667, lng: 28.8833 },
      { name: 'Gemlik', lat: 40.4333, lng: 29.1500 },
      { name: 'İznik', lat: 40.4333, lng: 29.7167 },
      { name: 'Orhangazi', lat: 40.4833, lng: 29.3167 },
    ]
  },
  
  // Kocaeli
  {
    name: 'Kocaeli',
    lat: 40.8533,
    lng: 29.8815,
    population: 1999427,
    districts: [
      { name: 'İzmit', lat: 40.7667, lng: 29.9167 },
      { name: 'Gebze', lat: 40.8000, lng: 29.4333 },
      { name: 'Darıca', lat: 40.7667, lng: 29.3667 },
      { name: 'Çayırova', lat: 40.8167, lng: 29.3833 },
      { name: 'Dilovası', lat: 40.7833, lng: 29.5333 },
      { name: 'Körfez', lat: 40.7667, lng: 29.7500 },
      { name: 'Derince', lat: 40.7667, lng: 29.8167 },
      { name: 'Gölcük', lat: 40.7167, lng: 29.8167 },
    ]
  },
  
  // Balıkesir
  {
    name: 'Balıkesir',
    lat: 39.6484,
    lng: 27.8826,
    population: 1277935,
    districts: [
      { name: 'Karesi', lat: 39.6333, lng: 27.8833 },
      { name: 'Altıeylül', lat: 39.6500, lng: 27.9000 },
      { name: 'Edremit', lat: 39.5833, lng: 27.0167 },
      { name: 'Bandırma', lat: 40.3500, lng: 27.9667 },
      { name: 'Gönen', lat: 40.1000, lng: 27.6500 },
      { name: 'Ayvalık', lat: 39.3167, lng: 26.6833 },
      { name: 'Burhaniye', lat: 39.5000, lng: 26.9667 },
      { name: 'Erdek', lat: 40.4000, lng: 27.7833 },
    ]
  },
  
  // Tekirdağ
  {
    name: 'Tekirdağ',
    lat: 40.9833,
    lng: 27.5167,
    population: 1128498,
    districts: [
      { name: 'Süleymanpaşa', lat: 40.9833, lng: 27.5167 },
      { name: 'Çerkezköy', lat: 41.2833, lng: 27.9833 },
      { name: 'Çorlu', lat: 41.1500, lng: 27.8000 },
      { name: 'Malkara', lat: 40.8833, lng: 26.9000 },
      { name: 'Şarköy', lat: 40.6167, lng: 27.1167 },
      { name: 'Muratlı', lat: 41.1667, lng: 27.5167 },
      { name: 'Hayrabolu', lat: 41.2167, lng: 27.1167 },
      { name: 'Saray', lat: 41.4333, lng: 27.9167 },
    ]
  },
  
  // Çanakkale
  {
    name: 'Çanakkale',
    lat: 40.1553,
    lng: 26.4142,
    population: 557276,
    districts: [
      { name: 'Merkez', lat: 40.1553, lng: 26.4142 },
      { name: 'Biga', lat: 40.2333, lng: 27.2500 },
      { name: 'Çan', lat: 40.0333, lng: 27.0500 },
      { name: 'Ezine', lat: 39.7833, lng: 26.3333 },
      { name: 'Gelibolu', lat: 40.4000, lng: 26.6667 },
      { name: 'Lapseki', lat: 40.3333, lng: 26.6833 },
      { name: 'Yenice', lat: 39.9333, lng: 27.2500 },
    ]
  },
  
  // Edirne
  {
    name: 'Edirne',
    lat: 41.6771,
    lng: 26.5557,
    population: 414423,
    districts: [
      { name: 'Merkez', lat: 41.6771, lng: 26.5557 },
      { name: 'Enez', lat: 40.7167, lng: 26.0833 },
      { name: 'Havsa', lat: 41.5500, lng: 26.8167 },
      { name: 'İpsala', lat: 40.9167, lng: 26.3833 },
      { name: 'Keşan', lat: 40.8500, lng: 26.6333 },
      { name: 'Lalapaşa', lat: 41.8333, lng: 26.7333 },
      { name: 'Meriç', lat: 41.1833, lng: 26.4167 },
      { name: 'Süloğlu', lat: 41.7667, lng: 26.9167 },
      { name: 'Uzunköprü', lat: 41.2667, lng: 26.6833 },
    ]
  },
  
  // Kırklareli
  {
    name: 'Kırklareli',
    lat: 41.7333,
    lng: 27.2167,
    population: 366363,
    districts: [
      { name: 'Merkez', lat: 41.7333, lng: 27.2167 },
      { name: 'Babaeski', lat: 41.4333, lng: 27.1000 },
      { name: 'Demirköy', lat: 41.8167, lng: 27.7667 },
      { name: 'Kofçaz', lat: 41.9500, lng: 27.1667 },
      { name: 'Lüleburgaz', lat: 41.4000, lng: 27.3500 },
      { name: 'Pehlivanköy', lat: 41.3500, lng: 26.9167 },
      { name: 'Pınarhisar', lat: 41.6167, lng: 27.5167 },
      { name: 'Vize', lat: 41.5667, lng: 27.7667 },
    ]
  },
  
  // Sakarya
  {
    name: 'Sakarya',
    lat: 40.7889,
    lng: 30.4053,
    population: 1076512,
    districts: [
      { name: 'Adapazarı', lat: 40.7667, lng: 30.4000 },
      { name: 'Akyazı', lat: 40.6833, lng: 30.6167 },
      { name: 'Arifiye', lat: 40.7333, lng: 30.3500 },
      { name: 'Erenler', lat: 40.7667, lng: 30.4167 },
      { name: 'Ferizli', lat: 40.8667, lng: 30.4833 },
      { name: 'Geyve', lat: 40.5167, lng: 30.2833 },
      { name: 'Hendek', lat: 40.8000, lng: 30.7500 },
      { name: 'Karapürçek', lat: 40.6333, lng: 30.5500 },
      { name: 'Karasu', lat: 41.1000, lng: 30.6833 },
      { name: 'Kaynarca', lat: 41.0333, lng: 30.3167 },
      { name: 'Kocaali', lat: 41.0667, lng: 30.8500 },
      { name: 'Pamukova', lat: 40.5167, lng: 30.1667 },
      { name: 'Sapanca', lat: 40.6833, lng: 30.2667 },
      { name: 'Serdivan', lat: 40.7667, lng: 30.3500 },
      { name: 'Söğütlü', lat: 40.9000, lng: 30.4667 },
      { name: 'Taraklı', lat: 40.4000, lng: 30.4833 },
    ]
  },
  
  // Yalova
  {
    name: 'Yalova',
    lat: 40.6550,
    lng: 29.2767,
    population: 296333,
    districts: [
      { name: 'Merkez', lat: 40.6550, lng: 29.2767 },
      { name: 'Altınova', lat: 40.7000, lng: 29.5167 },
      { name: 'Armutlu', lat: 40.5167, lng: 28.8333 },
      { name: 'Çınarcık', lat: 40.6500, lng: 29.1167 },
      { name: 'Çiftlikköy', lat: 40.6667, lng: 29.3167 },
      { name: 'Termal', lat: 40.6000, lng: 29.1833 },
    ]
  },
  
  // Düzce
  {
    name: 'Düzce',
    lat: 40.8439,
    lng: 31.1565,
    population: 400976,
    districts: [
      { name: 'Merkez', lat: 40.8439, lng: 31.1565 },
      { name: 'Akçakoca', lat: 41.0833, lng: 31.1167 },
      { name: 'Cumayeri', lat: 40.8667, lng: 30.9500 },
      { name: 'Çilimli', lat: 40.8833, lng: 31.0500 },
      { name: 'Gölyaka', lat: 40.7667, lng: 31.0000 },
      { name: 'Gümüşova', lat: 40.8500, lng: 30.9333 },
      { name: 'Kaynaşlı', lat: 40.7833, lng: 31.3167 },
      { name: 'Yığılca', lat: 40.9500, lng: 31.4500 },
    ]
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

export class MarmaraDataFetcher {
  private googlePlacesService: GooglePlacesService;
  private isRunning = false;
  private progress: FetchProgress;
  private onProgressCallback?: (progress: FetchProgress) => void;

  constructor(googlePlacesService: GooglePlacesService) {
    this.googlePlacesService = googlePlacesService;
    this.progress = {
      currentCity: '',
      totalCities: MARMARA_CITIES.length,
      completedCities: 0,
      totalBusinesses: 0,
      errors: 0,
      startTime: new Date(),
    };
  }

  /**
   * Start fetching data for all Marmara cities
   */
  async fetchAllMarmaraData(): Promise<{
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

    console.log('Starting Marmara region data fetch...');

    try {
      for (let i = 0; i < MARMARA_CITIES.length; i++) {
        const city = MARMARA_CITIES[i];
        this.progress.currentCity = city.name;
        this.updateProgress();

        console.log(`Fetching data for ${city.name} (${i + 1}/${MARMARA_CITIES.length})`);

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
        await this.delay(2000);
      }

      const duration = Date.now() - this.progress.startTime.getTime();
      console.log(`Marmara data fetch completed in ${Math.round(duration / 1000 / 60)} minutes`);
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
  private async fetchCityData(city: MarmaraCity): Promise<void> {
    try {
      const businesses = await this.googlePlacesService.searchBeautyBusinesses(
        { lat: city.lat, lng: city.lng },
        30000 // 30km radius for city center
      );

      await this.saveBusinessesToDatabase(businesses, city.name);
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

      await this.saveBusinessesToDatabase(businesses, `${cityName} - ${district.name}`);
      this.progress.totalBusinesses += businesses.length;

      console.log(`    Found ${businesses.length} businesses in ${district.name}`);
    } catch (error) {
      console.error(`Error fetching data for district ${district.name}:`, error);
      this.progress.errors++;
    }
  }

  /**
   * Save businesses directly to database (not cache)
   */
  private async saveBusinessesToDatabase(businesses: GooglePlace[], location: string): Promise<void> {
    for (const business of businesses) {
      try {
        // Check if business already exists
        const existingBusiness = await db.query(`
          SELECT id FROM businesses WHERE google_place_id = $1
        `, [business.place_id]);

        if (existingBusiness.rows.length > 0) {
          continue; // Skip if already exists
        }

        // Get category ID
        const categoryId = await this.getOrCreateCategory(business.types);

        // Create business
        await db.query(`
          INSERT INTO businesses (
            google_place_id, name, address, latitude, longitude,
            phone, website_url, google_rating, google_reviews_count,
            place_types, google_photos, google_business_status,
            data_source, is_google_verified, profile_image_url,
            description, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
          'google_places',
          false, // Not verified by owner yet
          business.photos && business.photos.length > 0 ? 
            this.googlePlacesService.getPhotoUrl(business.photos[0].photo_reference, 400) : null,
          `Google Places business: ${business.name}`,
          new Date(),
          new Date(),
        ]);

        // Get the created business ID
        const businessResult = await db.query(`
          SELECT id FROM businesses WHERE google_place_id = $1
        `, [business.place_id]);

        const businessId = businessResult.rows[0].id;

        // Add category mapping
        await db.query(`
          INSERT INTO business_category_mapping (business_id, category_id)
          VALUES ($1, $2)
          ON CONFLICT (business_id, category_id) DO NOTHING
        `, [businessId, categoryId]);

        // Small delay between database operations
        await this.delay(50);
      } catch (error) {
        console.error(`Error saving business ${business.name} to database:`, error);
        this.progress.errors++;
      }
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
   * Get statistics
   */
  async getStats(): Promise<{
    totalBusinesses: number;
    byCity: Array<{ city: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
  }> {
    const totalResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM businesses 
      WHERE data_source = 'google_places'
    `);
    
    const byCityResult = await db.query(`
      SELECT 
        CASE 
          WHEN address ILIKE '%istanbul%' THEN 'İstanbul'
          WHEN address ILIKE '%bursa%' THEN 'Bursa'
          WHEN address ILIKE '%kocaeli%' OR address ILIKE '%izmit%' THEN 'Kocaeli'
          WHEN address ILIKE '%balıkesir%' THEN 'Balıkesir'
          WHEN address ILIKE '%tekirdağ%' THEN 'Tekirdağ'
          WHEN address ILIKE '%çanakkale%' THEN 'Çanakkale'
          WHEN address ILIKE '%edirne%' THEN 'Edirne'
          WHEN address ILIKE '%kırklareli%' THEN 'Kırklareli'
          WHEN address ILIKE '%sakarya%' THEN 'Sakarya'
          WHEN address ILIKE '%yalova%' THEN 'Yalova'
          WHEN address ILIKE '%düzce%' THEN 'Düzce'
          ELSE 'Diğer'
        END as city,
        COUNT(*) as count
      FROM businesses 
      WHERE data_source = 'google_places'
      GROUP BY 
        CASE 
          WHEN address ILIKE '%istanbul%' THEN 'İstanbul'
          WHEN address ILIKE '%bursa%' THEN 'Bursa'
          WHEN address ILIKE '%kocaeli%' OR address ILIKE '%izmit%' THEN 'Kocaeli'
          WHEN address ILIKE '%balıkesir%' THEN 'Balıkesir'
          WHEN address ILIKE '%tekirdağ%' THEN 'Tekirdağ'
          WHEN address ILIKE '%çanakkale%' THEN 'Çanakkale'
          WHEN address ILIKE '%edirne%' THEN 'Edirne'
          WHEN address ILIKE '%kırklareli%' THEN 'Kırklareli'
          WHEN address ILIKE '%sakarya%' THEN 'Sakarya'
          WHEN address ILIKE '%yalova%' THEN 'Yalova'
          WHEN address ILIKE '%düzce%' THEN 'Düzce'
          ELSE 'Diğer'
        END
      ORDER BY count DESC
    `);

    const byCategoryResult = await db.query(`
      SELECT 
        bc.name as category,
        COUNT(*) as count
      FROM businesses b
      JOIN business_category_mapping bcm ON b.id = bcm.business_id
      JOIN business_categories bc ON bcm.category_id = bc.id
      WHERE b.data_source = 'google_places'
      GROUP BY bc.name
      ORDER BY count DESC
    `);

    return {
      totalBusinesses: parseInt(totalResult.rows[0].total),
      byCity: byCityResult.rows,
      byCategory: byCategoryResult.rows,
    };
  }
}

export default MarmaraDataFetcher;
