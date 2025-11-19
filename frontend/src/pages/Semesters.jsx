import React, {useEffect, useState} from 'react'
import { list, create, remove } from '../api'
export default function Semesters(){
  const [items,setItems]=useState([]); const [title,setTitle]=useState(''); const [code,setCode]=useState(''); const [dept,setDept]=useState(''); const [exam,setExam]=useState('');
  useEffect(()=>{ list('departments').then(()=>{}); list('semesters').then(setItems); },[]);
  async function add(){ if(!title||!code||!dept||!exam) return alert('fill'); await create('semesters',{ title, code, department_id: parseInt(dept||0), exam_date: exam }); setItems(await list('semesters')); }
  async function del(id){ if(!confirm('Delete?')) return; await remove('semesters',id); setItems(await list('semesters')); }
  return (
    <div>
      <h1>Semesters</h1>
      <div className="card">
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input placeholder="title" value={title} onChange={e=>setTitle(e.target.value)} /><input placeholder="code" value={code} onChange={e=>setCode(e.target.value)} /><input placeholder="department_id" value={dept} onChange={e=>setDept(e.target.value)} /><input type="date" value={exam} onChange={e=>setExam(e.target.value)} /><button className="btn" onClick={add}>Add</button></div>
        <table className="table"><thead><tr><th>ID</th><th>Title</th><th>Code</th><th>Dept</th><th>Exam Date</th><th>Actions</th></tr></thead>
        <tbody>{items.map(s=> (<tr key={s.id}><td>{s.id}</td><td>{s.title}</td><td>{s.code}</td><td>{s.department_id}</td><td>{s.exam_date}</td><td><button onClick={()=>del(s.id)}>Delete</button></td></tr>))}</tbody></table>
      </div>
    </div>
  )
}

