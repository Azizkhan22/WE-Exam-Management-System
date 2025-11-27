
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
                  className={`rounded-2xl px-3 py-2 text-left border text-xs transition ${seat
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

export default SeatGrid;