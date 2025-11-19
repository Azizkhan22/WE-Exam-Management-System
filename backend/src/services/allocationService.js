const { all } = require('../db');

const fetchStudentsBySemesters = async (semesterIds = []) => {
  if (!semesterIds.length) return [];
  const placeholders = semesterIds.map(() => '?').join(',');
  return all(
    `SELECT s.*, sem.title as semester_title, sem.code as semester_code,
            d.id as department_id, d.name as department_name
     FROM students s
     JOIN semesters sem ON sem.id = s.semester_id
     JOIN departments d ON d.id = sem.department_id
     WHERE sem.id IN (${placeholders})
     ORDER BY sem.code ASC, s.roll_no ASC`,
    semesterIds
  );
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

  if (!buckets.length) {
    return [];
  }

  const seats = [];
  let bucketIndex = 0;
  for (let i = 0; i < seatGrid.length; i += 1) {
    const activeBuckets = buckets.filter((bucket) => bucket.students.length);
    if (!activeBuckets.length) break;

    if (!buckets[bucketIndex] || buckets[bucketIndex].students.length === 0) {
      bucketIndex = buckets.findIndex((bucket) => bucket.students.length);
    }
    if (bucketIndex < 0) break;

    const bucket = buckets[bucketIndex];
    const student = bucket.students.shift();
    if (!student) {
      i -= 1;
      bucketIndex = (bucketIndex + 1) % buckets.length;
      continue;
    }

    seats.push({
      ...seatGrid[i],
      studentId: student.id,
      studentRoll: student.roll_no,
      semesterId: bucket.semesterId,
      departmentId: bucket.departmentId,
    });

    bucketIndex = (bucketIndex + 1) % buckets.length;
  }

  return seats;
};

module.exports = {
  fetchStudentsBySemesters,
  computeSeatGrid,
  allocateSeatsRoundRobin,
};

