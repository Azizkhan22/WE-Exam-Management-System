const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'exam_mgmt.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database', err);
  } else {
    console.log(`SQLite database ready at ${dbPath}`);
  }
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const migrateDatabase = async () => {
  try {
    // Check if semester_courses table exists and has exam_date column
    try {
      const semesterCoursesInfo = await all("PRAGMA table_info(semester_courses)");
      const hasExamDate = semesterCoursesInfo.some(col => col.name === 'exam_date');
      
      if (!hasExamDate) {
        console.log('Adding exam_date column to semester_courses table...');
        await run('ALTER TABLE semester_courses ADD COLUMN exam_date TEXT');
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      if (!error.message.includes('no such table')) {
        throw error;
      }
    }

    // Check if semesters table has code or exam_date columns that need to be removed
    try {
      const semestersInfo = await all("PRAGMA table_info(semesters)");
      const hasCode = semestersInfo.some(col => col.name === 'code');
      const hasExamDate = semestersInfo.some(col => col.name === 'exam_date');
      
      if (hasCode || hasExamDate) {
        console.log('Migrating semesters table to remove code and exam_date columns...');
        // SQLite doesn't support DROP COLUMN, so we need to recreate the table
        await run('BEGIN TRANSACTION');
        
        // Create new table without code and exam_date columns
        await run(`CREATE TABLE semesters_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          department_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        )`);
        
        // Copy data (excluding code and exam_date columns)
        await run('INSERT INTO semesters_new (id, department_id, title, created_at) SELECT id, department_id, title, created_at FROM semesters');
        
        // Drop old table
        await run('DROP TABLE semesters');
        
        // Rename new table
        await run('ALTER TABLE semesters_new RENAME TO semesters');
        
        await run('COMMIT');
        console.log('Semesters table migration completed');
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      if (!error.message.includes('no such table')) {
        await run('ROLLBACK').catch(() => {});
        throw error;
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
    // If migration fails, try to rollback
    try {
      await run('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors
    }
    // Don't throw - allow the app to continue even if migration fails
    // The schema creation will handle new databases
  }
};

const initializeDatabase = async () => {
  const schemaStatements = [
    'PRAGMA foreign_keys = ON',
    `CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS semester_courses (
      semester_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      exam_date TEXT,
      PRIMARY KEY (semester_id, course_id),
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      roll_no TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      seat_pref TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS student_courses (
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      PRIMARY KEY (student_id, course_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      rows INTEGER NOT NULL,
      cols INTEGER NOT NULL,
      invigilator_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS seating_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      plan_date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS plan_semesters (
      plan_id INTEGER NOT NULL,
      semester_id INTEGER NOT NULL,
      PRIMARY KEY (plan_id, semester_id),
      FOREIGN KEY (plan_id) REFERENCES seating_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS plan_rooms (
      plan_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      PRIMARY KEY (plan_id, room_id),
      FOREIGN KEY (plan_id) REFERENCES seating_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS allocated_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      seat_row INTEGER NOT NULL,
      seat_col INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      UNIQUE (plan_id, room_id, seat_row, seat_col),
      FOREIGN KEY (plan_id) REFERENCES seating_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      student_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
    )`,
  ];

  for (const statement of schemaStatements) {
    await run(statement);
  }

  // Run migrations for existing databases
  await migrateDatabase();

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@weems.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';

  const existingAdmin = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    await run(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      ['System Admin', adminEmail, passwordHash, 'admin']
    );
    console.log(`Seeded default admin: ${adminEmail} / ${adminPassword}`);
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase,
};

