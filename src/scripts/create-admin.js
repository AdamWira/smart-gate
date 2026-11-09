import bcrypt from 'bcryptjs';
import { pool, closePool } from '../shared/database.js';

const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE ?? 'admin';

if (!username || !password || password.length < 12 || !['admin', 'operator'].includes(role)) {
  console.error('Set ADMIN_USERNAME, ADMIN_PASSWORD (minimum 12 characters), and optional ADMIN_ROLE=admin|operator.');
  process.exitCode = 2;
} else {
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3)',
      [username, passwordHash, role]
    );
    console.info(JSON.stringify({ message: 'Admin account created', username, role }));
  } catch (error) {
    if (error.code === '23505') {
      console.error('That admin username already exists.');
      process.exitCode = 1;
    } else {
      console.error(JSON.stringify({ message: 'Could not create admin', error: error.message }));
      process.exitCode = 1;
    }
  } finally {
    await closePool();
  }
}
