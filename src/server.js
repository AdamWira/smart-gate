import { app } from './app.js';
import { config } from './shared/config.js';
import { closePool } from './shared/database.js';

const server = app.listen(config.port, () => {
  console.info(JSON.stringify({ level: 'info', message: 'Smart Gate API listening', port: config.port }));
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(JSON.stringify({ level: 'info', message: 'Shutdown requested', signal }));
  server.close(async (error) => {
    try {
      await closePool();
      process.exit(error ? 1 : 0);
    } catch (closeError) {
      console.error(JSON.stringify({ level: 'error', message: 'Shutdown failed', error: closeError.message }));
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
