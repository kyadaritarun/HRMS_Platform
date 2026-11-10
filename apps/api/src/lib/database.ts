import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Candidate paths for .env
const candidates = [
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
dotenv.config();

/**
 * Builds the PostgreSQL connection URL from individual DB environment variables:
 * DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SCHEMA
 */
export function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    const raw = process.env.DATABASE_URL.trim();
    if (!raw.includes('connection_limit=')) {
      const sep = raw.includes('?') ? '&' : '?';
      return `${raw}${sep}connection_limit=3&pool_timeout=10`;
    }
    return raw;
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || '';
  const user = encodeURIComponent(process.env.DB_USER || '');
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');
  const schema = process.env.DB_SCHEMA || 'public';
  const connectionLimit = process.env.DB_CONNECTION_LIMIT || (process.env.NODE_ENV === 'production' ? '5' : '3');
  const poolTimeout = process.env.DB_POOL_TIMEOUT || '10';

  return `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=${schema}&connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
}

// Ensure process.env.DATABASE_URL is populated for Prisma and any external database tools
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  process.env.DATABASE_URL = buildDatabaseUrl();
}

export const DATABASE_URL = buildDatabaseUrl();
export default DATABASE_URL;
