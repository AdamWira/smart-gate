import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(name, fallback) {
  const value = Number(required(name, String(fallback)));
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

export const config = Object.freeze({
  port: integer('PORT', 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  session: {
    cookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
    ttlHours: integer('SESSION_TTL_HOURS', 8)
  }
});
