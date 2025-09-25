require('dotenv').config();
const fs = require('fs');

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
        console.log(`   🔍 Searching for ${type}...`);
        const results = await this.searchPlaces({
          location: `${location.lat},${location.lng}`,
          radius,
          type,
          language: 'tr',
          region: 'tr',
        });

        allResults.push(...results);
        console.log(`   ✅ Found ${results.length} ${type} businesses`);
        
        // Small delay between different type searches
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`   ❌ Error searching for ${type}:`, error.message);
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

// İstanbul Districts
const ISTANBUL_DISTRICTS = [
  // Avrupa Yakası
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
  { name: 'Sultangazi', lat: 41.1167, lng: 28.8667 },
  { name: 'Gaziosmanpaşa', lat: 41.0667, lng: 28.9167 },
  { name: 'Eyüpsultan', lat: 41.0500, lng: 28.9333 },
  { name: 'Bayrampaşa', lat: 41.0333, lng: 28.9167 },
  { name: 'Zeytinburnu', lat: 41.0000, lng: 28.9000 },
  { name: 'Esenler', lat: 41.0500, lng: 28.8667 },
  { name: 'Güngören', lat: 41.0167, lng: 28.8833 },
];

async function fetchIstanbulToJSON() {
  console.log('🏙️ Starting İstanbul Data Fetch to JSON...');
  console.log(`📍 Total districts to process: ${ISTANBUL_DISTRICTS.length}`);
  
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found');
    return;
  }

  const googlePlacesService = new GooglePlacesService(apiKey);
  const allBusinesses = [];
  let totalBusinesses = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  try {
    // İstanbul merkez
    console.log('\n🏛️ Processing İstanbul Center...');
    try {
      const cityCenterBusinesses = await googlePlacesService.searchBeautyBusinesses(
        { lat: 41.0082, lng: 28.9784 },
        25000 // 25km radius for city center
      );

      cityCenterBusinesses.forEach(business => {
        allBusinesses.push({
          ...business,
          location: 'İstanbul Center',
          category: googlePlacesService.getBusinessCategory(business.types),
          photo_urls: business.photos ? business.photos.map(photo => 
            googlePlacesService.getPhotoUrl(photo.photo_reference, 400)
          ) : []
        });
      });

      totalBusinesses += cityCenterBusinesses.length;
      console.log(`   ✅ İstanbul Center: ${cityCenterBusinesses.length} businesses`);
    } catch (error) {
      console.error(`   ❌ Error fetching İstanbul Center:`, error.message);
      totalErrors++;
    }

    // İlçeler
    for (let i = 0; i < ISTANBUL_DISTRICTS.length; i++) {
      const district = ISTANBUL_DISTRICTS[i];
      console.log(`\n🏘️ Processing ${district.name} (${i + 1}/${ISTANBUL_DISTRICTS.length})`);

      try {
        const districtBusinesses = await googlePlacesService.searchBeautyBusinesses(
          { lat: district.lat, lng: district.lng },
          8000 // 8km radius for districts
        );

        districtBusinesses.forEach(business => {
          allBusinesses.push({
            ...business,
            location: district.name,
            category: googlePlacesService.getBusinessCategory(business.types),
            photo_urls: business.photos ? business.photos.map(photo => 
              googlePlacesService.getPhotoUrl(photo.photo_reference, 400)
            ) : []
          });
        });

        totalBusinesses += districtBusinesses.length;
        console.log(`   ✅ ${district.name}: ${districtBusinesses.length} businesses`);

        // Delay between districts
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ Error fetching ${district.name}:`, error.message);
        totalErrors++;
      }
    }

    // Remove duplicates based on place_id
    const uniqueBusinesses = allBusinesses.filter((business, index, self) => 
      index === self.findIndex(b => b.place_id === business.place_id)
    );

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`\n🎉 İstanbul Data Fetch Completed!`);
    console.log(`📊 Total businesses found: ${uniqueBusinesses.length}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`⏱️ Duration: ${duration} minutes`);

    // Save to JSON file
    const jsonData = {
      metadata: {
        city: 'İstanbul',
        total_businesses: uniqueBusinesses.length,
        fetched_at: new Date().toISOString(),
        duration_minutes: duration,
        errors: totalErrors,
        districts_processed: ISTANBUL_DISTRICTS.length + 1 // +1 for city center
      },
      businesses: uniqueBusinesses
    };

    const filename = `istanbul_businesses_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(jsonData, null, 2), 'utf8');
    
    console.log(`\n💾 Data saved to: ${filename}`);
    console.log(`📁 File size: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB`);

    // Show statistics
    showStatistics(uniqueBusinesses);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

function showStatistics(businesses) {
  console.log('\n📈 Statistics:');
  
  // By location
  const byLocation = {};
  businesses.forEach(business => {
    byLocation[business.location] = (byLocation[business.location] || 0) + 1;
  });
  
  console.log('\nBy Location:');
  Object.entries(byLocation)
    .sort(([,a], [,b]) => b - a)
    .forEach(([location, count]) => {
      console.log(`  ${location}: ${count}`);
    });
  
  // By category
  const byCategory = {};
  businesses.forEach(business => {
    byCategory[business.category] = (byCategory[business.category] || 0) + 1;
  });
  
  console.log('\nBy Category:');
  Object.entries(byCategory)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
  
  // By rating
  const byRating = {};
  businesses.forEach(business => {
    if (business.rating) {
      const rating = Math.floor(business.rating);
      byRating[rating] = (byRating[rating] || 0) + 1;
    }
  });
  
  console.log('\nBy Rating:');
  Object.entries(byRating)
    .sort(([a], [b]) => b - a)
    .forEach(([rating, count]) => {
      console.log(`  ${rating} stars: ${count}`);
    });
  
  // Sample businesses
  console.log('\nSample Businesses:');
  businesses.slice(0, 5).forEach((business, index) => {
    console.log(`  ${index + 1}. ${business.name}`);
    console.log(`     Location: ${business.location}`);
    console.log(`     Category: ${business.category}`);
    console.log(`     Address: ${business.formatted_address}`);
    console.log(`     Phone: ${business.formatted_phone_number || 'N/A'}`);
    console.log(`     Rating: ${business.rating || 'N/A'} (${business.user_ratings_total || 0} reviews)`);
    console.log(`     Photos: ${business.photo_urls.length}`);
    console.log('');
  });
}

// Run the fetch
fetchIstanbulToJSON().then(() => {
  console.log('\n🎉 İstanbul JSON export completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Export failed:', error);
  process.exit(1);
});
