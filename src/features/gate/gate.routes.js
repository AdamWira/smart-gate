import { Router } from 'express';
import { pool } from '../../shared/database.js';
import { authenticate } from '../auth/auth.service.js';

const router = Router();

router.get('/status', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT status, changed_at AS "changedAt" FROM gate_status WHERE id = 1'
    );
    if (!rows.length) return res.status(404).json({ title: 'Not Found', status: 404, detail: 'Gate status not initialized.' });
    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch('/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(422).json({ title: 'Validation Failed', status: 422, detail: "Status must be 'open' or 'closed'." });
    }
    await pool.query(
      'UPDATE gate_status SET status = $1, changed_by = $2, changed_at = NOW() WHERE id = 1',
      [status, req.admin.id]
    );
    const { rows } = await pool.query('SELECT status, changed_at AS "changedAt" FROM gate_status WHERE id = 1');
    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
