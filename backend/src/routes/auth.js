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
      role: user.role,
      email: user.email,
      fullName: user.full_name,
      studentId: user.student_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, rollNo, semesterId, seatPref } = req.body;
    if (!fullName || !email || !password || !rollNo || !semesterId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    let student = await get('SELECT * FROM students WHERE roll_no = ?', [rollNo]);
    if (!student) {
      const insert = await run(
        `INSERT INTO students (semester_id, roll_no, full_name, seat_pref)
         VALUES (?, ?, ?, ?)`,
        [semesterId, rollNo, fullName, seatPref || null]
      );
      student = await get('SELECT * FROM students WHERE id = ?', [insert.lastID]);
    } else {
      await run(
        `UPDATE students
         SET semester_id = ?, full_name = ?, seat_pref = COALESCE(?, seat_pref)
         WHERE id = ?`,
        [semesterId, fullName, seatPref || null, student.id]
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (full_name, email, password_hash, role, student_id)
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, email, passwordHash, 'student', student.id]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        fullName: user.full_name,
        studentId: user.student_id,
      },
    });
  } catch (error) {
    console.error('Register error', error);
    return res.status(500).json({ message: 'Failed to register student' });
  }
});

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
        role: user.role,
        email: user.email,
        fullName: user.full_name,
        studentId: user.student_id,
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

      let studentProfile = null;
      if (user.student_id) {
        studentProfile = await get(
          `SELECT s.*, sem.title as semester_title, sem.code as semester_code, d.name as department_name
           FROM students s
           JOIN semesters sem ON sem.id = s.semester_id
           JOIN departments d ON d.id = sem.department_id
           WHERE s.id = ?`,
          [user.student_id]
        );
      }

      return res.json({
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          fullName: user.full_name,
        },
        student: studentProfile,
      });
    } catch (error) {
      console.error('Profile error', error);
      return res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }
);

module.exports = router;

