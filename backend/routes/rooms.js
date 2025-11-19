const express = require('express');
const router = express.Router();
const { Room } = require('../models');

router.get('/', async (req,res)=> res.json(await Room.findAll()));
router.post('/', async (req,res)=> {
  const r = await Room.create(req.body);
  res.json(r);
});
router.put('/:id', async (req,res)=> {
  const r = await Room.findByPk(req.params.id);
  if(!r) return res.status(404).json({error:'not found'});
  Object.assign(r, req.body);
  await r.save();
  res.json(r);
});
router.delete('/:id', async (req,res)=> {
  const r = await Room.findByPk(req.params.id);
  if(!r) return res.status(404).json({error:'not found'});
  await r.destroy();
  res.json({ok:true});
});
module.exports = router;
