require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('../src/db');
const apiRouter = require('../src/routes');

const app = express();

// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS
app.use(
  cors({
    origin: [FRONTEND_URL],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Ensure database initialized before routes
let dbReady = false;
async function ensureDb() {
  if (!dbReady) {
    await initializeDatabase();
    dbReady = true;
  }
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error('Database init failed:', err);
    res.status(500).json({ message: 'Database unavailable' });
  }
});

// Routes
app.use('/api', apiRouter);

// Export app for Vercel serverless (no listen)
module.exports = app;
