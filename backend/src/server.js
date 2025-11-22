require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');
const apiRouter = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Validate required environment variables early to provide clearer errors
if (!process.env.JWT_SECRET) {
  console.error('Missing required environment variable: JWT_SECRET');
  console.error('Create a .env file in the backend folder with JWT_SECRET set to a strong secret.');
  process.exit(1);
}

app.use(
  cors({
    origin: FRONTEND_URL.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', apiRouter);

const start = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`API server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();

