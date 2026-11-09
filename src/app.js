import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './features/auth/auth.routes.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';
import logsRoutes from './features/logs/logs.routes.js';
import gateRoutes from './features/gate/gate.routes.js';
import usersRoutes from './features/users/users.routes.js';
import { checkDatabase } from './shared/database.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(express.static(publicDir, { index: false }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/access-logs', logsRoutes);
app.use('/api/v1/gate', gateRoutes);
app.use('/api/v1/users', usersRoutes);

app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (_req, res) => {
  try {
    const database = await checkDatabase();
    res.json({ status: 'ok', checks: { database } });
  } catch {
    res.status(503).json({ status: 'degraded', checks: { database: { status: 'error' } } });
  }
});

app.use((err, req, res, _next) => {
  const requestId = req.headers['x-request-id'] ?? 'unassigned';
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ title: 'Bad Request', status: 400, detail: 'Malformed JSON request body.', request_id: requestId });
  }
  console.error(JSON.stringify({ level: 'error', message: err.message, request_id: requestId }));
  return res.status(500).json({ title: 'Internal Server Error', status: 500, detail: 'An unexpected error occurred.', request_id: requestId });
});
