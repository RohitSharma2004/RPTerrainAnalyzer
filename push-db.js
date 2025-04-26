// Script to push database schema changes
const postgres = require('postgres');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/postgres-js');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function main() {
  console.log("Connecting to database...");
  const client = postgres(DATABASE_URL);

  console.log("Creating tables if they don't exist...");
  
  try {
    // Create users table
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    // Create analyses table
    await client`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        analysis_type TEXT NOT NULL,
        is_safe_terrain BOOLEAN NOT NULL,
        confidence_score REAL,
        processing_method TEXT NOT NULL,
        processing_time INTEGER NOT NULL,
        details JSONB NOT NULL,
        metadata JSONB,
        location_data JSONB,
        thumbnail_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    // Create safe_zones table
    await client`
      CREATE TABLE IF NOT EXISTS safe_zones (
        id SERIAL PRIMARY KEY,
        analysis_id INTEGER REFERENCES analyses(id) NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        confidence REAL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Error creating database tables:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();