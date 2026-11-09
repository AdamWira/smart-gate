import { Router } from 'express';
import { authenticate, login, logout } from './auth.service.js';
import { config } from '../../shared/config.js';

const router = Router();
const cookieName = 'smart_gate_session';
const cookieBase = {
  httpOnly: true,
  secure: config.session.cookieSecure,
  sameSite: 'lax',
  path: '/',
  maxAge: config.session.ttlHours * 60 * 60 * 1000
};

router.post('/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password || username.length > 80 || password.length > 200) {
      return res.status(422).json({ title: 'Validation Failed', status: 422, detail: 'Username and password are required.' });
    }
    const result = await login(username, password);
    if (!result) return res.status(401).json({ title: 'Unauthorized', status: 401, detail: 'Invalid username or password.' });
    res.cookie(cookieName, result.token, cookieBase);
    return res.json({ data: result.admin });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logout(req.cookies[cookieName]);
    res.clearCookie(cookieName, { httpOnly: true, secure: cookieBase.secure, sameSite: 'lax', path: '/' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ data: req.admin }));

export default router;
