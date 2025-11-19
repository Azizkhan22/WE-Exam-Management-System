import React, {useEffect, useState} from 'react'
import { list, allocate, getAllocated, swap } from '../api'
import SeatGrid from '../components/SeatGrid'
import jsPDF from 'jspdf'

export default function SeatingWorkspace(){
  const [plans,setPlans]=useState([]); const [rooms,setRooms]=useState([]); const [sems,setSems]=useState([]); const [planId,setPlanId]=useState(1); const [roomId,setRoomId]=useState(null); const [selectedSems,setSelectedSems]=useState([]); const [allocations,setAllocations]=useState({}); const [roomMeta,setRoomMeta]=useState({rows:0,cols:0}); const [selSeats,setSelSeats]=useState([])

  useEffect(()=>{ list('seating_plans').then(setPlans); list('rooms').then(r=>{ setRooms(r); if(r[0]) setRoomId(r[0].id); }); list('semesters').then(setSems); },[]);

  async function doAllocate(){
    if(!planId || !roomId || selectedSems.length===0) return alert('select plan, room, semesters');
    await allocate(planId, { room_id: roomId, semester_ids: selectedSems.map(Number) });
    await fetchAlloc();
  }
  async function fetchAlloc(){
    const data = await getAllocated(planId, roomId);
    const map = {};
    let rows = 0, cols = 0;
    data.forEach(a=>{
      map[a.seat_row+':'+a.seat_col] = { student_id: a.student_id, student: a.Student };
      rows = Math.max(rows, a.seat_row); cols = Math.max(cols, a.seat_col);
    });
    setAllocations(map);
    setRoomMeta({ rows, cols });
  }

  useEffect(()=>{ if(roomId && planId) fetchAlloc(); },[roomId, planId]);

  function toggleSem(id){
    setSelectedSems(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  }

  function onSeatSelect(key, a){
    if(selSeats.includes(key)) setSelSeats(s=> s.filter(x=>x!==key));
    else if(selSeats.length<2) setSelSeats(s=> [...s, key]);
  }

  async function doSwap(){
    if(selSeats.length!==2) return alert('select two seats');
    const s1 = selSeats[0].split(':').map(Number); const s2 = selSeats[1].split(':').map(Number);
    try{
      await swap(planId, { room_id: roomId, seat1:{row:s1[0],col:s1[1]}, seat2:{row:s2[0],col:s2[1]} });
      setSelSeats([]); fetchAlloc();
      alert('Swapped');
    }catch(e){ alert('Swap failed: '+e.message); }
  }

  function exportPdf(){
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Seating - Room '+ (rooms.find(r=>r.id===roomId)?.code || ''), 10, 10);
    let y = 20;
    for(let r=1;r<= (roomMeta.rows||5); r++){
      let rowText = '';
      for(let c=1;c<= (roomMeta.cols||5); c++){
        const key = r+':'+c;
        const a = allocations[key];
        rowText += (a && a.student ? a.student.roll_no : '---') + '  ';
      }
      doc.text(rowText, 10, y);
      y += 8;
    }
    doc.save('seating_room.pdf');
  }

  return (
    <div>
      <h1>Seating Workspace</h1>
      <div className="card controls">
        <label>Plan: <select value={planId} onChange={e=>setPlanId(Number(e.target.value))}>{plans.map(p=> <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Room: <select value={roomId||''} onChange={e=>setRoomId(Number(e.target.value))}>{rooms.map(r=> <option key={r.id} value={r.id}>{r.code} ({r.rows}x{r.cols})</option>)}</select></label>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {sems.map(s=> <label key={s.id} style={{marginRight:8}}><input type="checkbox" value={s.id} onChange={()=>toggleSem(s.id)} /> {s.code}</label>)}
        </div>
        <button className="btn" onClick={doAllocate}>Allocate</button>
        <button className="btn" onClick={fetchAlloc}>Refresh</button>
        <button className="btn" onClick={doSwap}>Swap Selected</button>
        <button className="btn" onClick={exportPdf}>Export PDF</button>
      </div>

      <div>
        <SeatGrid rows={rooms.find(r=>r.id===roomId)?.rows || roomMeta.rows || 5} cols={rooms.find(r=>r.id===roomId)?.cols || roomMeta.cols || 5} allocations={allocations} selected={selSeats} onSelect={onSeatSelect} />
      </div>
    </div>
  )
}

