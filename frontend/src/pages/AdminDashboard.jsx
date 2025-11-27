import { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiGrid, FiLayers, FiDownload, FiRefreshCw, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import apiClient from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusMessage from '../components/StatusMessage'
import { Link } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import Input from '../components/Input';
import Select from '../components/Select';
import MultiSelect from '../components/MultiSelect';
import SeatGrid from '../components/SeatGrid';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ students: 0, rooms: 0, plans: 0 });
  const [plans, setPlans] = useState([]);
  const [planDetail, setPlanDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('');
  const [swapSeat, setSwapSeat] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [editingSem, setEditingSem] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [semesterCourses, setSemesterCourses] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);
  const [courseFormData, setCourseFormData] = useState({
    semesterId: '',
    examDate: '',
  });
  const [studentFormData, setStudentFormData] = useState({
    courseIds: [],
  });
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

  const [showMessage, setShowMessage] = useState();

  const trigger = () => {
    setShowMessage(true);
  };

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
      const [deps, sems, rms, crs, studs, statsRes, plansRes, semCoursesRes, studCoursesRes] = await Promise.all([
        apiClient.get('/catalog/departments'),
        apiClient.get('/catalog/semesters'),
        apiClient.get('/catalog/rooms'),
        apiClient.get('/catalog/courses'),
        apiClient.get('/students'),
        apiClient.get('/search/stats'),
        apiClient.get('/plans'),
        apiClient.get('/catalog/semester-courses').catch(() => ({ data: [] })),
        apiClient.get('/catalog/student-courses').catch(() => ({ data: [] })),
      ]);
      setDepartments(deps.data);
      setSemesters(sems.data);
      setRooms(rms.data);
      setCourses(crs.data);
      setStudents(studs.data);
      const statsArray = Object.values(statsRes.data);
      setStats(statsArray);
      setPlans(plansRes.data);
      setSemesterCourses(semCoursesRes.data || []);
      setStudentCourses(studCoursesRes.data || []);
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
      const response = await apiClient.post(endpoint, payload);
      const newEntity = response.data;

      setFormStatus('Saved successfully');
      trigger();

      if (endpoint.includes('/catalog/departments')) {
        setDepartments(prev => [...prev, newEntity]);
      }

      else if (endpoint.includes('/catalog/semesters')) {
        setSemesters(prev => [...prev, newEntity]);
        console.log(newEntity);
      }

      else if (endpoint.includes('/catalog/rooms')) {
        setRooms(prev => [...prev, newEntity]);
      }

      else if (endpoint.includes('/catalog/courses')) {
        setCourses(prev => [...prev, newEntity]);
      }

      else if (endpoint.includes('/students')) {
        console.log(newEntity);
        setStudents(prev => [...prev, newEntity]);
      }

    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Failed to save');
      trigger();
    }
  };


  const handleEntityUpdate = async (endpoint, id, payload) => {
    try {
      await apiClient.put(`${endpoint}/${id}`, payload);
      setFormStatus('Updated successfully');
      trigger();

      // Handle course update with semester relationship
      if (endpoint === '/catalog/courses' && courseFormData.semesterId) {
        // First, remove existing semester-course relationships for this course
        const existingRelations = semesterCourses.filter(sc => sc.course_id === id);
        for (const rel of existingRelations) {
          try {
            await apiClient.delete(`/catalog/semester-courses/${rel.semester_id}/${id}`);
          } catch (err) {
            console.error('Failed to remove semester-course relationship', err);
          }
        }

        // Then, add new relationship
        try {
          await apiClient.post('/catalog/semester-courses', {
            semesterId: Number(courseFormData.semesterId),
            courseId: Number(id),
            examDate: courseFormData.examDate || null,
          });
        } catch (err) {
          console.error('Failed to link semester to course', err);
        }
        setCourseFormData({ semesterId: '', examDate: '' });
      }

      // Handle student update with course relationships
      if (endpoint === '/students' && studentFormData.courseIds.length > 0) {
        // First, remove existing student-course relationships for this student
        const existingRelations = studentCourses.filter(sc => sc.student_id === id);
        for (const rel of existingRelations) {
          try {
            await apiClient.delete(`/catalog/student-courses/${id}/${rel.course_id}`);
          } catch (err) {
            console.error('Failed to remove student-course relationship', err);
          }
        }

        // Then, add new relationships
        for (const courseId of studentFormData.courseIds) {
          try {
            await apiClient.post('/catalog/student-courses', {
              studentId: Number(id),
              courseId: Number(courseId),
            });
          } catch (err) {
            console.error('Failed to link course to student', err);
          }
        }
        setStudentFormData({ courseIds: [] });
      }

      await loadCoreData(activePlanId);
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Failed to update');
      trigger();
    }
  };

  const handleEntityDelete = async (endpoint, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await apiClient.delete(`${endpoint}/${id}`);
      setFormStatus('Deleted successfully');
      trigger();
      await loadCoreData(activePlanId);
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Failed to delete');
      trigger();
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!primaryForm.roomId) {
      setFormStatus('Choose a classroom to generate its layout');
      trigger();
      return;
    }
    if (!primaryForm.semesterIds.length) {
      setFormStatus('Select the semesters that should appear in this room');
      trigger();
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
        roomId: Number(primaryForm.roomId),
      });
      setPrimaryForm((prev) => ({ ...prev, title: '' }));
      setSwapSeat(null);
      setFormStatus('Seating magically arranged ✦');
      trigger();
      await loadCoreData(data.plan.id);
      setActiveRoomId(Number(primaryForm.roomId));
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Failed to create plan');
      trigger();
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
      trigger();
    } catch (error) {
      setFormStatus(error.response?.data?.message || 'Swap failed');
      trigger();
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
      trigger();
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
      <StatusMessage
        message={formStatus}
        show={showMessage}
        duration={3000}
        onClose={() => setShowMessage(false)}
      />
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
        <div className='flex gap-[8px]'>
          <Link
            to="/dashboard/detail"
            className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2"
          >
            Manage
          </Link>
          <button
            type="button"
            onClick={() => loadCoreData(activePlanId)}
            className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-2"
          >
            <FiRefreshCw /> Refresh data
          </button>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <DashboardCard label="Students" value={stats[0]} icon={<FiUsers size={24} />} />
        <DashboardCard label="Rooms" value={stats[2]} icon={<FiGrid size={24} />} />
        <DashboardCard label="Plans" value={stats[3]} icon={<FiLayers size={24} />} />
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
                    {sem.title}
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

            <div className="border-t border-white/5 pt-4">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">History</p>
              <div className="space-y-2 max-h-56 overflow-auto pr-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border transition ${activePlanId === plan.id
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
                        className={`px-3 py-2 rounded-2xl border text-sm ${activeRoomId === room.displayId
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

      <section className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 ">
        {/* Departments */}
        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Departments</p>
            <h3 className="text-xl font-display">Add / edit quickly</h3>
          </div>
          {editingDept ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEntityUpdate('/catalog/departments', editingDept.id, { name: formData.get('deptName') });
                setEditingDept(null);
                e.currentTarget.reset();
              }}
            >
              <Input label="Department name" name="deptName" defaultValue={editingDept.name} required />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                >
                  <FiX />
                </button>
              </div>
            </form>
          ) : (
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
          )}
          <div className="border-t border-white/5 pt-3 space-y-2  overflow-auto max-h-[300px]">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <span className="text-sm truncate flex-1">{dept.name}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingDept(dept)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntityDelete('/catalog/departments', dept.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Semesters */}
        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Semesters</p>
            <h3 className="text-xl font-display">Per department</h3>
          </div>
          {editingSem ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEntityUpdate('/catalog/semesters', editingSem.id, {
                  departmentId: Number(formData.get('semesterDepartment')),
                  title: formData.get('semesterTitle'),
                });
                setEditingSem(null);
                e.currentTarget.reset();
              }}
            >
              <Select label="Department" name="semesterDepartment" defaultValue={editingSem.department_id} required>
                <option value="">Select</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
              <Input label="Semester title" name="semesterTitle" defaultValue={editingSem.title} required />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSem(null)}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                >
                  <FiX />
                </button>
              </div>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEntityCreate('/catalog/semesters', {
                  departmentId: Number(formData.get('semesterDepartment')),
                  title: formData.get('semesterTitle'),
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
              <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                Save semester
              </button>
            </form>
          )}
          <div className="border-t border-white/5 pt-3 custom-scroll space-y-2 max-h-[300px] overflow-auto">
            {semesters.map((sem) => (
              <div key={sem.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{sem.title + ' ' + sem.department_name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingSem(sem)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntityDelete('/catalog/semesters', sem.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rooms */}
        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Rooms</p>
            <h3 className="text-xl font-display">Capacity + layout</h3>
          </div>
          {editingRoom ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEntityUpdate('/catalog/rooms', editingRoom.id, {
                  code: formData.get('roomCode'),
                  name: formData.get('roomName'),
                  capacity: Number(formData.get('roomCapacity')),
                  rows: Number(formData.get('roomRows')),
                  cols: Number(formData.get('roomCols')),
                  invigilatorName: formData.get('invigilator'),
                });
                setEditingRoom(null);
                e.currentTarget.reset();
              }}
            >
              <Input label="Room code" name="roomCode" defaultValue={editingRoom.code} required />
              <Input label="Room name" name="roomName" defaultValue={editingRoom.name} required />
              <div className="grid grid-cols-3 gap-2">
                <Input label="Cap" name="roomCapacity" type="number" defaultValue={editingRoom.capacity} required />
                <Input label="Rows" name="roomRows" type="number" defaultValue={editingRoom.rows} required />
                <Input label="Cols" name="roomCols" type="number" defaultValue={editingRoom.cols} required />
              </div>
              <Input label="Invigilator" name="invigilator" defaultValue={editingRoom.invigilator_name || ''} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                >
                  <FiX />
                </button>
              </div>
            </form>
          ) : (
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
          )}
          <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
            {rooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{room.name}</span>
                  <span className="text-xs text-gray-500">{room.code} • {room.capacity} seats</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingRoom(room)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntityDelete('/catalog/rooms', room.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Students */}
        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Students</p>
            <h3 className="text-xl font-display">Enroll & sync</h3>
          </div>
          {editingStudent ? (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const selectElement = e.target.querySelector('[name="studentCourses"]');
                const courseIds = Array.from(selectElement.selectedOptions, (opt) => opt.value);

                setStudentFormData({ courseIds });

                await handleEntityUpdate('/students', editingStudent.id, {
                  fullName: formData.get('studentName'),
                  rollNo: formData.get('studentRoll'),
                  semesterId: Number(formData.get('studentSemester')),
                  seatPref: formData.get('seatPref'),
                });

                setEditingStudent(null);
                e.currentTarget.reset();
              }}
            >
              <Input label="Full name" name="studentName" defaultValue={editingStudent.full_name} required />
              <Input label="Roll number" name="studentRoll" defaultValue={editingStudent.roll_no} required />
              <Select label="Semester" name="studentSemester" defaultValue={editingStudent.semester_id} required>
                <option value="">Select</option>
                {semesters.map((sem) => (
                  <option key={sem.id} value={sem.id}>
                    {sem.title}
                  </option>
                ))}
              </Select>
              <MultiSelect
                label="Courses (select multiple)"
                name="studentCourses"
                options={courses}
                value={studentCourses.filter(sc => sc.student_id === editingStudent.id).map(sc => String(sc.course_id))}
                onChange={(selected) => {
                  // This will be handled by the form submission
                }}
              />
              <Input label="Seat preference" name="seatPref" defaultValue={editingStudent.seat_pref || ''} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setStudentFormData({ courseIds: [] });
                  }}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                >
                  <FiX />
                </button>
              </div>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const selectElement = e.target.querySelector('[name="studentCourses"]');
                const courseIds = Array.from(selectElement.selectedOptions, (opt) => opt.value);

                setStudentFormData({ courseIds });

                await handleEntityCreate('/students', {
                  fullName: formData.get('studentName'),
                  rollNo: formData.get('studentRoll'),
                  semesterId: Number(formData.get('studentSemester')),
                  seatPref: formData.get('seatPref'),
                  courseIds: courseIds,
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
              <MultiSelect
                label="Courses (select multiple)"
                name="studentCourses"
                options={courses}
                value={studentFormData.courseIds}
                onChange={(selected) => setStudentFormData(prev => ({ ...prev, courseIds: selected }))}
              />
              <Input label="Seat preference" name="seatPref" placeholder="Optional note" />
              <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                Save student
              </button>
            </form>
          )}
          <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
            {students.slice(0, 10).map((student) => (
              <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{student.full_name}</span>
                  <span className="text-xs text-gray-500">{student.roll_no}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(student)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntityDelete('/students', student.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {students.length > 10 && (
              <p className="text-xs text-gray-500 text-center">+{students.length - 10} more</p>
            )}
          </div>
        </div>

        {/* Courses */}
        <div className="glass p-6 border border-white/10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Courses</p>
            <h3 className="text-xl font-display">Manage courses</h3>
          </div>
          {editingCourse ? (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const semesterId = formData.get('courseSemester');
                const examDate = formData.get('courseExamDate') || '';

                setCourseFormData({
                  semesterId,
                  examDate,
                });

                await handleEntityUpdate('/catalog/courses', editingCourse.id, {
                  code: formData.get('courseCode'),
                  title: formData.get('courseTitle'),
                });

                setEditingCourse(null);
                e.currentTarget.reset();
              }}
            >
              <Input label="Course code" name="courseCode" defaultValue={editingCourse.code} required />
              <Input label="Course title" name="courseTitle" defaultValue={editingCourse.title} required />
              <Select
                label="Semester"
                name="courseSemester"
                defaultValue={(() => {
                  const firstRelation = semesterCourses.find(sc => sc.course_id === editingCourse.id);
                  return firstRelation?.semester_id || '';
                })()}
                required
              >
                <option value="">Select semester</option>
                {semesters.map((sem) => (
                  <option key={sem.id} value={sem.id}>
                    {sem.title}
                  </option>
                ))}
              </Select>
              <Input
                label="Exam date"
                name="courseExamDate"
                type="date"
                defaultValue={(() => {
                  const firstRelation = semesterCourses.find(sc => sc.course_id === editingCourse.id);
                  return firstRelation?.exam_date || '';
                })()}
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCourse(null);
                    setCourseFormData({ semesterId: '', examDate: '' });
                  }}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10"
                >
                  <FiX />
                </button>
              </div>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const semesterId = formData.get('courseSemester');
                const examDate = formData.get('courseExamDate') || '';

                setCourseFormData({
                  semesterId,
                  examDate,
                });

                await handleEntityCreate('/catalog/courses', {
                  code: formData.get('courseCode'),
                  title: formData.get('courseTitle'),
                });

                e.currentTarget.reset();
                setCourseFormData({ semesterId: '', examDate: '' });
              }}
            >
              <Input label="Course code" name="courseCode" placeholder="CS-301" required />
              <Input label="Course title" name="courseTitle" placeholder="Data Structures" required />
              <Select
                label="Semester"
                name="courseSemester"
                value={courseFormData.semesterId}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, semesterId: e.target.value }))}
                required
              >
                <option value="">Select semester</option>
                {semesters.map((sem) => (
                  <option key={sem.id} value={sem.id}>
                    {sem.title}
                  </option>
                ))}
              </Select>
              <Input label="Exam date" name="courseExamDate" type="date" value={courseFormData.examDate} onChange={(e) => setCourseFormData(prev => ({ ...prev, examDate: e.target.value }))} />
              <button type="submit" className="w-full py-2 rounded-2xl bg-white/10 border border-white/10">
                Save course
              </button>
            </form>
          )}
          <div className="border-t border-white/5 pt-3 space-y-2 max-h-[300px] overflow-auto">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{course.title}</span>
                  <span className="text-xs text-gray-500">{course.code}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(course)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntityDelete('/catalog/courses', course.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;

