// Pomoćne funkcije za datume u vremenskoj zoni Europe/Zagreb (bez vanjskih paketa)
export const TZ = process.env.TZ_NAME || "Europe/Zagreb";

export function zonedNow(tz = TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short",
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }[g("weekday")];
  return {
    date: `${g("year")}-${g("month")}-${g("day")}`,
    hour: Number(g("hour")) % 24,
    minute: Number(g("minute")),
    weekday: wd,
  };
}

export function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekdayOf(iso) {
  return new Date(iso + "T00:00:00Z").getUTCDay(); // 0 = ned
}
/** Ponedjeljak tjedna koji sadrži iso */
export function mondayOf(iso) {
  const wd = weekdayOf(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}
/** Ponedjeljak sljedećeg tjedna (ako je danas nedjelja, to je sutra) */
export function nextMonday(iso) {
  return addDays(mondayOf(iso), 7);
}

const DAYS = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
const DAYS_SHORT = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
const MONTHS_GEN = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "prosinca"];

export function fmtDayLong(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${DAYS[weekdayOf(iso)]}, ${d}. ${MONTHS_GEN[m - 1]}`;
}
export function fmtDayShort(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${DAYS_SHORT[weekdayOf(iso)]} ${d}.${m}.`;
}
export function fmtRange(fromIso, toIso) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  if (fm === tm) return `${fd}. – ${td}. ${MONTHS_GEN[tm - 1]} ${ty}.`;
  return `${fd}. ${MONTHS_GEN[fm - 1]} – ${td}. ${MONTHS_GEN[tm - 1]} ${ty}.`;
}
export const hhmm = (t) => (t || "").slice(0, 5);
