const { Database } = require("@tursodatabase/database");
const bcrypt = require("bcryptjs");

// Connect to Turso via DATABASE_URL
const db = new Database(process.env.DATABASE_URL);

// Promisify Turso methods similar to your SQLite code
const run = async (sql, params = []) => {
  return await db.run(sql, params);
};

const get = async (sql, params = []) => {
  return await db.get(sql, params);
};

const all = async (sql, params = []) => {
  return await db.all(sql, params);
};

// Initialize all tables and seed default admin
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
      exam_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS semester_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,            
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      roll_no TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
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
      student_id INTEGER,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  // Run each table creation statement
  for (const stmt of schemaStatements) {
    await run(stmt);
  }

  // Seed default admin
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn("Skipping admin seeding: DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set");
    return;
  }

  const existingAdmin = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    await run(
      `INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)`,
      ['System Admin', adminEmail, passwordHash]
    );
    console.log(`Seeded default admin: ${adminEmail}`);
  }
};

module.exports = { db, run, get, all, initializeDatabase };
