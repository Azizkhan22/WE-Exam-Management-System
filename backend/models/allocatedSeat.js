const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('AllocatedSeat', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    plan_id: { type: DataTypes.INTEGER, allowNull: false },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
    seat_row: { type: DataTypes.INTEGER, allowNull: false },
    seat_col: { type: DataTypes.INTEGER, allowNull: false },
    student_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'allocated_seats',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['plan_id', 'room_id', 'seat_row', 'seat_col'] }
    ]
  });
};
