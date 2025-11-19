import React, {useEffect, useState} from 'react'
import { list, create, update, remove } from '../api'
export default function Departments(){
  const [items,setItems]=useState([]); const [name,setName]=useState('');
  useEffect(()=>{ list('departments').then(setItems); },[]);
  async function add(){ if(!name) return; await create('departments', {name}); setName(''); setItems(await list('departments')); }
  async function del(id){ if(!confirm('Delete?')) return; await remove('departments',id); setItems(await list('departments')); }
  return (
    <div>
      <h1>Departments</h1>
      <div className="card">
        <div style={{display:'flex',gap:8}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="department name" /><button className="btn" onClick={add}>Add</button></div>
        <table className="table"><thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead>
        <tbody>{items.map(d=> (<tr key={d.id}><td>{d.id}</td><td>{d.name}</td><td><button onClick={()=>del(d.id)}>Delete</button></td></tr>))}</tbody></table>
      </div>
    </div>
  )
}

