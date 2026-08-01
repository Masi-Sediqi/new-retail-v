export const AFGHAN_MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;

function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;

  for (let index = 1; index < breaks.length; index += 1) {
    const jm = breaks[index];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let value = div((gy + div(gm - 8, 6) + 100100) * 1461, 4);
  value += div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  value -= div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) - 752;
  return value;
}

function d2g(jdn) {
  let value = 4 * jdn + 139361631;
  value += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const index = div(mod(value, 1461), 4) * 5 + 308;
  const gd = div(mod(index, 153), 5) + 1;
  const gm = mod(div(index, 153), 12) + 1;
  const gy = div(value, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const result = jalCal(jy);
  return g2d(result.gy, 3, result.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gregorian = d2g(jdn);
  let jy = gregorian.gy - 621;
  const result = jalCal(jy);
  const firstFarvardin = g2d(gregorian.gy, 3, result.march);
  let dayNumber = jdn - firstFarvardin;

  if (dayNumber >= 0) {
    if (dayNumber <= 185) {
      return { jy, jm: 1 + div(dayNumber, 31), jd: mod(dayNumber, 31) + 1 };
    }
    dayNumber -= 186;
  } else {
    jy -= 1;
    dayNumber += 179;
    if (result.leap === 1) dayNumber += 1;
  }

  return { jy, jm: 7 + div(dayNumber, 30), jd: mod(dayNumber, 30) + 1 };
}

export function gregorianToAfghan(value) {
  if (!value) return null;
  const [gy, gm, gd] = String(value).slice(0, 10).split("-").map(Number);
  if (!gy || !gm || !gd) return null;
  return d2j(g2d(gy, gm, gd));
}

export function afghanToGregorian(jy, jm, jd) {
  if (!jy || !jm || !jd) return "";
  const { gy, gm, gd } = d2g(j2d(Number(jy), Number(jm), Number(jd)));
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function isAfghanLeapYear(year) {
  return jalCal(Number(year)).leap === 0;
}

export function getAfghanMonthDays(year, month) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isAfghanLeapYear(year) ? 30 : 29;
}

export function todayDateValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kabul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatAfghanDate(value, options = {}) {
  if (!value) return options.fallback ?? "-";

  const rawValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return rawValue.slice(0, 10);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kabul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsedDate);
}

export function formatTime(value, options = {}) {
  if (!value) return options.fallback ?? "";

  const rawValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return options.fallback ?? "";

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) return options.fallback ?? "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kabul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
}

export function formatDateTime(value, timeSourceOrOptions = {}, maybeOptions = {}) {
  const hasExplicitTimeSource =
    typeof timeSourceOrOptions === "string" ||
    timeSourceOrOptions instanceof Date;
  const timeSource = hasExplicitTimeSource ? timeSourceOrOptions : value;
  const options = hasExplicitTimeSource ? maybeOptions : timeSourceOrOptions;
  const date = formatAfghanDate(value, options);

  if (date === (options.fallback ?? "-")) return date;

  const time = formatTime(timeSource, { fallback: "" });

  return time ? `${date} ${time}` : date;
}

export function formatAfghanMonth(value) {
  return value ? String(value).slice(0, 7) : "-";
}
