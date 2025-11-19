const express = require('express');
const router = express.Router();
const { SeatingPlan, AllocatedSeat, Room, Student, Semester, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Basic CRUD
 */
router.get('/', async (req,res)=> res.json(await SeatingPlan.findAll()));
router.post('/', async (req,res)=> {
  const p = await SeatingPlan.create(req.body);
  res.json(p);
});
router.get('/:id', async (req,res)=> {
  const p = await SeatingPlan.findByPk(req.params.id);
  res.json(p);
});

/**
 * Allocation endpoint:
 * Body: { room_id, semester_ids: [..] }
 *
 * Algorithm:
 * - build seat grid from room.rows x room.cols
 * - fetch students grouped by semester (ordered by roll_no)
 * - create round-robin order across semesters
 * - place students into seats scanning row-major
 * - ensure no adjacent seats have same semester (if conflict, try next seat)
 * - enforce room.capacity and rows*cols limit
 */
router.post('/:id/allocate', async (req,res)=> {
  const plan_id = parseInt(req.params.id,10);
  const { room_id, semester_ids } = req.body;
  if(!room_id || !Array.isArray(semester_ids) || semester_ids.length===0) return res.status(400).json({error:'room_id and semester_ids array required'});

  const t = await sequelize.transaction();
  try {
    const room = await Room.findByPk(room_id);
    if(!room) throw new Error('Room not found');
    const seatCount = room.rows * room.cols;
    const effectiveCap = Math.min(room.capacity, seatCount);

    // fetch students per semester, deterministic order: semester_id asc, roll_no asc
    const semLists = {};
    for(const sid of semester_ids) {
      const students = await Student.findAll({
        where: { semester_id: sid },
        order: [['roll_no','ASC']]
      });
      semLists[sid] = students.map(s=> ({ id: s.id, semester_id: s.semester_id, roll_no: s.roll_no, full_name: s.full_name }));
    }

    // Build round-robin queue
    const queues = semester_ids.map(sid => [...semLists[sid]]); // arrays
    const rr = [];
    let added = true;
    while(added && rr.length < effectiveCap) {
      added = false;
      for(let q of queues) {
        if(q.length>0) {
          rr.push(q.shift());
          added = true;
          if(rr.length>=effectiveCap) break;
        }
      }
    }

    // prepare empty seat matrix (1-indexed rows/cols)
    const seats = [];
    for(let r=1;r<=room.rows;r++){
      for(let c=1;c<=room.cols;c++){
        seats.push({ row:r, col:c, student:null });
      }
    }

    // helper to check adjacent seats for same semester
    function isAdjacentSame(seatsMap, row, col, sem_id){
      const deltas = [[0,1],[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for(const d of deltas){
        const nr = row + d[0], nc = col + d[1];
        const key = nr + ':' + nc;
        if(seatsMap[key]){
          if(seatsMap[key].student && seatsMap[key].student.semester_id === sem_id) return true;
        }
      }
      return false;
    }

    // Place students scanning seats; try to avoid adjacent same-sem
    const seatsMap = {}; // key -> seat object
    let idx = 0;
    for(const s of rr){
      // find next seat for this student
      let placed = false;
      // attempt first-fit scanning from current idx to end, then from 0..idx-1
      for(let pass=0; pass<2 && !placed; pass++){
        let start = pass===0? idx : 0;
        for(let i=start;i<seats.length;i++){
          const seat = seats[i];
          const key = seat.row + ':' + seat.col;
          if(seatsMap[key] && seatsMap[key].student) continue; // occupied
          // check adjacency
          if(isAdjacentSame(seatsMap, seat.row, seat.col, s.semester_id)) continue;
          // place
          seatsMap[key] = { ...seat, student: s };
          placed = true;
          idx = i+1;
          break;
        }
      }
      // if still not placed, try any available seat (will violate adjacency if needed)
      if(!placed){
        for(let i=0;i<seats.length;i++){
          const seat = seats[i];
          const key = seat.row + ':' + seat.col;
          if(seatsMap[key] && seatsMap[key].student) continue;
          seatsMap[key] = { ...seat, student: s };
          placed = true;
          idx = i+1;
          break;
        }
      }
      if(!placed) break;
    }

    // clear previous allocations for this plan+room
    await AllocatedSeat.destroy({ where: { plan_id, room_id }, transaction: t });

    // insert allocations
    const inserts = [];
    let count = 0;
    for(const key in seatsMap){
      const s = seatsMap[key];
      if(s.student){
        inserts.push({ plan_id, room_id, seat_row: s.row, seat_col: s.col, student_id: s.student.id });
        count++;
      }
    }
    if(count > effectiveCap) throw new Error('Room capacity exceeded during allocation');

    await AllocatedSeat.bulkCreate(inserts, { transaction: t });

    await t.commit();
    res.json({ ok:true, allocated: count });
  } catch(err){
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

/**
 * Swap two seats endpoint (atomic with validation)
 * Body: { plan_id, room_id, seat1: {row,col}, seat2: {row,col} }
 */
router.post('/:id/swap', async (req,res) => {
  const plan_id = parseInt(req.params.id,10);
  const { room_id, seat1, seat2 } = req.body;
  if(!room_id || !seat1 || !seat2) return res.status(400).json({error:'room_id, seat1 and seat2 required'});
  const t = await sequelize.transaction();
  try {
    const a1 = await AllocatedSeat.findOne({ where: { plan_id, room_id, seat_row: seat1.row, seat_col: seat1.col }, transaction: t });
    const a2 = await AllocatedSeat.findOne({ where: { plan_id, room_id, seat_row: seat2.row, seat_col: seat2.col }, transaction: t });
    if(!a1 || !a2) throw new Error('Both seats must be allocated to swap');

    // swap student_ids
    const s1 = a1.student_id, s2 = a2.student_id;
    a1.student_id = s2;
    a2.student_id = s1;

    // Validate adjacency constraint for both seats after swap
    // fetch neighbor allocations for room+plan
    const all = await AllocatedSeat.findAll({ where: { plan_id, room_id }, transaction: t });
    const map = {};
    for(const a of all){
      const key = a.seat_row + ':' + a.seat_col;
      map[key] = { student_id: a.student_id };
    }
    // helper get semester id by student id
    async function getSem(student_id){
      const st = await require('../models').Student.findByPk(student_id);
      return st ? st.semester_id : null;
    }
    // set swapped values in map for check
    map[seat1.row+':'+seat1.col].student_id = a1.student_id;
    map[seat2.row+':'+seat2.col].student_id = a2.student_id;

    // check adjacency for seat1 and seat2 and neighbors
    const dirs = [[0,1],[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    async function checkSeat(row,col){
      const key = row+':'+col;
      const sid = map[key] && map[key].student_id;
      if(!sid) return false;
      const sem = await getSem(sid);
      for(const d of dirs){
        const nk = (row+d[0])+':' + (col+d[1]);
        const nsid = map[nk] && map[nk].student_id;
        if(nsid){
          const nsem = await getSem(nsid);
          if(nsem === sem) return true;
        }
      }
      return false;
    }

    const bad1 = await checkSeat(seat1.row, seat1.col);
    const bad2 = await checkSeat(seat2.row, seat2.col);
    if(bad1 || bad2) throw new Error('Swap would violate adjacency rule');

    // commit swap
    await a1.save({ transaction: t });
    await a2.save({ transaction: t });
    await t.commit();
    res.json({ ok:true });
  } catch(err){
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
