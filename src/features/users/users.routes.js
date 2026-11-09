import { Router } from 'express';
import { pool } from '../../shared/database.js';
import { authenticate } from '../auth/auth.service.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage) || 10));
    const offset = (page - 1) * perPage;

    const conditions = [];
    const params = [];
    let pi = 1;

    if (req.query.status && ['active', 'inactive'].includes(req.query.status)) {
      conditions.push(`u.status = $${pi++}`);
      params.push(req.query.status);
    }
    if (req.query.q) {
      conditions.push(`(u.full_name ILIKE $${pi} OR u.email ILIKE $${pi} OR c.uid ILIKE $${pi})`);
      params.push(`%${req.query.q}%`);
      pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT u.id)::int AS count FROM users u LEFT JOIN rfid_cards c ON c.user_id = u.id ${where}`,
      params
    );
    const total = countResult.rows[0].count;

    const dataParams = [...params, perPage, offset];
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (u.id) u.id, u.full_name AS "fullName", u.email, u.phone, u.status,
              c.uid, u.created_at AS "createdAt"
       FROM users u
       LEFT JOIN rfid_cards c ON c.user_id = u.id AND c.status = 'active'
       ${where}
       ORDER BY u.id, u.created_at DESC
       LIMIT $${pi++} OFFSET $${pi}`,
      dataParams
    );

    res.json({
      data: rows,
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) || 1 }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { fullName, email, phone, uid } = req.body;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 1) {
      return res.status(422).json({ title: 'Validation Failed', status: 422, detail: 'Nama lengkap wajib diisi.' });
    }

    const { rows } = await pool.query(
      'INSERT INTO users (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id, full_name AS "fullName", email, phone, status',
      [fullName.trim(), email?.trim() || null, phone?.trim() || null]
    );
    const user = rows[0];

    if (uid && typeof uid === 'string' && uid.trim()) {
      await pool.query('INSERT INTO rfid_cards (user_id, uid) VALUES ($1, $2)', [user.id, uid.trim()]);
      user.uid = uid.trim();
    }

    res.status(201).json({ data: user });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ title: 'Conflict', status: 409, detail: 'Email atau UID kartu sudah digunakan.' });
    }
    next(error);
  }
});

export default router;
