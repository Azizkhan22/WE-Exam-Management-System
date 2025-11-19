const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Student', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    semester_id: { type: DataTypes.INTEGER, allowNull: false },
    roll_no: { type: DataTypes.STRING, unique: true, allowNull: false },
    full_name: { type: DataTypes.STRING, allowNull: false },
    seat_pref: { type: DataTypes.STRING, allowNull: true }
  }, { tableName: 'students', timestamps: false, indexes: [{ fields: ['semester_id'] }, { fields: ['roll_no'] }] });
};
