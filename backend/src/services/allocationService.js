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
// const allocateSeatsForRooms = (students, rooms, alreadyAllocatedSeats = new Set()) => {
//   const allocated = [];
//   const remainingStudents = [...students];

//   const seatKey = (roomId, row, col) => `${roomId}:${row}:${col}`;

//   const isConflict = (roomId, row, col, student, placed) => {
//     const directions = [
//       [-1, 0], [1, 0], [0, -1], [0, 1],
//       [-1, -1], [-1, 1], [1, -1], [1, 1]
//     ];
//     for (const [dr, dc] of directions) {
//       const r = row + dr;
//       const c = col + dc;
//       const p = placed.find(p => p.roomId === roomId && p.seatRow === r && p.seatCol === c);
//       if (p && p.department_id === student.department_id) return true;
//     }
//     return false;
//   };

//   for (const room of rooms) {
//     for (let r = 1; r <= room.rows; r++) {
//       for (let c = 1; c <= room.cols; c++) {
//         const key = seatKey(room.id, r, c);
//         if (alreadyAllocatedSeats.has(key)) continue; // skip DB or previous allocation

//         let assigned = false;
//         shuffle(remainingStudents).some((student, idx) => {
//           if (!isConflict(room.id, r, c, student, allocated)) {
//             allocated.push({
//               roomId: room.id,
//               seatRow: r,
//               seatCol: c,
//               studentId: student.id,
//               department_id: student.department_id,
//               semester_id: student.semester_id,
//             });
//             remainingStudents.splice(idx, 1);
//             alreadyAllocatedSeats.add(key);
//             assigned = true;
//             return true;
//           }
//           return false;
//         });

//         if (!assigned) {
//           allocated.push({
//             roomId: room.id,
//             seatRow: r,
//             seatCol: c,
//             studentId: null,
//           });
//           alreadyAllocatedSeats.add(key);
//         }

//         if (!remainingStudents.length) break;
//       }
//       if (!remainingStudents.length) break;
//     }
//     if (!remainingStudents.length) break;
//   }

//   return allocated;
// };
const allocateSeatsForRooms = (students, rooms, alreadyAllocatedSeats = new Set()) => {
  const allocated = [];
  const remainingStudents = [...students];

  const seatKey = (roomId, row, col) => `${roomId}:${row}:${col}`;

  const isConflict = (roomId, row, col, student, placed) => {
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    return directions.some(([dr, dc]) => {
      const p = placed.find(
        x =>
          x.roomId === roomId &&
          x.seatRow === row + dr &&
          x.seatCol === col + dc
      );
      return p && p.department_id === student.department_id;
    });
  };

  for (const room of rooms) {
    for (let r = 1; r <= room.rows; r++) {
      for (let c = 1; c <= room.cols; c++) {
        const key = seatKey(room.id, r, c);
        if (alreadyAllocatedSeats.has(key)) continue;

        let assignedIndex = -1;

        for (let i = 0; i < remainingStudents.length; i++) {
          const student = remainingStudents[i];
          if (!isConflict(room.id, r, c, student, allocated)) {
            assignedIndex = i;
            allocated.push({
              roomId: room.id,
              seatRow: r,
              seatCol: c,
              studentId: student.id,
              department_id: student.department_id,
              semester_id: student.semester_id,
            });
            alreadyAllocatedSeats.add(key);
            break;
          }
        }

        if (assignedIndex !== -1) {
          remainingStudents.splice(assignedIndex, 1);
        }

        if (!remainingStudents.length) return allocated;
      }
    }
  }

  return allocated;
};

// Main service function for bulk plan
const allocateForPlanBulk = async ({ planId, rooms }) => {
  // Get all semesters
  const semesters = await all(`SELECT id FROM semesters ORDER BY id ASC`);
  const semesterIds = semesters.map(s => s.id);

  // Students already allocated
  const existingAllocations = await all(
    `SELECT student_id, room_id, seat_row, seat_col FROM allocated_seats WHERE plan_id = ?`,
    [planId]
  );

  const alreadyAllocatedStudents = new Set(
    existingAllocations.filter(a => a.student_id).map(a => a.student_id)
  );

  const alreadyAllocatedSeats = new Set(
    existingAllocations.map(a => `${a.room_id}:${a.seat_row}:${a.seat_col}`)
  );

  const batchSize = 2;
  let placedRecords = [];
  let seatsAllocated = 0;

  for (let i = 0; i < semesterIds.length; i += batchSize) {
    const batch = semesterIds.slice(i, i + batchSize);
    let students = await fetchStudentsBySemesters(batch);

    // Filter already allocated students
    students = students.filter(s => !alreadyAllocatedStudents.has(s.id));
    if (!students.length) continue;

    const batchAlloc = allocateSeatsForRooms(students, rooms, alreadyAllocatedSeats);

    batchAlloc.forEach(s => {
      if (s.studentId) alreadyAllocatedStudents.add(s.studentId);
    });

    placedRecords = placedRecords.concat(batchAlloc);
    seatsAllocated += students.length;
  }

  return { placedRecords, seatsAllocated };
};


module.exports = { allocateForPlanBulk };
