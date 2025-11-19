import React, {useEffect, useState} from 'react'
import { list, create, remove } from '../api'
export default function Rooms(){
  const [items,setItems]=useState([]); const [code,setCode]=useState(''); const [name,setName]=useState(''); const [cap,setCap]=useState(0); const [rows,setRows]=useState(1); const [cols,setCols]=useState(1);
  useEffect(()=>{ list('rooms').then(setItems); },[]);
  async function add(){ if(!code||!name) return alert('fill'); await create('rooms',{ code, name, capacity: parseInt(cap), rows: parseInt(rows), cols: parseInt(cols) }); setItems(await list('rooms')); }
  async function del(id){ if(!confirm('Delete?')) return; await remove('rooms',id); setItems(await list('rooms')); }
  return (
    <div>
      <h1>Rooms</h1>
      <div className="card">
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input placeholder="code" value={code} onChange={e=>setCode(e.target.value)} /><input placeholder="name" value={name} onChange={e=>setName(e.target.value)} /><input placeholder="capacity" value={cap} onChange={e=>setCap(e.target.value)} /><input placeholder="rows" value={rows} onChange={e=>setRows(e.target.value)} /><input placeholder="cols" value={cols} onChange={e=>setCols(e.target.value)} /><button className="btn" onClick={add}>Add</button></div>
        <table className="table"><thead><tr><th>ID</th><th>Code</th><th>Name</th><th>Cap</th><th>R</th><th>C</th><th>Actions</th></tr></thead>
        <tbody>{items.map(r=> (<tr key={r.id}><td>{r.id}</td><td>{r.code}</td><td>{r.name}</td><td>{r.capacity}</td><td>{r.rows}</td><td>{r.cols}</td><td><button onClick={()=>del(r.id)}>Delete</button></td></tr>))}</tbody></table>
      </div>
    </div>
  )
}

