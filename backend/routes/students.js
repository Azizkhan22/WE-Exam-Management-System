const express = require('express');
const router = express.Router();
const { Student } = require('../models');

router.get('/', async (req,res)=> {
  const q = {};
  if(req.query.semester_id) q.semester_id = req.query.semester_id;
  res.json(await Student.findAll({ where: q }));
});
router.post('/', async (req,res)=> {
  const s = await Student.create(req.body);
  res.json(s);
});
router.put('/:id', async (req,res)=> {
  const s = await Student.findByPk(req.params.id);
  if(!s) return res.status(404).json({error:'not found'});
  Object.assign(s, req.body);
  await s.save();
  res.json(s);
});
router.delete('/:id', async (req,res)=> {
  const s = await Student.findByPk(req.params.id);
  if(!s) return res.status(404).json({error:'not found'});
  await s.destroy();
  res.json({ok:true});
});
module.exports = router;
