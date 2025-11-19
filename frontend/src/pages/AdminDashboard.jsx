import { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiGrid, FiLayers, FiDownload, FiRefreshCw } from 'react-icons/fi';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import apiClient from '../services/api';
import { useAuthStore } from '../store/authStore';

const DashboardCard = ({ label, value, icon }) => (
  <div className="glass p-6 border border-white/10 flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-400">
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm uppercase tracking-[0.4em]">{label}</p>
      <p className="text-3xl font-display">{value}</p>
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <label className="text-sm text-gray-400 flex flex-col gap-1">
    {label}
    <input
      {...props}
      className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-brand-400 outline-none"
    />
  </label>
);

const Select = ({ label, children, ...props }) => (
  <label className="text-sm text-gray-400 flex flex-col gap-1">
    {label}
    <select
      {...props}
      className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-brand-400 outline-none"
    >
      {children}
    </select>
  </label>
);

const SeatGrid = ({ room, allocations, onSeatPick, selectedSeat }) => {
  const roomId = room.room_id || room.id;
  const rows = Number(room.rows) || 0;
  const cols = Number(room.cols) || 0;
  const capacity = Number(room.capacity) || rows * cols;
  const seatMap = useMemo(() => {
    const map = {};
    allocations.forEach((seat) => {
      map[`${seat.seat_row}-${seat.seat_col}`] = seat;
    });
    return map;
  }, [allocations]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase text-xs tracking-[0.4em] text-gray-400">Room</p>
          <h3 className="text-2xl font-display">{room.name}</h3>
          <p className="text-sm text-gray-400">
            {room.code} • {room.invigilator_name || 'Invigilator TBD'}
          </p>
        </div>
        <div className="text-sm text-gray-400">
          Capacity {capacity} • Grid {rows}x{cols}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 p-4 bg-white/5">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows }).map((_, rowIndex) =>
            Array.from({ length: cols }).map((_, colIndex) => {
              const row = rowIndex + 1;
              const col = colIndex + 1;
              const seat = seatMap[`${row}-${col}`];
              const key = `${row}-${col}`;
              const isSelected =
                selectedSeat &&
                selectedSeat.seat_row === row &&
                selectedSeat.seat_col === col &&
                selectedSeat.room_id === roomId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => seat && onSeatPick({ ...seat, room_id: roomId, room_name: room.name })}
                  className={`rounded-2xl px-3 py-2 text-left border text-xs transition ${
                    seat
                      ? 'bg-brand-500/10 border-brand-500/40 text-white hover:bg-brand-500/20'
                      : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                  } ${isSelected ? 'ring-2 ring-accent' : ''}`}
                >
                  {seat ? (
                    <>
                      <p className="font-semibold">{seat.roll_no}</p>
                      <p className="text-[10px] text-gray-200 truncate">{seat.full_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {seat.semester_title || 'Semester TBD'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {seat.department_name || 'Department TBD'}
                      </p>
                    </>
                  ) : (
                    'EMPTY'
                  )}
                </button>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Click two occupied seats to trigger a validated swap. The backend enforces uniqueness and
          atomic updates.
        </p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ students: 0, rooms: 0, plans: 0 });
  const [plans, setPlans] = useState([]);
  const [planDetail, setPlanDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('');
  const [swapSeat, setSwapSeat] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [primaryForm, setPrimaryForm] = useState({
    title: '',
    planDate: dayjs().format('YYYY-MM-DD'),
    roomId: '',
    semesterIds: [],
  });

  const roomsForPlan = useMemo(
    () =>
      planDetail?.rooms?.map((room) => ({
        ...room,
        displayId: Number(room.room_id || room.id),
      })) || [],
    [planDetail]
  );

  const activeRoom = useMemo(
    () => roomsForPlan.find((room) => room.displayId === activeRoomId),
    [roomsForPlan, activeRoomId]
  );

  const activeAllocations = useMemo(() => {
    if (!planDetail || !activeRoomId) return [];
    return planDetail.allocations.filter((seat) => seat.room_id === activeRoomId);
  }, [planDetail, activeRoomId]);

  const loadCoreData = async (preferredPlanId = null) => {
    setLoading(true);
    try {
      const [deps, sems, rms, statsRes, plansRes] = await Promise.all([
        apiClient.get('/catalog/departments'),
        apiClient.get('/catalog/semesters'),
        apiClient.get('/catalog/rooms'),
        apiClient.get('/search/stats'),
        apiClient.get('/plans'),
      ]);
      setDepartments(deps.data);
      setSemesters(sems.data);
      setRooms(rms.data);
      setStats(statsRes.data);
      setPlans(plansRes.data);
      if (plansRes.data.length) {
        const nextPlanId =
          preferredPlanId && plansRes.data.some((plan) => plan.id === preferredPlanId)
            ? preferredPlanId
            : plansRes.data[0].id;
        await handlePlanSelect(nextPlanId);
      } else {
        setPlanDetail(null);
        setActivePlanId(null);
        setActiveRoomId(null);
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoreData();
  }, []);

  useEffect(() => {
    setSwapSeat(null);
  }, [planDetail?.plan?.id]);

  const handlePlanSelect = async (planId, options = {}) => {
    setPlanLoading(true);
    try {
      const { data } = await apiClient.get(`/plans/${planId}`);
      setPlanDetail(data);
      setActivePlanId(planId);
      const defaultRoom =
        options.roomId ??
        data.rooms?.[0]?.room_id ??
        data.rooms?.[0]?.roomId ??
        data.rooms?.[0]?.id ??
        null;
      setActiveRoomId(typeof defaultRoom === 'number' ? defaultRoom : defaultRoom ? Number(defaultRoom) : null);
    } catch (error) {
      console.error('Failed to load plan detail', error);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleEntityCreate = async (endpoint, payload) => {
    try {
      await apiClient.post(endpoint, payload);
      setFormStatus('Saved successfully');
      await loadCoreData();
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Failed to save');
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!primaryForm.roomId) {
      setFormStatus('Choose a classroom to generate its layout');
      return;
    }
    if (!primaryForm.semesterIds.length) {
      setFormStatus('Select the semesters that should appear in this room');
      return;
    }
    try {
      const { data } = await apiClient.post('/plans', {
        title:
          primaryForm.title ||
          `${rooms.find((room) => String(room.id) === primaryForm.roomId)?.name || 'Room plan'} • ${dayjs(primaryForm.planDate).format('MMM D')}`,
        planDate: primaryForm.planDate,
        createdBy: user?.fullName || 'Admin',
        status: 'published',
        semesterIds: primaryForm.semesterIds.map(Number),
        roomIds: [Number(primaryForm.roomId)],
      });
      setPrimaryForm((prev) => ({ ...prev, title: '' }));
      setSwapSeat(null);
      setFormStatus('Seating magically arranged ✦');
      await loadCoreData(data.plan.id);
      setActiveRoomId(Number(primaryForm.roomId));
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Failed to create plan');
    }
  };

  const handleSeatSwap = async (seatA, seatB) => {
    if (!planDetail?.plan?.id) return;
    try {
      await apiClient.post(`/plans/${planDetail.plan.id}/swap`, {
        seatA: { roomId: seatA.room_id, row: seatA.seat_row, col: seatA.seat_col },
        seatB: { roomId: seatB.room_id, row: seatB.seat_row, col: seatB.seat_col },
      });
      await handlePlanSelect(planDetail.plan.id);
      setFormStatus('Seats swapped');
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Swap failed');
    }
  };

  const handleSeatPick = (seat) => {
    if (!swapSeat) {
      setSwapSeat(seat);
      return;
    }
    if (swapSeat.id === seat.id) {
      setSwapSeat(null);
      return;
    }
    handleSeatSwap(swapSeat, seat);
    setSwapSeat(null);
  };

  const handleRoomSwitch = (roomId) => {
    setActiveRoomId(roomId);
    setSwapSeat(null);
  };

  const handleExportPdf = async () => {
    if (!planDetail?.plan?.id) return;
    try {
      const { data } = await apiClient.get(`/plans/${planDetail.plan.id}/export`);
      const doc = new jsPDF({ orientation: 'landscape' });
      data.rooms.forEach((room, index) => {
        if (index !== 0) doc.addPage();
        doc.setFontSize(20);
        doc.text(`${planDetail.plan.title} — ${room.roomName}`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Invigilator: ${room.invigilator || 'TBA'}`, 14, 30);
        doc.text(`Grid: ${room.rows} x ${room.cols}`, 180, 30);
        const seats = room.seats.sort(
          (a, b) => a.seat_row - b.seat_row || a.seat_col - b.seat_col
        );
        let y = 40;
        seats.forEach((seat) => {
          doc.text(
            `${seat.seat_row}-${seat.seat_col}  ${seat.roll_no}  ${seat.full_name}`,
            14,
            y
          );
          y += 7;
          if (y > 190) {
            doc.addPage();
            y = 20;
          }
        });
      });

      doc.addPage();
      doc.setFontSize(18);
      doc.text('Consolidated Pack', 14, 20);
      let y = 30;
      const allSeats = planDetail.allocations.sort(
        (a, b) => a.room_id - b.room_id || a.seat_row - b.seat_row
      );
      allSeats.forEach((seat) => {
        doc.text(
          `${seat.room_name} • ${seat.seat_row}-${seat.seat_col} • ${seat.roll_no} • ${seat.full_name}`,
          14,
          y
        );
        y += 7;
        if (y > 190) {
          doc.addPage();
          y = 20;
        }
      });

      doc.save(`${planDetail.plan.title}.pdf`);
    } catch (error) {
      setFormStatus('Failed to export PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse text-2xl tracking-[0.4em] uppercase">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 md:px-10 py-10 text-white space-y-10">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Admin Deck</p>
          <h1 className="text-4xl font-display">Exam Command Center</h1>
          <p className="text-gray-400">
            Logged in as {user?.fullName} ·{' '}
            <button className="underline text-sm" onClick={logout}>
              Logout
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadCoreData(activePlanId)}
          className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2"
        >
          <FiRefreshCw /> Refresh data
        </button>
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <DashboardCard label="Students" value={stats.students} icon={<FiUsers size={24} />} />
        <DashboardCard label="Rooms" value={stats.rooms} icon={<FiGrid size={24} />} />
        <DashboardCard label="Plans" value={stats.plans} icon={<FiLayers size={24} />} />
      </section>

      <section className="glass p-6 border border-white/10 space-y-6">
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="xl:w-1/3 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Engine</p>
              <h2 className="text-3xl font-display">Single-room orchestration</h2>
              <p className="text-gray-400">
                Pick a classroom, choose semesters, and the engine will stagger departments so
                similar cohorts never sit side-by-side.
              </p>
            </div>

            <form className="space-y-3" onSubmit={handlePlanSubmit}>
              <Select
                label="Classroom"
                value={primaryForm.roomId}
                onChange={(e) => setPrimaryForm((prev) => ({ ...prev, roomId: e.target.value }))}
                required
              >
                <option value="">Select room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.code}) • {room.capacity} seats
                  </option>
                ))}
              </Select>
              <Select
                label="Semesters (multi-select)"
                multiple
                value={primaryForm.semesterIds}
                onChange={(e) =>
                  setPrimaryForm((prev) => ({
                    ...prev,
                    semesterIds: Array.from(e.target.selectedOptions, (option) => option.value),
                  }))
                }
              >
                {semesters.map((sem) => (
                  <option key={sem.id} value={sem.id}>
                    {sem.title} ({sem.code})
                  </option>
                ))}
              </Select>
              <Input
                label="Custom plan title"
                value={primaryForm.title}
                onChange={(e) => setPrimaryForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Optional friendly label"
              />
              <Input
                label="Exam date"
                type="date"
                value={primaryForm.planDate}
                onChange={(e) => setPrimaryForm((prev) => ({ ...prev, planDate: e.target.value }))}
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent font-medium"
              >
                Generate seating plan
              </button>
            </form>
            {formStatus && <p className="text-sm text-accent">{formStatus}</p>}

            <div className="border-t border-white/5 pt-4">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">History</p>
              <div className="space-y-2 max-h-56 overflow-auto pr-2 no-scrollbar">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border transition ${
                      activePlanId === plan.id
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <p className="font-medium">{plan.title}</p>
                    <p className="text-xs text-gray-400">
                      {plan.plan_date} • {plan.seat_count} seats
                    </p>
                  </button>
                ))}
                {!plans.length && (
                  <p className="text-sm text-gray-500">No saved plans yet. Generate your first one!</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Active plan</p>
                <h3 className="text-2xl font-display">
                  {planDetail?.plan?.title || 'No seating plan generated'}
                </h3>
                {planDetail && (
                  <p className="text-sm text-gray-400">
                    {planDetail.plan.plan_date} • crafted by {planDetail.plan.created_by}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!planDetail}
                className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2 disabled:opacity-50"
              >
                <FiDownload /> Export PDF pack
              </button>
            </div>
            {planLoading && <span className="text-xs text-gray-400">Refreshing plan...</span>}

            {planDetail ? (
              <>
                {roomsForPlan.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {roomsForPlan.map((room) => (
                      <button
                        key={room.displayId}
                        type="button"
                        onClick={() => handleRoomSwitch(room.displayId)}
                        className={`px-3 py-2 rounded-2xl border text-sm ${
                          activeRoomId === room.displayId
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        {room.name}
                      </button>
                    ))}
                  </div>
                )}

                {swapSeat && (
                  <div className="text-sm text-brand-200">
                    Selected seat: {swapSeat.room_name} • Row {swapSeat.seat_row} / Col {swapSeat.seat_col} (
                    {swapSeat.roll_no}). Pick another seat to swap or click the same seat to cancel.
                  </div>
                )}

                {activeRoom ? (
                  <SeatGrid
                    room={{ ...activeRoom, id: activeRoom.displayId }}
                    allocations={activeAllocations}
                    onSeatPick={handleSeatPick}
                    selectedSeat={swapSeat}
                  />
                ) : (
                  <p className="text-gray-400">Select a room tab above to view its live arrangement.</p>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 p-6 text-gray-400">
                Generate a plan to see the seating canvas animate into place.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Departments</p>
            <h3 className="text-xl font-display">Add / edit quickly</h3>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEntityCreate('/catalog/departments', { name: formData.get('deptName') });
              e.currentTarget.reset();
            }}
          >
            <Input label="Department name" name="deptName" placeholder="Computer Science" required />
            <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
              Save department
            </button>
          </form>
        </div>

        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Semesters</p>
            <h3 className="text-xl font-display">Per department</h3>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEntityCreate('/catalog/semesters', {
                departmentId: Number(formData.get('semesterDepartment')),
                title: formData.get('semesterTitle'),
                code: formData.get('semesterCode'),
                examDate: formData.get('semesterDate'),
              });
              e.currentTarget.reset();
            }}
          >
            <Select label="Department" name="semesterDepartment" required>
              <option value="">Select</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
            <Input label="Semester title" name="semesterTitle" placeholder="BSCS - Term V" required />
            <Input label="Semester code" name="semesterCode" placeholder="CS-T5" required />
            <Input label="Exam date" name="semesterDate" type="date" required />
            <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
              Save semester
            </button>
          </form>
        </div>

        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Rooms</p>
            <h3 className="text-xl font-display">Capacity + layout</h3>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEntityCreate('/catalog/rooms', {
                code: formData.get('roomCode'),
                name: formData.get('roomName'),
                capacity: Number(formData.get('roomCapacity')),
                rows: Number(formData.get('roomRows')),
                cols: Number(formData.get('roomCols')),
                invigilatorName: formData.get('invigilator'),
              });
              e.currentTarget.reset();
            }}
          >
            <Input label="Room code" name="roomCode" placeholder="LAB-01" required />
            <Input label="Room name" name="roomName" placeholder="Innovation Lab" required />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Cap" name="roomCapacity" type="number" required />
              <Input label="Rows" name="roomRows" type="number" required />
              <Input label="Cols" name="roomCols" type="number" required />
            </div>
            <Input label="Invigilator" name="invigilator" placeholder="Prof. Nauman" />
            <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
              Save room
            </button>
          </form>
        </div>

        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Students</p>
            <h3 className="text-xl font-display">Enroll & sync</h3>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEntityCreate('/students', {
                fullName: formData.get('studentName'),
                rollNo: formData.get('studentRoll'),
                semesterId: Number(formData.get('studentSemester')),
                seatPref: formData.get('seatPref'),
              });
              e.currentTarget.reset();
            }}
          >
            <Input label="Full name" name="studentName" placeholder="Areeba Khan" required />
            <Input label="Roll number" name="studentRoll" placeholder="CS-23-055" required />
            <Select label="Semester" name="studentSemester" required>
              <option value="">Select</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.title}
                </option>
              ))}
            </Select>
            <Input label="Seat preference" name="seatPref" placeholder="Optional note" />
            <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
              Save student
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;

