const { Sequelize } = require('sequelize');
const path = require('path');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
});

const Department = require('./department')(sequelize);
const Semester = require('./semester')(sequelize);
const Student = require('./student')(sequelize);
const Room = require('./room')(sequelize);
const SeatingPlan = require('./seatingPlan')(sequelize);
const AllocatedSeat = require('./allocatedSeat')(sequelize);

// Associations
Department.hasMany(Semester, { foreignKey: 'department_id', onDelete: 'CASCADE' });
Semester.belongsTo(Department, { foreignKey: 'department_id' });

Semester.hasMany(Student, { foreignKey: 'semester_id', onDelete: 'CASCADE' });
Student.belongsTo(Semester, { foreignKey: 'semester_id' });

SeatingPlan.hasMany(AllocatedSeat, { foreignKey: 'plan_id', onDelete: 'CASCADE' });
AllocatedSeat.belongsTo(SeatingPlan, { foreignKey: 'plan_id' });

Room.hasMany(AllocatedSeat, { foreignKey: 'room_id', onDelete: 'CASCADE' });
AllocatedSeat.belongsTo(Room, { foreignKey: 'room_id' });

Student.hasOne(AllocatedSeat, { foreignKey: 'student_id' });
AllocatedSeat.belongsTo(Student, { foreignKey: 'student_id' });

module.exports = {
  sequelize,
  Department,
  Semester,
  Student,
  Room,
  SeatingPlan,
  AllocatedSeat
};
