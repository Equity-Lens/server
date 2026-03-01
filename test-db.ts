import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(' Connected to Supabase!');
    console.log('Current time from database:', result.rows[0].now);
    
    // Test users table
    const users = await pool.query('SELECT * FROM users LIMIT 1');
    console.log(' Users table exists');
    
    await pool.end();
  } catch (error) {
    console.error(' Connection failed:', error);
  }
}

testConnection();