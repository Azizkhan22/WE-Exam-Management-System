const express = require('express');
const { all, get } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authMiddleware(['admin']), async (_req, res) => {
  try {
    const [students, rooms, plans] = await Promise.all([
      get('SELECT COUNT(*) as total FROM students'),
      get('SELECT COUNT(*) as total FROM rooms'),
      get('SELECT COUNT(*) as total FROM seating_plans'),
    ]);
    res.json({
      students: students.total,
      rooms: rooms.total,
      plans: plans.total,
    });
  } catch (error) {
    console.error('Dashboard stats error', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

router.get('/students', authMiddleware(['admin']), async (req, res) => {
  try {
    const { q = '' } = req.query;
    const students = await all(
      `SELECT s.id, s.roll_no, s.full_name
       FROM students s
       WHERE s.full_name LIKE ? OR s.roll_no LIKE ?
       ORDER BY s.roll_no ASC
       LIMIT 20`,
      [`%${q}%`, `%${q}%`]
    );
    res.json(students);
  } catch (error) {
    console.error('Search students error', error);
    res.status(500).json({ message: 'Failed to search students' });
  }
});

router.get('/rooms', authMiddleware(['admin']), async (req, res) => {
  try {
    const { q = '' } = req.query;
    const rooms = await all(
      `SELECT * FROM rooms WHERE name LIKE ? OR code LIKE ? ORDER BY name ASC`,
      [`%${q}%`, `%${q}%`]
    );
    res.json(rooms);
  } catch (error) {
    console.error('Search rooms error', error);
    res.status(500).json({ message: 'Failed to search rooms' });
  }
});

module.exports = router;

