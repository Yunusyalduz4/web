require('dotenv').config();
const { Pool } = require('pg');

// Google Places API Service
class GooglePlacesService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  async searchBeautyBusinesses(location, radius = 50000) {
    const beautyTypes = [
      'beauty_salon',
      'hair_care',
      'spa',
      'barber',
      'nail_salon'
    ];

    const allResults = [];

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

  async searchPlaces(params) {
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

      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Google Places search error:', error);
      throw error;
    }
  }

  getBusinessCategory(types) {
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

  getPhotoUrl(photoReference, maxWidth = 400) {
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }
}

// Marmara Cities
const MARMARA_CITIES = [
  { name: 'İstanbul', lat: 41.0082, lng: 28.9784, districts: [
    { name: 'Beşiktaş', lat: 41.0427, lng: 29.0099 },
    { name: 'Şişli', lat: 41.0606, lng: 28.9877 },
    { name: 'Beyoğlu', lat: 41.0369, lng: 28.9850 },
    { name: 'Fatih', lat: 41.0055, lng: 28.9769 },
    { name: 'Kadıköy', lat: 40.9881, lng: 29.0245 },
    { name: 'Üsküdar', lat: 41.0214, lng: 29.0049 },
    { name: 'Maltepe', lat: 40.9333, lng: 29.1500 },
    { name: 'Kartal', lat: 40.8875, lng: 29.1903 },
    { name: 'Pendik', lat: 40.8750, lng: 29.2250 },
    { name: 'Bakırköy', lat: 40.9850, lng: 28.8717 },
    { name: 'Bahçelievler', lat: 40.9983, lng: 28.8603 },
    { name: 'Küçükçekmece', lat: 41.0167, lng: 28.7833 },
    { name: 'Büyükçekmece', lat: 41.0167, lng: 28.6167 },
    { name: 'Başakşehir', lat: 41.0833, lng: 28.8333 },
    { name: 'Arnavutköy', lat: 41.1667, lng: 28.7333 },
    { name: 'Ataşehir', lat: 40.9833, lng: 29.1167 },
    { name: 'Ümraniye', lat: 41.0167, lng: 29.1167 },
  ]},
  { name: 'Bursa', lat: 40.1826, lng: 29.0665, districts: [
    { name: 'Osmangazi', lat: 40.1833, lng: 29.0667 },
    { name: 'Nilüfer', lat: 40.2333, lng: 29.0167 },
    { name: 'Yıldırım', lat: 40.2167, lng: 29.1000 },
    { name: 'İnegöl', lat: 40.0833, lng: 29.5167 },
    { name: 'Mudanya', lat: 40.3667, lng: 28.8833 },
    { name: 'Gemlik', lat: 40.4333, lng: 29.1500 },
  ]},
  { name: 'Kocaeli', lat: 40.8533, lng: 29.8815, districts: [
    { name: 'İzmit', lat: 40.7667, lng: 29.9167 },
    { name: 'Gebze', lat: 40.8000, lng: 29.4333 },
    { name: 'Darıca', lat: 40.7667, lng: 29.3667 },
    { name: 'Çayırova', lat: 40.8167, lng: 29.3833 },
    { name: 'Körfez', lat: 40.7667, lng: 29.7500 },
    { name: 'Derince', lat: 40.7667, lng: 29.8167 },
    { name: 'Gölcük', lat: 40.7167, lng: 29.8167 },
  ]},
  { name: 'Balıkesir', lat: 39.6484, lng: 27.8826, districts: [
    { name: 'Karesi', lat: 39.6333, lng: 27.8833 },
    { name: 'Altıeylül', lat: 39.6500, lng: 27.9000 },
    { name: 'Edremit', lat: 39.5833, lng: 27.0167 },
    { name: 'Bandırma', lat: 40.3500, lng: 27.9667 },
    { name: 'Gönen', lat: 40.1000, lng: 27.6500 },
    { name: 'Ayvalık', lat: 39.3167, lng: 26.6833 },
  ]},
  { name: 'Tekirdağ', lat: 40.9833, lng: 27.5167, districts: [
    { name: 'Süleymanpaşa', lat: 40.9833, lng: 27.5167 },
    { name: 'Çerkezköy', lat: 41.2833, lng: 27.9833 },
    { name: 'Çorlu', lat: 41.1500, lng: 27.8000 },
    { name: 'Malkara', lat: 40.8833, lng: 26.9000 },
    { name: 'Şarköy', lat: 40.6167, lng: 27.1167 },
    { name: 'Muratlı', lat: 41.1667, lng: 27.5167 },
  ]},
  { name: 'Çanakkale', lat: 40.1553, lng: 26.4142, districts: [
    { name: 'Merkez', lat: 40.1553, lng: 26.4142 },
    { name: 'Biga', lat: 40.2333, lng: 27.2500 },
    { name: 'Çan', lat: 40.0333, lng: 27.0500 },
    { name: 'Ezine', lat: 39.7833, lng: 26.3333 },
    { name: 'Gelibolu', lat: 40.4000, lng: 26.6667 },
    { name: 'Lapseki', lat: 40.3333, lng: 26.6833 },
  ]},
  { name: 'Edirne', lat: 41.6771, lng: 26.5557, districts: [
    { name: 'Merkez', lat: 41.6771, lng: 26.5557 },
    { name: 'Enez', lat: 40.7167, lng: 26.0833 },
    { name: 'Havsa', lat: 41.5500, lng: 26.8167 },
    { name: 'İpsala', lat: 40.9167, lng: 26.3833 },
    { name: 'Keşan', lat: 40.8500, lng: 26.6333 },
    { name: 'Uzunköprü', lat: 41.2667, lng: 26.6833 },
  ]},
  { name: 'Kırklareli', lat: 41.7333, lng: 27.2167, districts: [
    { name: 'Merkez', lat: 41.7333, lng: 27.2167 },
    { name: 'Babaeski', lat: 41.4333, lng: 27.1000 },
    { name: 'Demirköy', lat: 41.8167, lng: 27.7667 },
    { name: 'Lüleburgaz', lat: 41.4000, lng: 27.3500 },
    { name: 'Pehlivanköy', lat: 41.3500, lng: 26.9167 },
    { name: 'Pınarhisar', lat: 41.6167, lng: 27.5167 },
  ]},
  { name: 'Sakarya', lat: 40.7889, lng: 30.4053, districts: [
    { name: 'Adapazarı', lat: 40.7667, lng: 30.4000 },
    { name: 'Akyazı', lat: 40.6833, lng: 30.6167 },
    { name: 'Arifiye', lat: 40.7333, lng: 30.3500 },
    { name: 'Erenler', lat: 40.7667, lng: 30.4167 },
    { name: 'Ferizli', lat: 40.8667, lng: 30.4833 },
    { name: 'Geyve', lat: 40.5167, lng: 30.2833 },
    { name: 'Hendek', lat: 40.8000, lng: 30.7500 },
    { name: 'Karasu', lat: 41.1000, lng: 30.6833 },
  ]},
  { name: 'Yalova', lat: 40.6550, lng: 29.2767, districts: [
    { name: 'Merkez', lat: 40.6550, lng: 29.2767 },
    { name: 'Altınova', lat: 40.7000, lng: 29.5167 },
    { name: 'Armutlu', lat: 40.5167, lng: 28.8333 },
    { name: 'Çınarcık', lat: 40.6500, lng: 29.1167 },
    { name: 'Çiftlikköy', lat: 40.6667, lng: 29.3167 },
    { name: 'Termal', lat: 40.6000, lng: 29.1833 },
  ]},
  { name: 'Düzce', lat: 40.8439, lng: 31.1565, districts: [
    { name: 'Merkez', lat: 40.8439, lng: 31.1565 },
    { name: 'Akçakoca', lat: 41.0833, lng: 31.1167 },
    { name: 'Cumayeri', lat: 40.8667, lng: 30.9500 },
    { name: 'Çilimli', lat: 40.8833, lng: 31.0500 },
    { name: 'Gölyaka', lat: 40.7667, lng: 31.0000 },
    { name: 'Gümüşova', lat: 40.8500, lng: 30.9333 },
    { name: 'Kaynaşlı', lat: 40.7833, lng: 31.3167 },
    { name: 'Yığılca', lat: 40.9500, lng: 31.4500 },
  ]}
];

