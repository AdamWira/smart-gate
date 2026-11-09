import pg from 'pg';
import { config } from './config.js';

const poolConfig = {
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (config.nodeEnv === 'production' || config.databaseUrl.includes('supabase')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

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
