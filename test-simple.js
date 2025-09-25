require('dotenv').config();

async function testGooglePlacesAPI() {
  console.log('🧪 Testing Google Places API...');
  
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found');
    return false;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  try {
    // Test API call
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=beauty+salon+istanbul&key=${apiKey}&language=tr&region=tr`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log(`✅ API working! Found ${data.results.length} results`);
      if (data.results.length > 0) {
        const first = data.results[0];
        console.log(`   Example: ${first.name} - ${first.formatted_address}`);
        console.log(`   Rating: ${first.rating || 'N/A'}, Reviews: ${first.user_ratings_total || 'N/A'}`);
      }
      return true;
    } else {
      console.error(`❌ API Error: ${data.status}`);
      if (data.error_message) {
        console.error(`   Message: ${data.error_message}`);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    return false;
  }
}

// Run test
testGooglePlacesAPI().then(success => {
  process.exit(success ? 0 : 1);
});
