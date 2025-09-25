require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function simpleImport() {
  console.log('📥 Starting Simple Import...');
  
  // Read first 10 businesses from JSON
  const jsonData = JSON.parse(fs.readFileSync('istanbul_businesses_2025-09-25.json', 'utf8'));
  const sampleBusinesses = jsonData.businesses.slice(0, 10);
  
  console.log(`📊 Testing with ${sampleBusinesses.length} businesses`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    for (const business of sampleBusinesses) {
      console.log(`Processing: ${business.name}`);
      
      // Check if exists
      const existing = await pool.query('SELECT id FROM businesses WHERE google_place_id = $1', [business.place_id]);
      if (existing.rows.length > 0) {
        console.log('  Already exists, skipping');
        continue;
      }

      // Get category
      const categoryResult = await pool.query('SELECT id FROM business_categories WHERE name = $1', [business.category]);
      let categoryId = categoryResult.rows[0]?.id;
      
      if (!categoryId) {
        const newCategory = await pool.query('INSERT INTO business_categories (name, description) VALUES ($1, $2) RETURNING id', [business.category, `Auto-generated category for ${business.category}`]);
        categoryId = newCategory.rows[0].id;
      }

      // Get a default user ID (first user in database)
      const userResult = await pool.query('SELECT id FROM users LIMIT 1');
      const defaultUserId = userResult.rows[0]?.id;

      // Insert business
      await pool.query(`
        INSERT INTO businesses (
          google_place_id, name, address, latitude, longitude,
          phone, website_url, google_rating, google_reviews_count,
          place_types, google_photos, google_business_status,
          data_source, is_google_verified, profile_image_url,
          description, owner_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
        false,
        business.photo_urls && business.photo_urls.length > 0 ? business.photo_urls[0] : null,
        `Google Places business: ${business.name} (${business.location})`,
        defaultUserId,
        new Date(),
        new Date(),
      ]);

      // Get business ID and add category mapping
      const businessResult = await pool.query('SELECT id FROM businesses WHERE google_place_id = $1', [business.place_id]);
      const businessId = businessResult.rows[0].id;

      await pool.query('INSERT INTO business_category_mapping (business_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [businessId, categoryId]);

      console.log('  ✅ Inserted successfully');
    }

    // Check final count
    const result = await pool.query('SELECT COUNT(*) as total FROM businesses WHERE data_source = \'google_places\'');
    console.log(`\n🎉 Import completed! Total Google Places businesses: ${result.rows[0].total}`);

  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await pool.end();
  }
}

simpleImport();
