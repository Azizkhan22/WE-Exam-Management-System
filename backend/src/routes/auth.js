const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ message: 'Failed to login' });
  }
});

router.get(
  '/me',
  authMiddleware(),
  async (req, res) => {
    try {
      const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Profile error', error);
      return res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }
);

module.exports = router;

