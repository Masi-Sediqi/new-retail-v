import "./SeatSelector.css";

function SeatSelector({
  availableSeats,
  disabled,
  familyCount,
  mode,
  onChange,
  selectedSeats,
}) {
  const requiredCount = mode === "فامیلی" ? Math.max(Number(familyCount || 0), 0) : 1;

  const toggleSeat = (seatNo) => {
    if (selectedSeats.includes(seatNo)) {
      onChange(selectedSeats.filter((item) => item !== seatNo));
      return;
    }

    if (selectedSeats.length >= requiredCount) return;
    onChange([...selectedSeats, seatNo]);
  };

  if (disabled) {
    return <p className="seat-selector-empty">ابتدا یک سفر را انتخاب کنید.</p>;
  }

  if (availableSeats.length === 0) {
    return <p className="seat-selector-empty">همه چوکی‌ها رزرف شده‌اند.</p>;
  }

  return (
    <div className="seat-selector">
      <div className="seat-selector-status">
        <span>انتخاب‌شده: {selectedSeats.length}</span>
        <strong>مورد نیاز: {requiredCount || "-"}</strong>
      </div>
      <div className="seat-selector-grid">
        {availableSeats.map((seatNo) => {
          const selected = selectedSeats.includes(seatNo);
          const locked = !selected && (!requiredCount || selectedSeats.length >= requiredCount);
          return (
            <button
              type="button"
              key={seatNo}
              className={selected ? "selected" : ""}
              disabled={locked}
              onClick={() => toggleSeat(seatNo)}
            >
              چوکی {seatNo}
            </button>
          );
        })}
      </div>
      {mode === "فامیلی" && requiredCount > 0 && selectedSeats.length !== requiredCount && (
        <small>برای این فامیل باید دقیقاً {requiredCount} چوکی انتخاب شود.</small>
      )}
    </div>
  );
}

export default SeatSelector;
