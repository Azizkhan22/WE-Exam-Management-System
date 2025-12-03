const { all } = require('../db');
const dayjs = require('dayjs');

// Utility: shuffle array
const shuffle = (array) => array.sort(() => Math.random() - 0.5);

// Fetch students for given semester IDs
const fetchStudentsBySemesters = async (semesterIds) => {
  if (!semesterIds.length) return [];
  const placeholders = semesterIds.map(() => '?').join(',');
  const rows = await all(
    `SELECT s.*, sem.title as semester_title,
            d.id as department_id, d.name as department_name
     FROM students s
     JOIN semesters sem ON sem.id = s.semester_id
     JOIN departments d ON d.id = sem.department_id
     WHERE sem.id IN (${placeholders})
     ORDER BY s.roll_no ASC`,
    semesterIds
  );
  return rows;
};

// Compute seat grid for a room
const computeSeatGrid = (room) => {
  const seats = [];
  for (let r = 1; r <= room.rows; r++) {
    for (let c = 1; c <= room.cols; c++) {
      if (seats.length >= room.capacity) break;
      seats.push({ roomId: room.id, seatRow: r, seatCol: c });
    }
  }
  return seats;
};

// Allocate students to rooms following adjacency rule
const allocateSeatsForRooms = (students, rooms) => {
  const allocated = [];
  const remainingStudents = [...students]; // clone
  const globalOccupied = new Set();

  const seatKey = (roomId, row, col) => `${roomId}:${row}:${col}`;

  const isConflict = (roomId, row, col, student, placed) => {
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    for (const [dr, dc] of directions) {
      const r = row + dr;
      const c = col + dc;
      const key = seatKey(roomId, r, c);
      const p = placed.find(p => p.roomId === roomId && p.seatRow === r && p.seatCol === c);
      if (p && p.department_id === student.department_id) return true;
    }
    return false;
  };

  for (const room of rooms) {
    const seatGrid = computeSeatGrid(room);
    for (const seat of seatGrid) {
      let assigned = false;
      shuffle(remainingStudents).some((student, idx) => {
        if (!isConflict(seat.roomId, seat.seatRow, seat.seatCol, student, allocated)) {
          allocated.push({ ...seat, studentId: student.id, department_id: student.department_id, semester_id: student.semester_id });
          remainingStudents.splice(idx, 1); // remove assigned
          assigned = true;
          return true;
        }
        return false;
      });
      if (!assigned) {
        allocated.push({ ...seat, studentId: null }); // leave empty
      }
      if (!remainingStudents.length) break;
    }
    if (!remainingStudents.length) break;
  }

  return allocated;
};

// Main service function for bulk plan
const allocateForPlanBulk = async ({ planId, rooms }) => {
  // Fetch all semesters
  const semesters = await all(`SELECT id FROM semesters ORDER BY id ASC`);
  const semesterIds = semesters.map(s => s.id);

  // Fetch students already allocated for this plan
  const existingAllocations = await all(
    `SELECT student_id FROM allocated_seats WHERE plan_id = ? AND student_id IS NOT NULL`,
    [planId]
  );
  const alreadyAllocatedIds = new Set(existingAllocations.map(s => s.student_id));

  const batchSize = 2; // allocate in batches of 2 semesters
  let placedRecords = [];
  let seatsAllocated = 0;

  for (let i = 0; i < semesterIds.length; i += batchSize) {
    const batch = semesterIds.slice(i, i + batchSize);
    let students = await fetchStudentsBySemesters(batch);

    // Filter out students already allocated
    students = students.filter(s => !alreadyAllocatedIds.has(s.id));
    if (!students.length) continue;

    const batchAlloc = allocateSeatsForRooms(students, rooms);
    placedRecords = placedRecords.concat(batchAlloc);
    seatsAllocated += students.length;

    // Add newly allocated student IDs to the set to prevent duplicates
    batchAlloc.forEach(s => {
      if (s.studentId) alreadyAllocatedIds.add(s.studentId);
    });
  }

  return { placedRecords, seatsAllocated };
};

module.exports = { allocateForPlanBulk };
