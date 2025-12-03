import { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiGrid, FiLayers, FiDownload, FiRefreshCw } from 'react-icons/fi';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import apiClient from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusMessage from '../components/StatusMessage'
import { Link } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import Input from '../components/Input';
import SeatGrid from '../components/SeatGrid';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
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
  const [showMessage, setShowMessage] = useState(false);

  const activeRoom = planDetail?.rooms?.find((r) => r.roomId === activeRoomId);

  console.log('Active Room:', activeRoom);
  // primaryForm repurposed for multi-room generation: planDate and selectedRooms
  const [primaryForm, setPrimaryForm] = useState({
    title: '',
    planDate: dayjs().format('YYYY-MM-DD'),
    selectedRooms: [], // array of room ids
  });

  const roomsForPlan = useMemo(
    () =>
      planDetail?.rooms?.map((room) => ({
        ...room,
        displayId: Number(room.room_id || room.id),
      })) || [],
    [planDetail]
  );

  const trigger = () => {
    setShowMessage(true);
  };

  const activeAllocations = useMemo(() => {
    if (!planDetail || !activeRoomId) return [];
    return planDetail.allocations.filter((seat) => seat.room_id === activeRoomId);
  }, [planDetail, activeRoomId]);

  const loadCoreData = async (preferredPlanId = null) => {
    setLoading(true);
    try {
      const [
        rms,
        statsRes,
        plansRes
      ] = await Promise.all([
        apiClient.get('/catalog/rooms'),
        apiClient.get('/search/stats'),
        apiClient.get('/plans'),
      ]);

      setRooms(rms.data);

      // statsRes might be an object — normalize to array or keep as object depending on backend
      try {
        const statsArray = Object.values(statsRes.data);
        setStats(statsArray);
      } catch {
        setStats(statsRes.data || {});
      }

      setPlans(plansRes.data || []);


      if (plansRes.data && plansRes.data.length) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- NEW: toggle room selection for multi-room generation
  const toggleRoomSelection = (roomId) => {
    setPrimaryForm((prev) => {
      const exists = prev.selectedRooms.includes(roomId);
      return {
        ...prev,
        selectedRooms: exists
          ? prev.selectedRooms.filter((r) => r !== roomId)
          : [...prev.selectedRooms, roomId],
      };
    });
  };

  // ---- NEW: generate seating plans for multiple rooms for selected date
  const handleMultiGenerate = async (e) => {
    e?.preventDefault?.();
    const { planDate, selectedRooms, title } = primaryForm;

    // Validation
    if (!planDate) {
      setFormStatus('Pick an exam date first');
      trigger();
      return;
    }
    if (!selectedRooms.length) {
      setFormStatus('Select at least one room to generate plans');
      trigger();
      return;
    }

    setPlanLoading(true);

    try {
      // Prepare payload for new backend
      const payload = {
        title: title || `Seating plans • ${dayjs(planDate).format('MMM D, YYYY')}`,
        planDate,
        roomIds: selectedRooms.map(Number),
      };

      // POST to backend
      const { data } = await apiClient.post('/plans/bulk', payload);

      // Backend returns single plan object
      const createdPlan = data.plan;

      // Reset form
      setPrimaryForm((prev) => ({ ...prev, title: '', selectedRooms: [] }));
      setSwapSeat(null);
      setFormStatus(data.message || 'Seating plans generated ✦');
      trigger();

      // Update plan viewer and dashboard
      setPlanDetail({
        plan: createdPlan,
        rooms: data.rooms,
        seatsAllocated: data.seatsAllocated,
      });
      setActivePlanId(createdPlan.id);

      // Optional: reload core data if needed
      await loadCoreData(createdPlan.id);
    } catch (error) {
      console.error('Multi-generate failed', error);
      setFormStatus(error.response?.data?.message || 'Failed to generate plans');
      trigger();
    } finally {
      setPlanLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse text-2xl tracking-[0.4em] uppercase">Loading...</div>
      </div>
    );
  }
  console.log(planDetail);
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
          {/* ---- LEFT: Multi-room orchestration ---- */}
          <div className="xl:w-1/3 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Engine</p>
              <h2 className="text-3xl font-display">Multi-room orchestration</h2>
              <p className="text-gray-400">
                Pick a date, select one or more rooms, then generate seating plans for all chosen rooms at once.
                The backend will create the seating plan and allocate students automatically.
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleMultiGenerate}>
              <Input
                label="Exam date"
                type="date"
                value={primaryForm.planDate}
                onChange={(e) =>
                  setPrimaryForm((prev) => ({ ...prev, planDate: e.target.value }))
                }
                required
              />

              <div>
                <p className="text-sm text-gray-300 mb-2">Select rooms</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-auto pr-2">
                  {rooms.map((room) => {
                    const isSelected = primaryForm.selectedRooms.includes(room.id);
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => toggleRoomSelection(room.id)}
                        className={`text-sm px-3 py-2 rounded-2xl border transition text-left ${isSelected
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{room.name}</div>
                            <div className="text-xs text-gray-400">
                              {room.code} • {room.capacity} seats
                            </div>
                          </div>
                          <div className="text-xs">{isSelected ? '✓' : ''}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Optional plan title (applies to all generated plans)"
                value={primaryForm.title}
                onChange={(e) =>
                  setPrimaryForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Optional friendly label"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent font-medium"
                >
                  Generate seating plan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrimaryForm((prev) => ({ ...prev, selectedRooms: [], title: '' }))
                  }
                  className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5"
                >
                  Clear selection
                </button>
              </div>
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
                      {plan.plan_date} • {plan.seat_count || plan.allocations_count || 0} seats
                    </p>
                  </button>
                ))}
                {!plans.length && (
                  <p className="text-sm text-gray-500">
                    No saved plans yet. Generate your first one!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ---- RIGHT: Plan viewer ---- */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Active plan</p>
                <h3 className="text-2xl font-display">
                  {planDetail?.plan?.title || 'No seating plan generated'}
                </h3>
                {planDetail && (
                  <p className="text-sm text-gray-400">
                    {planDetail.plan.plan_date} • crafted by {planDetail.plan.created_by || 'Admin'}
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
                {planDetail.rooms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {planDetail.rooms.map((room) => (
                      <button
                        key={room.roomId}
                        type="button"
                        onClick={() => setActiveRoomId(room.roomId)}
                        className={`px-3 py-2 rounded-2xl border text-sm ${activeRoomId === room.roomId
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
                    room={activeRoom}
                    allocations={planDetail.allocations}
                    onSeatPick={handleSeatPick}
                    selectedSeat={swapSeat}
                  />
                ) : (
                  <p className="text-gray-400">Select a room tab above to view its seating grid.</p>
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

    </div>
  );
};

export default AdminDashboard;
