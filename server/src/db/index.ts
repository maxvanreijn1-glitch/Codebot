import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings tuned for Render's managed PostgreSQL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Initializes the database by running the schema SQL file.
 * Safe to run on every startup thanks to IF NOT EXISTS guards.
 */
export async function initializeDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const migrationDir = path.join(__dirname, 'migrations');

  try {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
  } catch (err) {
    throw new Error(`Failed to read or execute schema.sql: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Run numbered migration files in alphabetical order
  if (fs.existsSync(migrationDir)) {
    const migrations = fs.readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrations) {
      try {
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
        await pool.query(sql);
      } catch (err) {
        throw new Error(`Failed to execute migration ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log('Database initialized successfully');
}
