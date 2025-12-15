import { useEffect, useMemo, useState, useRef } from 'react';
import apiClient from '../services/api';

const PlanSeatGridReadOnly = ({ planId, student_id }) => {
  const [planDetail, setPlanDetail] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [loading, setLoading] = useState(true);

  const gridContainerRef = useRef(null);
  const studentSeatRef = useRef(null);

  // Fetch plan data
  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;
      setLoading(true);
      try {
        const { data } = await apiClient.get(`/plans/${planId}`);
        setPlanDetail(data);

        // Find the room where the student is sitting
        const studentSeat = data.allocations.find((s) => s.student_id === student_id);
        const defaultRoom =
          studentSeat?.room_id ??
          data.rooms?.[0]?.room_id ??
          data.rooms?.[0]?.roomId ??
          data.rooms?.[0]?.id ??
          null;

        setActiveRoomId(typeof defaultRoom === 'number' ? defaultRoom : Number(defaultRoom));
      } catch (err) {
        console.error('Failed to fetch plan', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId, student_id]);

  // Auto-scroll to student seat whenever room or plan changes
  useEffect(() => {
    if (!gridContainerRef.current || !studentSeatRef.current) return;

    const container = gridContainerRef.current;
    const seat = studentSeatRef.current;

    const seatRect = seat.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scrollLeft =
      seatRect.left -
      containerRect.left +
      container.scrollLeft -
      container.clientWidth / 2 +
      seat.clientWidth / 2;

    const scrollTop =
      seatRect.top -
      containerRect.top +
      container.scrollTop -
      container.clientHeight / 2 +
      seat.clientHeight / 2;

    container.scrollTo({
      left: scrollLeft,
      top: scrollTop,
      behavior: 'smooth',
    });
  }, [activeRoomId, student_id, planDetail]);

  // Prepare rooms for tabs
  const roomsForPlan = useMemo(
    () => planDetail?.rooms?.map((room) => ({ ...room, displayId: room.room_id || room.id })) || [],
    [planDetail]
  );

  // Get current room data
  const activeRoom = useMemo(
    () => roomsForPlan.find((room) => room.displayId === activeRoomId),
    [roomsForPlan, activeRoomId]
  );

  // Get allocations for current room
  const activeAllocations = useMemo(() => {
    if (!planDetail || !activeRoomId) return [];
    return planDetail.allocations.filter((seat) => seat.room_id === activeRoomId);
  }, [planDetail, activeRoomId]);

  if (loading) return <p>Loading seating plan...</p>;
  if (!planDetail) return <p>No plan found.</p>;

  return (
    <div className="space-y-4">
      {/* Room tabs */}
      {roomsForPlan.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {roomsForPlan.map((room) => (
            <button
              key={room.displayId}
              onClick={() => setActiveRoomId(room.displayId)}
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

      {/* Seat grid */}
      {activeRoom ? (
        <div
          ref={gridContainerRef}
          className="rounded-3xl border border-white/10 p-4 bg-white/5 overflow-auto"
          style={{ maxWidth: '100%', maxHeight: '70vh' }}
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${activeRoom.cols}, minmax(96px, 96px))`,
              width: `${activeRoom.cols * 104}px`,
            }}
          >
            {Array.from({ length: activeRoom.rows }).map((_, rowIndex) =>
              Array.from({ length: activeRoom.cols }).map((_, colIndex) => {
                const row = rowIndex + 1;
                const col = colIndex + 1;
                const seat = activeAllocations.find(
                  (s) => s.seat_row === row && s.seat_col === col
                );

                const key = `${row}-${col}`;
                let seatClasses =
                  'rounded-2xl px-3 py-2 text-left border text-xs min-h-[64px] ';

                if (seat) {
                  seatClasses +=
                    'border-brand-500/40 text-white ' +
                    (seat.student_id === student_id
                      ? 'bg-green-500/30'
                      : 'bg-brand-500/10');
                } else {
                  seatClasses += 'bg-white/5 border-white/10 text-gray-500';
                }

                // assign ref only to the target student seat
                const seatRef = seat?.student_id === student_id ? studentSeatRef : null;

                return (
                  <div key={key} ref={seatRef} className={seatClasses}>
                    {seat ? (
                      <>
                        <p className="font-semibold">{seat.roll_no}</p>
                        <p className="text-[10px] text-gray-200 truncate">{seat.full_name}</p>
                      </>
                    ) : (
                      'EMPTY'
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <p>Select a room to view its seating grid.</p>
      )}
    </div>
  );
};

export default PlanSeatGridReadOnly;
