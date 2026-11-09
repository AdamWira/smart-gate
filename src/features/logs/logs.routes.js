import { Router } from 'express';
import { pool } from '../../shared/database.js';
import { authenticate } from '../auth/auth.service.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage) || 20));
    const offset = (page - 1) * perPage;

    const conditions = [];
    const params = [];
    let pi = 1;

    if (req.query.direction && ['entry', 'exit'].includes(req.query.direction)) {
      conditions.push(`direction = $${pi++}`);
      params.push(req.query.direction);
    }
    if (req.query.result && ['granted', 'denied'].includes(req.query.result)) {
      conditions.push(`result = $${pi++}`);
      params.push(req.query.result);
    }
    if (req.query.q) {
      conditions.push(`(user_name_snapshot ILIKE $${pi} OR uid_snapshot ILIKE $${pi})`);
      params.push(`%${req.query.q}%`);
      pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM access_logs ${where}`, params);
    const total = countResult.rows[0].count;

    const dataParams = [...params, perPage, offset];
    const { rows } = await pool.query(
      `SELECT id, user_id, uid_snapshot AS "uidSnapshot", user_name_snapshot AS "userNameSnapshot",
              direction, result, reason, source, occurred_at AS "occurredAt"
       FROM access_logs ${where}
       ORDER BY occurred_at DESC
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

export default router;
