const { sequelize, Department, Semester, Student, Room, SeatingPlan } = require('./models');

async function seed(){
  await sequelize.sync({ force: true });
  const d1 = await Department.create({ name: 'Computer Science' });
  const d2 = await Department.create({ name: 'Electrical' });

  const sem1 = await Semester.create({ department_id: d1.id, title: 'BSc CS 1', code: 'CS-1', exam_date: '2025-12-01' });
  const sem2 = await Semester.create({ department_id: d1.id, title: 'BSc CS 3', code: 'CS-3', exam_date: '2025-12-02' });
  const sem3 = await Semester.create({ department_id: d2.id, title: 'BEng E 1', code: 'E-1', exam_date: '2025-12-01' });

  // students
  for(let i=1;i<=20;i++){
    await Student.create({ semester_id: sem1.id, roll_no: 'CS1-'+String(i).padStart(3,'0'), full_name: 'Student CS1 '+i });
  }
  for(let i=1;i<=18;i++){
    await Student.create({ semester_id: sem2.id, roll_no: 'CS3-'+String(i).padStart(3,'0'), full_name: 'Student CS3 '+i });
  }
  for(let i=1;i<=15;i++){
    await Student.create({ semester_id: sem3.id, roll_no: 'E1-'+String(i).padStart(3,'0'), full_name: 'Student E1 '+i });
  }

  await Room.create({ code:'R101', name:'Room 101', capacity:30, rows:5, cols:6 });
  await Room.create({ code:'R102', name:'Room 102', capacity:20, rows:4, cols:5 });

  await SeatingPlan.create({ title:'Midterm Dec 2025', plan_date:'2025-12-01', created_by:'admin' });

  console.log('Seed done');
}
seed();
