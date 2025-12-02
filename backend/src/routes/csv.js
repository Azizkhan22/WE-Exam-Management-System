const express = require('express');
const router = express.Router();
const upload = require("../services/upload");
const fs = require("fs");
const csv = require("csv-parser");
const db = require("../db");

router.post("/csv", upload.single("csv"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
    }

    const filePath = req.file.path;
    const rows = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
            try {
                // Temporary maps for resolving relations
                const departmentMap = {}; // name -> id
                const courseMap = {};     // title -> id
                const semesterMap = {};   // title -> id

                // 1️⃣ Create Departments
                for (const row of rows.filter(r => r.type === "department")) {
                    if (!row.name) continue;
                    const existing = await db.get("SELECT id FROM departments WHERE name = ?", [row.name]);
                    if (existing) {
                        departmentMap[row.name] = existing.id;
                    } else {
                        const result = await db.run("INSERT INTO departments (name) VALUES (?)", [row.name]);
                        departmentMap[row.name] = result.lastID;
                    }
                }

                // 2️⃣ Create Courses
                for (const row of rows.filter(r => r.type === "course")) {
                    if (!row.title) continue;
                    const existing = await db.get("SELECT id FROM courses WHERE title = ?", [row.title]);
                    if (existing) {
                        courseMap[row.title] = existing.id;
                    } else {
                        const result = await db.run(
                            "INSERT INTO courses (title, code, exam_date) VALUES (?, ?, ?)",
                            [row.title, row.code || null, row.exam_date || null]
                        );
                        courseMap[row.title] = result.lastID;
                    }
                }

                // 3️⃣ Create Semesters & Semester_Courses
                for (const row of rows.filter(r => r.type === "semester")) {
                    if (!row.title || !row.department_name) continue;
                    const deptId = departmentMap[row.department_name];
                    if (!deptId) throw new Error(`Department not found: ${row.department_name}`);

                    // Insert semester
                    const existingSem = await db.get(
                        "SELECT id FROM semesters WHERE title = ? AND department_id = ?",
                        [row.title, deptId]
                    );

                    let semesterId;
                    if (existingSem) {
                        semesterId = existingSem.id;
                    } else {
                        const result = await db.run(
                            "INSERT INTO semesters (title, department_id) VALUES (?, ?)",
                            [row.title, deptId]
                        );
                        semesterId = result.lastID;
                    }
                    semesterMap[row.title] = semesterId;

                    // Link courses (semester_courses)
                    if (row.courses) {
                        const courseNames = row.courses.split(",").map(c => c.trim());
                        for (const cname of courseNames) {
                            const courseId = courseMap[cname];
                            if (!courseId) throw new Error(`Course not found: ${cname}`);
                            await db.run(
                                "INSERT OR IGNORE INTO semester_courses (semester_id, course_id) VALUES (?, ?)",
                                [semesterId, courseId]
                            );
                        }
                    }
                }

                // 4️⃣ Create Students                
                for (const row of rows.filter(r => r.type === "student")) {
                    if (!row.full_name || !row.roll_no || !row.semester_title) continue;

                    // Split "Semester Title - Department Name"
                    const [semesterTitle, departmentName] = row.semester_title.split("-").map(s => s.trim());
                    if (!semesterTitle || !departmentName) {
                        throw new Error(`Invalid semester_title format for student ${row.full_name}. Expected "Semester Title - Department Name"`);
                    }

                    // Find department id
                    const deptId = departmentMap[departmentName];
                    if (!deptId) throw new Error(`Department not found: ${departmentName}`);

                    // Find semester id within that department
                    const semester = await db.get(
                        "SELECT id FROM semesters WHERE title = ? AND department_id = ?",
                        [semesterTitle, deptId]
                    );
                    if (!semester) throw new Error(`Semester not found: ${semesterTitle} in department ${departmentName}`);

                    // Insert student
                    await db.run(
                        "INSERT OR IGNORE INTO students (semester_id, roll_no, full_name) VALUES (?, ?, ?)",
                        [semester.id, row.roll_no, row.full_name]
                    );
                }


                // 5️⃣ Create Rooms
                for (const row of rows.filter(r => r.type === "room")) {
                    if (!row.code || !row.name || !row.capacity || !row.rows || !row.cols) continue;
                    await db.run(
                        `INSERT OR IGNORE INTO rooms 
                        (code, name, capacity, rows, cols, invigilator_name) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [row.code, row.name, row.capacity, row.rows, row.cols, row.invigilator_name || null]
                    );
                }

                // Delete temp CSV file
                fs.unlinkSync(filePath);

                res.json({ message: "CSV imported successfully!" });

            } catch (err) {
                console.error(err);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.status(500).json({ message: err.message });
            }
        });
}

);

module.exports = router;