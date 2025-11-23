const express = require('express');
const dayjs = require('dayjs');
const { authMiddleware } = require('../middleware/auth');
const { run, all, get } = require('../db');
const {
  fetchStudentsBySemesters,
  computeSeatGrid,
  allocateSeatsRoundRobin,
} = require('../services/allocationService');

const router = express.Router();

const buildInClause = (items = []) => items.map(() => '?').join(',');

router.get('/', authMiddleware(['admin']), async (_req, res) => {
  try {
    const plans = await all(
      `SELECT sp.*,
              (SELECT COUNT(*) FROM allocated_seats WHERE plan_id = sp.id) as seat_count
       FROM seating_plans sp
       ORDER BY sp.plan_date DESC`
    );
    res.json(plans);
  } catch (error) {
    console.error('List plans error', error);
    res.status(500).json({ message: 'Failed to fetch plans' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await get('SELECT * FROM seating_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const semesters = await all(
      `SELECT ps.semester_id, sem.title, sem.code
       FROM plan_semesters ps
       JOIN semesters sem ON sem.id = ps.semester_id
       WHERE ps.plan_id = ?`,
      [plan.id]
    );

    const rooms = await all(
      `SELECT pr.room_id, r.*
       FROM plan_rooms pr
       JOIN rooms r ON r.id = pr.room_id
       WHERE pr.plan_id = ?`,
      [plan.id]
    );

    const allocations = await all(
      `SELECT a.*, s.full_name, s.roll_no, sem.title as semester_title, r.name as room_name, r.code as room_code,
              d.name as department_name
       FROM allocated_seats a
       JOIN students s ON s.id = a.student_id
       JOIN semesters sem ON sem.id = s.semester_id
       JOIN departments d ON d.id = sem.department_id
       JOIN rooms r ON r.id = a.room_id
       WHERE a.plan_id = ?
       ORDER BY r.name, a.seat_row, a.seat_col`,
      [plan.id]
    );

    res.json({ plan, semesters, rooms, allocations });
  } catch (error) {
    console.error('Get plan error', error);
    res.status(500).json({ message: 'Failed to fetch plan' });
  }
});

router.post('/', authMiddleware(['admin']), async (req, res) => {
  const { title, planDate, createdBy, status = 'draft', semesterIds, roomId } = req.body;
  if (!title || !planDate || !createdBy || !Array.isArray(semesterIds) || !roomId) {
    return res.status(400).json({ message: 'Missing plan details' });
  }

  try {
    const parsedDate = dayjs(planDate).format('YYYY-MM-DD');
    if (!semesterIds.length) {
      return res.status(400).json({ message: 'At least one semester and room required' });
    }

    const selectedRoom = await get(
      `SELECT * FROM rooms WHERE id = ?`,
      [roomId]
    );

    if (!selectedRoom) {
      return res.status(400).json({ message: 'Invalid room selection' });
    }

    const selectedRoomdData = {
      id: Number(selectedRoom.id),
      capacity: Number(selectedRoom.capacity),
      rows: Number(selectedRoom.rows),
      cols: Number(selectedRoom.cols),
    };

    const seatGrid = computeSeatGrid(selectedRoomdData);

    const students = await fetchStudentsBySemesters(semesterIds);
    if (!students.length) {
      return res.status(400).json({ message: 'No students available for chosen semesters' });
    }

    if (seatGrid.length < students.length) {
      return res.status(400).json({
        message: `Insufficient seats (${seatGrid.length}) for ${students.length} students`,
      });
    }

    const assignments = allocateSeatsRoundRobin(students, semesterIds, seatGrid);

    await run('BEGIN IMMEDIATE TRANSACTION');

    const planInsert = await run(
      `INSERT INTO seating_plans (title, plan_date, created_by, status)
       VALUES (?, ?, ?, ?)`,
      [title, parsedDate, createdBy, status]
    );
    const planId = planInsert.lastID;

    await Promise.all(
      semesterIds.map((semesterId) =>
        run('INSERT INTO plan_semesters (plan_id, semester_id) VALUES (?, ?)', [planId, semesterId])
      )
    );

    await run(
      'INSERT INTO plan_rooms (plan_id, room_id) VALUES (?, ?)',
      [planId, selectedRoom.id]
    );


    await Promise.all(
      assignments.map((seat) =>
        run(
          `INSERT INTO allocated_seats (plan_id, room_id, seat_row, seat_col, student_id)
           VALUES (?, ?, ?, ?, ?)`,
          [planId, seat.roomId, seat.seatRow, seat.seatCol, seat.studentId]
        )
      )
    );

    await run('COMMIT');

    const plan = await get('SELECT * FROM seating_plans WHERE id = ?', [planId]);
    res.status(201).json({ plan, seatsAllocated: assignments.length });
  } catch (error) {
    console.error('Create plan error', error);
    await run('ROLLBACK').catch(() => { });
    res.status(500).json({ message: 'Failed to create plan' });
  }
});

router.post('/:id/swap', authMiddleware(['admin']), async (req, res) => {
  const { seatA, seatB } = req.body;
  if (!seatA || !seatB) return res.status(400).json({ message: 'Both seats required' });

  try {
    await run('BEGIN IMMEDIATE TRANSACTION');

    const seatQuery = `SELECT * FROM allocated_seats
                       WHERE plan_id = ? AND room_id = ? AND seat_row = ? AND seat_col = ?`;

    const firstSeat = await get(seatQuery, [req.params.id, seatA.roomId, seatA.row, seatA.col]);
    const secondSeat = await get(seatQuery, [req.params.id, seatB.roomId, seatB.row, seatB.col]);

    if (!firstSeat || !secondSeat) {
      await run('ROLLBACK');
      return res.status(404).json({ message: 'Seat not found' });
    }

    await run(
      `UPDATE allocated_seats SET student_id = ? WHERE id = ?`,
      [secondSeat.student_id, firstSeat.id]
    );
    await run(
      `UPDATE allocated_seats SET student_id = ? WHERE id = ?`,
      [firstSeat.student_id, secondSeat.id]
    );

    await run('COMMIT');
    res.json({ message: 'Seats swapped successfully' });
  } catch (error) {
    console.error('Swap seats error', error);
    await run('ROLLBACK').catch(() => { });
    res.status(500).json({ message: 'Failed to swap seats' });
  }
});

router.get('/:id/export', authMiddleware(['admin']), async (req, res) => {
  try {
    const allocations = await all(
      `SELECT a.*, s.full_name, s.roll_no, sem.title as semester_title,
              d.name as department_name,
              r.code as room_code, r.name as room_name, r.invigilator_name, r.rows, r.cols
       FROM allocated_seats a
       JOIN students s ON s.id = a.student_id
       JOIN semesters sem ON sem.id = s.semester_id
       JOIN departments d ON d.id = sem.department_id
       JOIN rooms r ON r.id = a.room_id
       WHERE a.plan_id = ?
       ORDER BY r.name, a.seat_row, a.seat_col`,
      [req.params.id]
    );

    const grouped = allocations.reduce((acc, seat) => {
      if (!acc[seat.room_id]) {
        acc[seat.room_id] = {
          roomId: seat.room_id,
          roomCode: seat.room_code,
          roomName: seat.room_name,
          invigilator: seat.invigilator_name,
          rows: seat.rows,
          cols: seat.cols,
          seats: [],
        };
      }
      acc[seat.room_id].seats.push({ ...seat, department_name: seat.department_name });
      return acc;
    }, {});

    res.json({ rooms: Object.values(grouped) });
  } catch (error) {
    console.error('Export plan error', error);
    res.status(500).json({ message: 'Failed to export plan' });
  }
});

module.exports = router;

