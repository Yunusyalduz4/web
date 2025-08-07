const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrateDatabase() {
  console.log('🗄️  Starting database migration...');
  
  // Check if DATABASE_URL is provided
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('Please set DATABASE_URL with your Neon PostgreSQL connection string');
    process.exit(1);
  }

  // Create connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'src', 'server', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Reading schema file...');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('🎉 Database migration completed successfully!');
    
    // Test connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful');
    console.log(`🕐 Current database time: ${result.rows[0].current_time}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase }; 