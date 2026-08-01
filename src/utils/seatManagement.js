export function getSeatCount(car) {
  const value = Number(car?.seatCount || car?.seats || car?.seatCapacity || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getRecordSeatNumbers(record) {
  if (Array.isArray(record?.seatNos)) {
    return record.seatNos.map(String).filter(Boolean);
  }

  return String(record?.seatNo || "")
    .split(",")
    .map((seatNo) => seatNo.trim())
    .filter(Boolean);
}

export function formatSeatNumbers(record) {
  const seats = getRecordSeatNumbers(record);
  return seats.length ? seats.join("، ") : "-";
}

export function getOccupiedSeats(records) {
  const occupied = new Map();
  records.forEach((record) => {
    getRecordSeatNumbers(record).forEach((seatNo) => occupied.set(seatNo, record));
  });
  return occupied;
}

export function getAvailableSeatNumbers(car, records) {
  const seatCount = getSeatCount(car);
  if (!seatCount) return [];
  const occupied = new Set(records.flatMap(getRecordSeatNumbers));
  return Array.from({ length: seatCount }, (_, index) => String(index + 1)).filter(
    (seatNo) => !occupied.has(seatNo)
  );
}

export function getSeatAssignments(car, records) {
  const seatCount = getSeatCount(car);
  const assignments = [];
  const occupiedMap = getOccupiedSeats(records);

  for (let seat = 1; seat <= seatCount; seat += 1) {
    const seatNo = String(seat);
    assignments.push({
      seatNo,
      record: occupiedMap.get(seatNo) || null,
    });
  }

  return assignments;
}
