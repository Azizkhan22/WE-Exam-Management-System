const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('SeatingPlan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    plan_date: { type: DataTypes.DATEONLY, allowNull: false },
    created_by: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' }
  }, { tableName: 'seating_plans', timestamps: false });
};
