const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Department', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false }
  }, { tableName: 'departments', timestamps: false });
};
