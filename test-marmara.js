require('dotenv').config();
const { Pool } = require('pg');

async function testMarmaraFetch() {
  console.log('🇹🇷 Testing Marmara Region Data Fetch...');
  
  // Test API call to fetch İstanbul data
  try {
    const response = await fetch('http://localhost:3000/api/admin/marmara/fetch-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real implementation, you'd need proper authentication
      },
      body: JSON.stringify({
        action: 'fetch_city',
        city: 'İstanbul'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ İstanbul fetch result:', result);
    } else {
      console.log('❌ API call failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ API call error:', error.message);
  }
  
  // Test database connection and show current stats
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  
  try {
    console.log('\n📊 Current Database Stats:');
    
    // Total businesses
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM businesses');
    console.log(`Total businesses: ${totalResult.rows[0].total}`);
    
    // Google Places businesses
    const googleResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM businesses 
      WHERE data_source = 'google_places'
    `);
    console.log(`Google Places businesses: ${googleResult.rows[0].total}`);
    
    // By city
    const cityResult = await pool.query(`
      SELECT 
        CASE 
          WHEN address ILIKE '%istanbul%' THEN 'İstanbul'
          WHEN address ILIKE '%bursa%' THEN 'Bursa'
          WHEN address ILIKE '%kocaeli%' OR address ILIKE '%izmit%' THEN 'Kocaeli'
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
      LIMIT 5
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
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run test
testMarmaraFetch().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
