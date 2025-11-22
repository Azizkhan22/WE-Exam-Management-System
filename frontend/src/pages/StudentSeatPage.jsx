import { useState } from 'react';
import { FiSearch, FiMapPin, FiClock, FiCheckCircle } from 'react-icons/fi';
import apiClient from '../services/api';
import PlanSeatGridReadOnly from '../components/SeatingGrid';

const StudentSeatPage = () => {
  const [roll, setRoll] = useState('');
  const [seat, setSeat] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seatingPlanDate, setSeatingPlanDate] = useState([]);  


  const handleSearch = async (e) => {
    e.preventDefault();    
    if (!roll) return;
    setLoading(true);
    setError('');
    setSeat(null);
    try {
      const { data } = await apiClient.get(`/students/seat/${roll}/${seatingPlanDate}`);
      setSeat(data);
      console.log(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Seat not found yet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 md:px-12 py-12 text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="glass p-8 border border-white/10 space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Student portal</p>
          <h1 className="text-4xl font-display">Find your seat in seconds</h1>
          <p className="text-gray-300">
            Search using your roll number. If your plan is published, you will see room, row, column,
            and invigilator details instantly.
          </p>
          <form className="flex flex-col gap-4 mt-4" onSubmit={handleSearch}>
            <div className='flex w-full gap-10'>
              <div className="flex-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4">
                <FiSearch className="text-gray-400" />
                <input
                  className="bg-transparent border-none outline-none w-full py-3 text-white placeholder-gray-400"
                  placeholder="Enter roll number e.g. CS-2023-017"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                />
              </div>
              <label className="text-sm text-gray-400 flex flex-col gap-1">
                Exam date
                <input
                  type='date'
                  className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-brand-400 outline-none"
                  required
                  onChange={(e) => setSeatingPlanDate(e.target.value)}
                />
              </label>
            </div>
            <div className='flex justify-center items-center'>
              <button
                type="submit"
                disabled={loading}
                className="w-[50%] px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent font-medium"
              >
                {loading ? 'Searching...' : 'Check'}
              </button>
            </div>

          </form>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </div>

        {seat && (
          <div className="glass p-8 border border-brand-500/20 space-y-6">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="text-emerald-400" size={32} />
              <div>
                <p className="uppercase text-xs tracking-[0.4em] text-gray-400">Seat confirmed</p>
                <h2 className="text-3xl font-display">{seat.plan_title}</h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Room</p>
                <h3 className="text-2xl font-display mt-2">{seat.room_name}</h3>
                <p className="text-sm text-gray-400">Code {seat.room_code}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Seat</p>
                <h3 className="text-2xl font-display mt-2">
                  Row {seat.seat_row} • Column {seat.seat_col}
                </h3>
                <p className="text-sm text-gray-400">Structured to minimize adjacency</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-white/10 p-4 flex items-center gap-3 bg-white/5">
                <FiMapPin className="text-brand-400" size={28} />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Invigilator</p>
                  <p>{seat.invigilator_name || 'To be announced'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 p-4 flex items-center gap-3 bg-white/5">
                <FiClock className="text-brand-400" size={28} />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Exam date</p>
                  <p>{seat.plan_date}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 p-4 flex items-center gap-3 bg-white/5">
                <FiSearch className="text-brand-400" size={28} />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Roll</p>
                  <p>{seat.roll_no}</p>
                  <p className="text-[12px] text-gray-400">{seat.semester_title}</p>
                  <p className="text-[12px] text-gray-500">{seat.department_name}</p>
                </div>
              </div>
            </div>
          </div>          
        )}
        {seat && (
          <PlanSeatGridReadOnly planId={seat.plan_id} student_id={seat.student_id} />
        )}
      </div>      
    </div>
  );
};

export default StudentSeatPage;

