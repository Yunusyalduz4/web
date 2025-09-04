import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // VPS'de SSL'i devre dışı bırak
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}); 