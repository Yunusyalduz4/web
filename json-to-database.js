require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function importJSONToDatabase() {
  console.log('📥 Starting JSON to Database Import...');
  
  // Read JSON file
  const jsonFile = 'istanbul_businesses_2025-09-25.json';
  if (!fs.existsSync(jsonFile)) {
    console.error('❌ JSON file not found:', jsonFile);
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`📊 Found ${jsonData.businesses.length} businesses in JSON`);
  
  // Get default user ID
  const userResult = await pool.query('SELECT id FROM users LIMIT 1');
  const defaultUserId = userResult.rows[0]?.id;
  if (!defaultUserId) {
    console.error('❌ No users found in database. Please create a user first.');
    return;
  }
  console.log(`👤 Using default user ID: ${defaultUserId}`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for (const business of jsonData.businesses) {
      try {
        // Check if business already exists
        const existingBusiness = await pool.query(`
          SELECT id FROM businesses WHERE google_place_id = $1
        `, [business.place_id]);

        if (existingBusiness.rows.length > 0) {
          skipped++;
          continue;
        }

        // Get category ID
        const categoryResult = await pool.query(`
          SELECT id FROM business_categories WHERE name = $1
        `, [business.category]);

        let categoryId;
        if (categoryResult.rows.length > 0) {
          categoryId = categoryResult.rows[0].id;
        } else {
          const newCategory = await pool.query(`
            INSERT INTO business_categories (name, description)
            VALUES ($1, $2)
            RETURNING id
          `, [business.category, `Auto-generated category for ${business.category}`]);
          categoryId = newCategory.rows[0].id;
        }

        // Create business
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
          false, // Not verified by owner yet
          business.photo_urls && business.photo_urls.length > 0 ? business.photo_urls[0] : null,
          `Google Places business: ${business.name} (${business.location})`,
          defaultUserId,
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

        imported++;

        // Progress update every 100 businesses
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} businesses...`);
        }

      } catch (error) {
        console.error(`❌ Error importing ${business.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);

    // Show final stats
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM businesses 
      WHERE data_source = 'google_places'
    `);
    console.log(`📊 Total Google Places businesses in database: ${totalResult.rows[0].total}`);

  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await pool.end();
  }
}

// Run import
importJSONToDatabase().then(() => {
  console.log('🎉 JSON to Database import completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Import failed:', error);
  process.exit(1);
});
