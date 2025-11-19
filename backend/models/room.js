const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Room', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    rows: { type: DataTypes.INTEGER, allowNull: false },
    cols: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'rooms', timestamps: false });
};
