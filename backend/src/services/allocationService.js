const { all } = require('../db');

const fetchStudentsBySemesters = async (semesterIds = []) => {
  if (!semesterIds.length) return [];
  const placeholders = semesterIds.map(() => '?').join(',');
  // Fetch students and aggregate their enrolled course ids (if any)
  const rows = await all(
    `SELECT s.*, sem.title as semester_title,
            d.id as department_id, d.name as department_name,
            GROUP_CONCAT(DISTINCT c.id) as course_ids
     FROM students s
     JOIN semesters sem ON sem.id = s.semester_id
     JOIN departments d ON d.id = sem.department_id
     LEFT JOIN student_courses sc ON sc.student_id = s.id
     LEFT JOIN courses c ON c.id = sc.course_id
     WHERE sem.id IN (${placeholders})
     GROUP BY s.id
     ORDER BY sem.title ASC, s.roll_no ASC`,
    semesterIds
  );

  // Normalize course_ids into arrays of numbers
  return rows.map((r) => ({
    ...r,
    courseIds: r.course_ids ? r.course_ids.split(',').map((v) => Number(v)) : [],
  }));
};

const computeSeatGrid = (rooms = []) => {
  const seats = [];
  rooms.forEach((room) => {
    const limit = Math.min(room.rows * room.cols, room.capacity || room.rows * room.cols);
    let count = 0;
    outer: for (let row = 1; row <= room.rows; row += 1) {
      for (let col = 1; col <= room.cols; col += 1) {
        seats.push({
          roomId: room.id,
          seatRow: row,
          seatCol: col,
        });
        count += 1;
        if (count >= limit) {
          break outer;
        }
      }
    }
  });
  return seats;
};

const allocateSeatsRoundRobin = (students, semesterIds, seatGrid) => {
  if (!students.length) return [];
  if (!seatGrid.length) return [];

  // Create buckets by department:semester as before
  const combinationKeys = Array.from(
    new Set(
      students.map((student) => `${student.department_id || 0}:${student.semester_id || 0}`)
    )
  );

  const buckets = combinationKeys
    .map((key) => {
      const [departmentIdValue, semesterIdValue] = key.split(':').map(Number);
      return {
        key,
        departmentId: departmentIdValue,
        semesterId: semesterIdValue,
        students: students.filter(
          (student) =>
            `${student.department_id || 0}:${student.semester_id || 0}` === key &&
            semesterIds.includes(student.semester_id)
        ),
      };
    })
    .filter((bucket) => bucket.students.length);

  if (!buckets.length) return [];

  // Build a fair round-robin queue of students
  const studentQueue = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const bucket of buckets) {
      if (bucket.students.length) {
        studentQueue.push(bucket.students.shift());
        remaining = true;
      }
    }
  }

  const placed = [];
  const occupied = new Set();

  const seatKey = (s) => `${s.roomId}:${s.seatRow}:${s.seatCol}`;

  const hasConflict = (roomId, row, col, student) => {
    for (const p of placed) {
      if (p.roomId !== roomId) continue;
      const rowDiff = Math.abs(p.seatRow - row);
      const colDiff = Math.abs(p.seatCol - col);
      // Check all 8 neighbors: up, down, left, right, and 4 diagonals
      // A neighbor is any seat where rowDiff <= 1 AND colDiff <= 1 AND not the same seat
      if (rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0)) {
        // Same department
        if (p.departmentId === student.department_id) return true;
        // Same semester
        if (p.semesterId === student.semester_id) return true;
        // Overlapping courses
        if (Array.isArray(p.courseIds) && Array.isArray(student.courseIds) && p.courseIds.length > 0 && student.courseIds.length > 0) {
          const intersection = p.courseIds.some((c) => student.courseIds.includes(c));
          if (intersection) return true;
        }
      }
    }
    return false;
  };

  for (const student of studentQueue) {
    let assigned = false;
    for (let i = 0; i < seatGrid.length; i += 1) {
      const s = seatGrid[i];
      const key = `${s.roomId}:${s.seatRow}:${s.seatCol}`;
      if (occupied.has(key)) continue;

      if (hasConflict(s.roomId, s.seatRow, s.seatCol, student)) {
        continue;
      }

      const record = {
        ...s,
        studentId: student.id,
        studentRoll: student.roll_no,
        semesterId: student.semester_id,
        departmentId: student.department_id,
        courseIds: Array.isArray(student.courseIds) ? student.courseIds : [],
      };
      placed.push(record);
      occupied.add(key);
      assigned = true;
      break;
    }

    if (!assigned) {
      // couldn't find a non-conflicting seat; try to place in any remaining seat (last resort)
      for (let i = 0; i < seatGrid.length; i += 1) {
        const s = seatGrid[i];
        const key = `${s.roomId}:${s.seatRow}:${s.seatCol}`;
        if (occupied.has(key)) continue;
        const record = {
          ...s,
          studentId: student.id,
          studentRoll: student.roll_no,
          semesterId: student.semester_id,
          departmentId: student.department_id,
          courseIds: Array.isArray(student.courseIds) ? student.courseIds : [],
        };
        placed.push(record);
        occupied.add(key);
        assigned = true;
        break;
      }
    }
  }

  return placed;
};

module.exports = {
  fetchStudentsBySemesters,
  computeSeatGrid,
  allocateSeatsRoundRobin,
};

