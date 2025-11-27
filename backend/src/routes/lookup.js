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

router.post('/departments', authMiddleware(), async (req, res) => {
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

router.put('/departments/:id', authMiddleware(), async (req, res) => {
  try {
    await run('UPDATE departments SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
    const department = await get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    res.json(department);
  } catch (error) {
    console.error('Update department error', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
});

router.delete('/departments/:id', authMiddleware(), async (req, res) => {
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
       ORDER BY sem.title ASC`
    );

    res.json(semesters);
  } catch (error) {
    console.error('Fetch semesters error', error);
    res.status(500).json({ message: 'Failed to fetch semesters' });
  }
});


router.post('/semesters', authMiddleware(), async (req, res) => {
  try {
    const { departmentId, title } = req.body;
    if (!departmentId || !title)
      return res.status(400).json({ message: 'Department and title are required' });

    const insert = await run(
      `INSERT INTO semesters (department_id, title)
       VALUES (?, ?)`,
      [departmentId, title]
    );

    const semester = await get(
      `SELECT sem.*, d.name as department_name
       FROM semesters sem
       JOIN departments d ON d.id = sem.department_id
       WHERE sem.id = ?`,
      [insert.lastID]
    );

    res.status(201).json(semester);

  } catch (error) {
    console.error('Create semester error', error);
    res.status(500).json({ message: 'Failed to create semester' });
  }
});


router.put('/semesters/:id', authMiddleware(), async (req, res) => {
  try {
    const { departmentId, title } = req.body;
    if (!departmentId || !title)
      return res.status(400).json({ message: 'Department and title are required' });

    await run(
      `UPDATE semesters
       SET department_id = ?, title = ?
       WHERE id = ?`,
      [departmentId, title, req.params.id]
    );

    const updated = await get(
      `SELECT sem.*, d.name as department_name
       FROM semesters sem
       JOIN departments d ON d.id = sem.department_id
       WHERE sem.id = ?`,
      [req.params.id]
    );

    res.json(updated);

  } catch (error) {
    console.error('Update semester error', error);
    res.status(500).json({ message: 'Failed to update semester' });
  }
});


router.delete('/semesters/:id', authMiddleware(), async (req, res) => {
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

router.post('/rooms', authMiddleware(), async (req, res) => {
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

router.put('/rooms/:id', authMiddleware(), async (req, res) => {
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

router.delete('/rooms/:id', authMiddleware(), async (req, res) => {
  try {
    await run('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete room error', error);
    res.status(500).json({ message: 'Failed to delete room' });
  }
});

// Courses
router.get('/courses', async (_req, res) => {
  try {
    const courses = await all('SELECT * FROM courses ORDER BY title ASC');
    res.json(courses);
  } catch (error) {
    console.error('Fetch courses error', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

router.post('/courses', authMiddleware(), async (req, res) => {
  try {
    const { code, title } = req.body;
    if (!code || !title) return res.status(400).json({ message: 'Code and title are required' });
    const insert = await run('INSERT INTO courses (code, title) VALUES (?, ?)', [code.trim(), title.trim()]);
    const course = await get('SELECT * FROM courses WHERE id = ?', [insert.lastID]);
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

router.put('/courses/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { code, title } = req.body;
    await run('UPDATE courses SET code = ?, title = ? WHERE id = ?', [code, title, req.params.id]);
    const course = await get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    res.json(course);
  } catch (error) {
    console.error('Update course error', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
});

router.delete('/courses/:id', authMiddleware(), async (req, res) => {
  try {
    await run('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete course error', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// Semester-Courses mapping
router.get('/semester-courses', async (_req, res) => {
  try {
    const rows = await all(
      `SELECT sc.semester_id, sc.course_id, sc.exam_date, sem.title as semester_title, c.code as course_code, c.title as course_title
       FROM semester_courses sc
       JOIN semesters sem ON sem.id = sc.semester_id
       JOIN courses c ON c.id = sc.course_id
       ORDER BY sem.id, c.title`
    );
    res.json(rows);
  } catch (error) {
    console.error('Fetch semester courses error', error);
    res.status(500).json({ message: 'Failed to fetch semester courses' });
  }
});

router.post('/semester-courses', authMiddleware(), async (req, res) => {
  try {
    const { semesterId, courseId, examDate } = req.body;
    if (!semesterId || !courseId) return res.status(400).json({ message: 'semesterId and courseId required' });
    await run('INSERT INTO semester_courses (semester_id, course_id, exam_date) VALUES (?, ?, ?)', [semesterId, courseId, examDate || null]);
    res.status(201).json({ semesterId, courseId, examDate: examDate || null });
  } catch (error) {
    console.error('Create semester-course mapping error', error);
    res.status(500).json({ message: 'Failed to create semester-course mapping' });
  }
});

router.delete('/semester-courses/:semesterId/:courseId', authMiddleware(), async (req, res) => {
  try {
    const { semesterId, courseId } = req.params;
    await run('DELETE FROM semester_courses WHERE semester_id = ? AND course_id = ?', [semesterId, courseId]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete semester-course mapping error', error);
    res.status(500).json({ message: 'Failed to delete semester-course mapping' });
  }
});

// Student-Courses mapping
router.get('/student-courses', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (studentId) {
      const rows = await all(
        `SELECT sc.student_id, sc.course_id, c.code as course_code, c.title as course_title
         FROM student_courses sc
         JOIN courses c ON c.id = sc.course_id
         WHERE sc.student_id = ?`,
        [studentId]
      );
      return res.json(rows);
    }
    const rows = await all(
      `SELECT sc.student_id, sc.course_id, c.code as course_code, c.title as course_title
       FROM student_courses sc
       JOIN courses c ON c.id = sc.course_id
       ORDER BY sc.student_id`
    );
    res.json(rows);
  } catch (error) {
    console.error('Fetch student courses error', error);
    res.status(500).json({ message: 'Failed to fetch student courses' });
  }
});

router.post('/student-courses', authMiddleware(), async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) return res.status(400).json({ message: 'studentId and courseId required' });
    await run('INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)', [studentId, courseId]);
    res.status(201).json({ studentId, courseId });
  } catch (error) {
    console.error('Create student-course mapping error', error);
    res.status(500).json({ message: 'Failed to create student-course mapping' });
  }
});

router.delete('/student-courses/:studentId/:courseId', authMiddleware(), async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    await run('DELETE FROM student_courses WHERE student_id = ? AND course_id = ?', [studentId, courseId]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete student-course mapping error', error);
    res.status(500).json({ message: 'Failed to delete student-course mapping' });
  }
});

module.exports = router;

