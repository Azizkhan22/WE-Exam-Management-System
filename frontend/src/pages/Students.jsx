import React, {useEffect, useState} from 'react'
import { list, create, remove } from '../api'
export default function Students(){
  const [items,setItems]=useState([]); const [name,setName]=useState(''); const [roll,setRoll]=useState(''); const [sem,setSem]=useState('');
  useEffect(()=>{ list('students').then(setItems); },[]);
  async function add(){ if(!name||!roll||!sem) return alert('fill'); await create('students',{ full_name:name, roll_no:roll, semester_id: parseInt(sem) }); setItems(await list('students')); setName(''); setRoll(''); setSem(''); }
  async function del(id){ if(!confirm('Delete?')) return; await remove('students',id); setItems(await list('students')); }
  return (
    <div>
      <h1>Students</h1>
      <div className="card">
        <div style={{display:'flex',gap:8}}><input placeholder="full name" value={name} onChange={e=>setName(e.target.value)} /><input placeholder="roll no" value={roll} onChange={e=>setRoll(e.target.value)} /><input placeholder="semester_id" value={sem} onChange={e=>setSem(e.target.value)} /><button className="btn" onClick={add}>Add</button></div>
        <table className="table"><thead><tr><th>ID</th><th>Roll</th><th>Name</th><th>Semester</th><th>Actions</th></tr></thead>
        <tbody>{items.map(s=> (<tr key={s.id}><td>{s.id}</td><td>{s.roll_no}</td><td>{s.full_name}</td><td>{s.semester_id}</td><td><button onClick={()=>del(s.id)}>Delete</button></td></tr>))}</tbody></table>
      </div>
    </div>
  )
}

