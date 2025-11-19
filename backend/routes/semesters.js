const express = require('express');
const router = express.Router();
const { Semester } = require('../models');

router.get('/', async (req,res)=> res.json(await Semester.findAll()));
router.post('/', async (req,res)=> {
  const s = await Semester.create(req.body);
  res.json(s);
});
router.put('/:id', async (req,res)=> {
  const s = await Semester.findByPk(req.params.id);
  if(!s) return res.status(404).json({error:'not found'});
  Object.assign(s, req.body);
  await s.save();
  res.json(s);
});
router.delete('/:id', async (req,res)=> {
  const s = await Semester.findByPk(req.params.id);
  if(!s) return res.status(404).json({error:'not found'});
  await s.destroy();
  res.json({ok:true});
});
module.exports = router;
