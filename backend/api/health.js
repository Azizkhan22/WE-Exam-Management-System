import 'dotenv/config';
import { initializeDatabase } from '../src/db';

let dbReady = false;

async function ensureDb() {
  if (!dbReady) {
    await initializeDatabase();
    dbReady = true;
  }
}

export default async function handler(req, res) {
  await ensureDb();
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
}