async function fetchMarmaraRegion() {
  console.log('🚀 Starting Marmara Region Data Fetch...');
  console.log(`📍 Total cities to process: ${MARMARA_CITIES.length}`);
  
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found');
    return;
  }

  const googlePlacesService = new GooglePlacesService(apiKey);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  let totalBusinesses = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < MARMARA_CITIES.length; i++) {
      const city = MARMARA_CITIES[i];
      console.log(`\n🏙️ Processing ${city.name} (${i + 1}/${MARMARA_CITIES.length})`);

      // Fetch city center data
      try {
        const cityBusinesses = await googlePlacesService.searchBeautyBusinesses(
          { lat: city.lat, lng: city.lng },
          30000 // 30km radius
        );

        await saveBusinessesToDatabase(pool, cityBusinesses, city.name);
        totalBusinesses += cityBusinesses.length;
        console.log(`   ✅ City center: ${cityBusinesses.length} businesses`);

        // Fetch district data
        if (city.districts && city.districts.length > 0) {
          for (const district of city.districts) {
            try {
              const districtBusinesses = await googlePlacesService.searchBeautyBusinesses(
                { lat: district.lat, lng: district.lng },
                10000 // 10km radius
              );

              await saveBusinessesToDatabase(pool, districtBusinesses, `${city.name} - ${district.name}`);
              totalBusinesses += districtBusinesses.length;
              console.log(`   ✅ ${district.name}: ${districtBusinesses.length} businesses`);

              // Delay between districts
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.error(`   ❌ Error fetching ${district.name}:`, error.message);
              totalErrors++;
            }
          }
        }

        console.log(`   📊 Total for ${city.name}: ${totalBusinesses} businesses so far`);
        
        // Delay between cities
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error fetching ${city.name}:`, error.message);
        totalErrors++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`\n🎉 Marmara Region Data Fetch Completed!`);
    console.log(`📊 Total businesses found: ${totalBusinesses}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`⏱️ Duration: ${duration} minutes`);

    // Show final statistics
    await showFinalStats(pool);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await pool.end();
  }
}

