const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Semester', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    exam_date: { type: DataTypes.DATEONLY, allowNull: false }
  }, { tableName: 'semesters', timestamps: false });
};
