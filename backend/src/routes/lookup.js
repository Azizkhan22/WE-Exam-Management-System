const express = require('express');
const { run, all, get } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Departments
router.get('/departments', async (_req, res) => {
  try {
    const departments = await all('SELECT * FROM departments ORDER BY name ASC');
    res.json(departments);
  } catch (error) {
    console.error('Fetch departments error', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

router.post('/departments', authMiddleware(['admin']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const insert = await run('INSERT INTO departments (name) VALUES (?)', [name.trim()]);
    const department = await get('SELECT * FROM departments WHERE id = ?', [insert.lastID]);
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error', error);
    res.status(500).json({ message: 'Failed to create department' });
  }
});

router.put('/departments/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    await run('UPDATE departments SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
    const department = await get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    res.json(department);
  } catch (error) {
    console.error('Update department error', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
});

router.delete('/departments/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete department error', error);
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

// Semesters
router.get('/semesters', async (_req, res) => {
  try {
    const semesters = await all(
      `SELECT sem.*, d.name as department_name
       FROM semesters sem
       JOIN departments d ON d.id = sem.department_id
       ORDER BY sem.exam_date ASC`
    );
    res.json(semesters);
  } catch (error) {
    console.error('Fetch semesters error', error);
    res.status(500).json({ message: 'Failed to fetch semesters' });
  }
});

router.post('/semesters', authMiddleware(['admin']), async (req, res) => {
  try {
    const { departmentId, title, code, examDate } = req.body;
    const insert = await run(
      `INSERT INTO semesters (department_id, title, code, exam_date)
       VALUES (?, ?, ?, ?)`,
      [departmentId, title, code, examDate]
    );
    const semester = await get('SELECT * FROM semesters WHERE id = ?', [insert.lastID]);
    res.status(201).json(semester);
  } catch (error) {
    console.error('Create semester error', error);
    res.status(500).json({ message: 'Failed to create semester' });
  }
});

router.put('/semesters/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { departmentId, title, code, examDate } = req.body;
    await run(
      `UPDATE semesters
       SET department_id = ?, title = ?, code = ?, exam_date = ?
       WHERE id = ?`,
      [departmentId, title, code, examDate, req.params.id]
    );
    const semester = await get('SELECT * FROM semesters WHERE id = ?', [req.params.id]);
    res.json(semester);
  } catch (error) {
    console.error('Update semester error', error);
    res.status(500).json({ message: 'Failed to update semester' });
  }
});

router.delete('/semesters/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM semesters WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete semester error', error);
    res.status(500).json({ message: 'Failed to delete semester' });
  }
});

// Rooms
router.get('/rooms', async (_req, res) => {
  try {
    const rooms = await all('SELECT * FROM rooms ORDER BY name ASC');
    res.json(rooms);
  } catch (error) {
    console.error('Fetch rooms error', error);
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
});

router.post('/rooms', authMiddleware(['admin']), async (req, res) => {
  try {
    const { code, name, capacity, rows, cols, invigilatorName } = req.body;
    if (rows * cols < capacity) {
      return res.status(400).json({ message: 'Capacity exceeds seat grid' });
    }
    const insert = await run(
      `INSERT INTO rooms (code, name, capacity, rows, cols, invigilator_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, name, capacity, rows, cols, invigilatorName || null]
    );
    const room = await get('SELECT * FROM rooms WHERE id = ?', [insert.lastID]);
    res.status(201).json(room);
  } catch (error) {
    console.error('Create room error', error);
    res.status(500).json({ message: 'Failed to create room' });
  }
});

router.put('/rooms/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { code, name, capacity, rows, cols, invigilatorName } = req.body;
    if (rows * cols < capacity) {
      return res.status(400).json({ message: 'Capacity exceeds seat grid' });
    }
    await run(
      `UPDATE rooms
       SET code = ?, name = ?, capacity = ?, rows = ?, cols = ?, invigilator_name = ?
       WHERE id = ?`,
      [code, name, capacity, rows, cols, invigilatorName || null, req.params.id]
    );
    const room = await get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    res.json(room);
  } catch (error) {
    console.error('Update room error', error);
    res.status(500).json({ message: 'Failed to update room' });
  }
});

router.delete('/rooms/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete room error', error);
    res.status(500).json({ message: 'Failed to delete room' });
  }
});

module.exports = router;