async function saveBusinessesToDatabase(pool, businesses, location) {
  const googlePlacesService = new GooglePlacesService(process.env.GOOGLE_PLACES_API_KEY);
  
  for (const business of businesses) {
    try {
      // Check if business already exists
      const existingBusiness = await pool.query(`
        SELECT id FROM businesses WHERE google_place_id = $1
      `, [business.place_id]);

      if (existingBusiness.rows.length > 0) {
        continue; // Skip if already exists
      }

      // Get category ID
      const categoryName = googlePlacesService.getBusinessCategory(business.types);
      const categoryResult = await pool.query(`
        SELECT id FROM business_categories WHERE name = $1
      `, [categoryName]);

      let categoryId;
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      } else {
        const newCategory = await pool.query(`
          INSERT INTO business_categories (name, description)
          VALUES ($1, $2)
          RETURNING id
        `, [categoryName, `Auto-generated category for ${categoryName}`]);
        categoryId = newCategory.rows[0].id;
      }

      // Create business
      await pool.query(`
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
        JSON.stringify(business.types),
        business.photos ? JSON.stringify(business.photos) : null,
        business.business_status || null,
        'google_places',
        false, // Not verified by owner yet
        business.photos && business.photos.length > 0 ? 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${business.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}` : null,
        `Google Places business: ${business.name}`,
        new Date(),
        new Date(),
      ]);

      // Get the created business ID
      const businessResult = await pool.query(`
        SELECT id FROM businesses WHERE google_place_id = $1
      `, [business.place_id]);

      const businessId = businessResult.rows[0].id;

      // Add category mapping
      await pool.query(`
        INSERT INTO business_category_mapping (business_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT (business_id, category_id) DO NOTHING
      `, [businessId, categoryId]);

      // Small delay between database operations
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error saving business ${business.name}:`, error.message);
    }
  }
}

async function showFinalStats(pool) {
  console.log('\n📈 Final Statistics:');
  
  // Total businesses
  const totalResult = await pool.query('SELECT COUNT(*) as total FROM businesses WHERE data_source = \'google_places\'');
  console.log(`Total Google Places businesses: ${totalResult.rows[0].total}`);
  
  // By city
  const cityResult = await pool.query(`
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
  
  console.log('\nBy City:');
  cityResult.rows.forEach(row => {
    console.log(`  ${row.city}: ${row.count}`);
  });
  
  // By category
  const categoryResult = await pool.query(`
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
  
  console.log('\nBy Category:');
  categoryResult.rows.forEach(row => {
    console.log(`  ${row.category}: ${row.count}`);
  });
  
  // Sample businesses
  const sampleResult = await pool.query(`
    SELECT name, address, phone, google_rating, profile_image_url
    FROM businesses 
    WHERE data_source = 'google_places'
    ORDER BY created_at DESC
    LIMIT 10
  `);
  
  console.log('\nSample Businesses:');
  sampleResult.rows.forEach((row, index) => {
    console.log(`  ${index + 1}. ${row.name}`);
    console.log(`     Address: ${row.address}`);
    console.log(`     Phone: ${row.phone || 'N/A'}`);
    console.log(`     Rating: ${row.google_rating || 'N/A'}`);
    console.log(`     Image: ${row.profile_image_url ? 'Yes' : 'No'}`);
    console.log('');
  });
}

// Run the fetch
fetchMarmaraRegion().then(() => {
  console.log('\n🎉 Marmara region data fetch completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fetch failed:', error);
  process.exit(1);
});
