import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../../shared/database.js';
import { config } from '../../shared/config.js';

const SESSION_HOURS = config.session.ttlHours;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export async function login(username, password) {
  const { rows } = await pool.query(
    'SELECT id, username, password_hash, role, is_active FROM admins WHERE username = $1 LIMIT 1',
    [username]
  );
  const admin = rows[0];
  if (!admin || !admin.is_active || !(await bcrypt.compare(password, admin.password_hash))) return null;

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  await pool.query(
    "INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour' * $3)",
    [admin.id, tokenHash, SESSION_HOURS]
  );
  return { token, admin: { id: admin.id, username: admin.username, role: admin.role } };
}

export async function findSession(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT a.id, a.username, a.role FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.is_active = TRUE LIMIT 1`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

export async function logout(token) {
  if (!token) return;
  await pool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function authenticate(req, res, next) {
  try {
    const admin = await findSession(req.cookies?.smart_gate_session);
    if (!admin) return res.status(401).json({ title: 'Unauthorized', status: 401, detail: 'Admin login required.' });
    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ title: 'Forbidden', status: 403, detail: 'Insufficient permissions.' });
    }
    return next();
  };
}
