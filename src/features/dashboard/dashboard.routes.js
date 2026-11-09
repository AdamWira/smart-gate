import { Router } from 'express';
import { pool } from '../../shared/database.js';
import { authenticate } from '../auth/auth.service.js';

const router = Router();

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const [usersResult, todayResult, grantedResult, deniedResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query("SELECT COUNT(*)::int AS count FROM access_logs WHERE occurred_at >= CURRENT_DATE"),
      pool.query("SELECT COUNT(*)::int AS count FROM access_logs WHERE occurred_at >= CURRENT_DATE AND result = 'granted'"),
      pool.query("SELECT COUNT(*)::int AS count FROM access_logs WHERE occurred_at >= CURRENT_DATE AND result = 'denied'"),
    ]);
    res.json({
      data: {
        totalUsers: usersResult.rows[0].count,
        accessToday: todayResult.rows[0].count,
        grantedToday: grantedResult.rows[0].count,
        deniedToday: deniedResult.rows[0].count,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
