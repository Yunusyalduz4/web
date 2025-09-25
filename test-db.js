require('dotenv').config();
const { Pool } = require('pg');

async function testDatabase() {
  console.log('🗄️ Testing Database Connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Database connected at: ${result.rows[0].current_time}`);
    
    // Test Google Places cache table
    const cacheResult = await pool.query('SELECT COUNT(*) as count FROM google_places_cache');
    console.log(`✅ Google Places cache table: ${cacheResult.rows[0].count} entries`);
    
    // Test businesses table with Google Places data
    const businessResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM businesses 
      WHERE data_source = 'google_places'
    `);
    console.log(`✅ Google Places businesses: ${businessResult.rows[0].count} entries`);
    
    // Test categories
    const categoryResult = await pool.query('SELECT COUNT(*) as count FROM business_categories');
    console.log(`✅ Business categories: ${categoryResult.rows[0].count} entries`);
    
    // List some categories
    const categories = await pool.query('SELECT name FROM business_categories LIMIT 5');
    console.log('   Categories:', categories.rows.map(r => r.name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run test
testDatabase().then(success => {
  process.exit(success ? 0 : 1);
});
