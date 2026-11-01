import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, isSameDay, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { hr } from "date-fns/locale";

export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (s: string) => parseISO(s);
export const today = () => new Date();
export const todayISO = () => toISO(new Date());
export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const weekDays = (d: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(d), i));
export { addDays, addMonths, isSameDay, startOfMonth, endOfMonth, differenceInCalendarDays };

export const fmt = (d: Date, pattern: string) => format(d, pattern, { locale: hr });

/** "3. – 9. studenoga 2026." */
export function weekLabel(d: Date, withYear = true) {
  const a = weekStart(d), b = addDays(a, 6);
  const y = withYear ? " yyyy." : "";
  if (a.getMonth() === b.getMonth()) return `${fmt(a, "d.")} – ${fmt(b, "d. MMMM" + y)}`;
  if (a.getFullYear() === b.getFullYear()) return `${fmt(a, "d. MMM")} – ${fmt(b, "d. MMM" + y)}`;
  return `${fmt(a, "d. MMM yyyy.")} – ${fmt(b, "d. MMM yyyy.")}`;
}
export const monthLabel = (d: Date) => cap(fmt(d, "LLLL yyyy."));
export const dayLong = (d: Date) => cap(fmt(d, "EEEE, d. MMMM"));
export const dayName = (d: Date) => cap(fmt(d, "EEEE"));
export const dayShort = (d: Date) => cap(fmt(d, "EEE"));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const hhmm = (t: string) => t.slice(0, 5);
export function addMinutes(hhmmStr: string, minutes: number) {
  const [h, m] = hhmmStr.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function diffMinutes(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number), [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}
export function relativeDay(iso: string) {
  const diff = differenceInCalendarDays(fromISO(iso), new Date());
  if (diff === 0) return "Danas";
  if (diff === 1) return "Sutra";
  if (diff === -1) return "Jučer";
  return null;
}
export const money = (n: number) => `${n.toLocaleString("hr-HR", { maximumFractionDigits: 2 })} €`;
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const terminaLabel = (n: number) => `${n} ${plural(n, "termin", "termina", "termina")}`;
