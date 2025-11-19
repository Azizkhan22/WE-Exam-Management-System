const express = require('express');
const router = express.Router();
const { AllocatedSeat, Student, Room, SeatingPlan, sequelize } = require('../models');
const { Op } = require('sequelize');

// get allocated seats for plan+room
router.get('/', async (req,res)=> {
  const { plan_id, room_id } = req.query;
  if(!plan_id || !room_id) return res.status(400).json({error:'plan_id and room_id required'});
  const rows = await AllocatedSeat.findAll({ where: { plan_id, room_id }, include: [{ model: Student }] });
  res.json(rows);
});

module.exports = router;
