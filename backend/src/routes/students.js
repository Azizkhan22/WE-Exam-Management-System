const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/',
  authMiddleware(['admin']),
  async (req, res) => {
    try {
      const { search = '', semesterId } = req.query;
      const clauses = [];
      const params = [];
      if (search) {
        clauses.push('(s.full_name LIKE ? OR s.roll_no LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      if (semesterId) {
        clauses.push('s.semester_id = ?');
        params.push(semesterId);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const students = await all(
        `SELECT s.*, sem.title as semester_title, sem.code as semester_code, d.name as department_name
         FROM students s
         JOIN semesters sem ON sem.id = s.semester_id
         JOIN departments d ON d.id = sem.department_id
         ${where}
         ORDER BY s.roll_no ASC`,
        params
      );
      res.json(students);
    } catch (error) {
      console.error('List students error', error);
      res.status(500).json({ message: 'Failed to fetch students' });
    }
  }
);

router.post(
  '/',
  authMiddleware(['admin']),
  async (req, res) => {
    try {
      const { fullName, rollNo, semesterId, seatPref } = req.body;
      const insert = await run(
        `INSERT INTO students (semester_id, roll_no, full_name, seat_pref)
         VALUES (?, ?, ?, ?)`,
        [semesterId, rollNo, fullName, seatPref || null]
      );
      const student = await get('SELECT * FROM students WHERE id = ?', [insert.lastID]);
      res.status(201).json(student);
    } catch (error) {
      console.error('Create student error', error);
      res.status(500).json({ message: 'Failed to create student' });
    }
  }
);

router.put(
  '/:id',
  authMiddleware(['admin']),
  async (req, res) => {
    try {
      const { fullName, rollNo, semesterId, seatPref } = req.body;
      await run(
        `UPDATE students
         SET semester_id = ?, roll_no = ?, full_name = ?, seat_pref = ?
         WHERE id = ?`,
        [semesterId, rollNo, fullName, seatPref || null, req.params.id]
      );
      const student = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
      res.json(student);
    } catch (error) {
      console.error('Update student error', error);
      res.status(500).json({ message: 'Failed to update student' });
    }
  }
);

router.delete(
  '/:id',
  authMiddleware(['admin']),
  async (req, res) => {
    try {
      await run('DELETE FROM students WHERE id = ?', [req.params.id]);
      res.status(204).end();
    } catch (error) {
      console.error('Delete student error', error);
      res.status(500).json({ message: 'Failed to delete student' });
    }
  }
);

router.get('/roll/:rollNo', async (req, res) => {
  try {
    const student = await get(
      `SELECT s.*, sem.title as semester_title, sem.code as semester_code, d.name as department_name
       FROM students s
       JOIN semesters sem ON sem.id = s.semester_id
       JOIN departments d ON d.id = sem.department_id
       WHERE s.roll_no = ?`,
      [req.params.rollNo]
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Get student by roll error', error);
    res.status(500).json({ message: 'Failed to fetch student' });
  }
});

router.get('/seat/:rollNo/:date', async (req, res) => {
  try {
    const student = await get('SELECT id FROM students WHERE roll_no = ?', [req.params.rollNo]);
    const seating_plan = await get('SELECT id FROM seating_plans WHERE plan_date = ?', [req.params.date]);
    console.log(seating_plan);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    } else if (!seating_plan) {
      return res.status(404).json({ message: 'No seating arrangement found for this date' });
    }

    const seat = await get(
      `SELECT asp.*, sp.title as plan_title, sp.plan_date, r.name as room_name, r.code as room_code,
              r.invigilator_name, r.rows, r.cols, sem.title as semester_title, d.name as department_name,
              s.roll_no
       FROM allocated_seats asp
       JOIN seating_plans sp ON sp.id = asp.plan_id
       JOIN rooms r ON r.id = asp.room_id
       JOIN students s ON s.id = asp.student_id
       JOIN semesters sem ON sem.id = s.semester_id
       JOIN departments d ON d.id = sem.department_id
       WHERE asp.student_id = ? AND asp.plan_id = ?
       ORDER BY sp.plan_date DESC
       LIMIT 1`,
      [student.id, seating_plan.id]
    );

    if (!seat) {
      return res.status(404).json({ message: 'Seat allocation not found' });
    }

    res.json(seat);
  } catch (error) {
    console.error('Fetch seat error', error);
    res.status(500).json({ message: 'Failed to fetch seat details' });
  }
});

module.exports = router;

