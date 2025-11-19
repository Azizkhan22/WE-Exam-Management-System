const express = require('express');
const router = express.Router();
const { Department } = require('../models');

router.get('/', async (req,res)=> res.json(await Department.findAll()));
router.post('/', async (req,res)=> {
  const { name } = req.body;
  const d = await Department.create({ name });
  res.json(d);
});
router.put('/:id', async (req,res)=> {
  const id = req.params.id;
  const d = await Department.findByPk(id);
  if(!d) return res.status(404).json({error:'not found'});
  d.name = req.body.name || d.name;
  await d.save();
  res.json(d);
});
router.delete('/:id', async (req,res)=> {
  const d = await Department.findByPk(req.params.id);
  if(!d) return res.status(404).json({error:'not found'});
  await d.destroy();
  res.json({ok:true});
});
module.exports = router;
