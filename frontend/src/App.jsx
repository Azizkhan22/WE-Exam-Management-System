import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Departments from './pages/Departments'
import Semesters from './pages/Semesters'
import Students from './pages/Students'
import Rooms from './pages/Rooms'
import SeatingWorkspace from './pages/SeatingWorkspace'

export default function App(){
  return (
    <BrowserRouter>
      <div className="app">
        <aside className="sidebar">
          <h2>Exam Seating</h2>
          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/departments">Departments</Link>
            <Link to="/semesters">Semesters</Link>
            <Link to="/students">Students</Link>
            <Link to="/rooms">Rooms</Link>
            <Link to="/workspace">Seating Workspace</Link>
          </nav>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard/>} />
            <Route path="/departments" element={<Departments/>} />
            <Route path="/semesters" element={<Semesters/>} />
            <Route path="/students" element={<Students/>} />
            <Route path="/rooms" element={<Rooms/>} />
            <Route path="/workspace" element={<SeatingWorkspace/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

