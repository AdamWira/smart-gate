import pg from 'pg';
import { config } from './config.js';

const poolConfig = {
  connectionString: config.databaseUrl,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
};

export const pool = new pg.Pool(poolConfig);

export async function checkDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return { status: 'ok' };
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
