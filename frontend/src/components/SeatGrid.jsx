import React from 'react'
export default function SeatGrid({rows,cols,allocations,selected, onSelect}){
  // allocations: map key row:col => { student_id, student }
  const grid = [];
  for(let r=1;r<=rows;r++){
    const row = [];
    for(let c=1;c<=cols;c++){
      const key = r+':'+c;
      const a = allocations[key];
      row.push(<div key={key} className={'seat ' + (a? 'taken':'empty') + (selected && selected[0]===key || selected && selected[1]===key ? ' selected':'')} onClick={()=> onSelect && onSelect(key, a)}>{ a ? (a.student ? a.student.full_name.split(' ')[0] : 'X') : '' }</div>);
    }
    grid.push(<div key={'r'+r} style={{display:'flex',gap:6, marginBottom:6}}>{row}</div>);
  }
  return <div className="card seat-grid">{grid}</div>
}

