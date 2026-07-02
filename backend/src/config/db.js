const { Pool } = require('pg');

// Configuration for PostgreSQL connection pool
const poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  // Supabase/Cloud databases require SSL in production environments
  if (process.env.DATABASE_URL.includes('supabase.co') || process.env.DATABASE_URL.includes('render.com')) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }
} else {
  poolConfig.host = process.env.DB_HOST;
  poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
  poolConfig.user = process.env.DB_USER;
  poolConfig.password = process.env.DB_PASSWORD;
  poolConfig.database = process.env.DB_NAME;
}

const pool = new Pool(poolConfig);

const fs = require('fs');
const path = require('path');

// A simple test query function that logs database connection status on startup
const testConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection test failed:', error.message);
  }
};

// Reads and executes migrations.sql to ensure required tables exist
const runMigrations = async () => {
  try {
    const migrationFilePath = path.join(__dirname, 'migrations.sql');
    if (fs.existsSync(migrationFilePath)) {
      const sql = fs.readFileSync(migrationFilePath, 'utf8');
      await pool.query(sql);
      console.log('Database migrations executed successfully');
    } else {
      console.warn('Migration file migrations.sql not found at:', migrationFilePath);
    }
  } catch (error) {
    console.error('Database migration test/execution failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  runMigrations,
};
