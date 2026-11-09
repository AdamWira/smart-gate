import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from '../shared/database.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'database', 'migrations');

const files = ['001_initial_schema.sql', '002_admin_sessions.sql'];

try {
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.info(`✓ Applied ${file}`);
  }
  console.info('Database initialized successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
