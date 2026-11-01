import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, endOfMonth, fmt, fromISO, isSameDay, monthLabel, startOfMonth, toISO, weekStart } from "../lib/dates";
import { cx } from "./ui";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const selectCls = "h-12 appearance-none bg-transparent px-3 text-center text-[20px] font-semibold tabular outline-none";

/** 24-satni odabir vremena: dva select-a (na iPhoneu otvaraju kotačić), bez AM/PM */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h = "16", m = "00"] = (value || "16:00").split(":");
  const mm = MINUTES.includes(m) ? m : String(Math.round(Number(m) / 5) * 5 % 60).padStart(2, "0");
  return (
    <div className="flex h-12 items-center rounded-2xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
      <select aria-label="Sati" value={h} onChange={(e) => onChange(`${e.target.value}:${mm}`)} className={cx(selectCls, "flex-1")}>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="-mx-1 text-xl font-bold text-slate-300">:</span>
      <select aria-label="Minute" value={mm} onChange={(e) => onChange(`${h}:${e.target.value}`)} className={cx(selectCls, "flex-1")}>
        {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

/** Odabir datuma: gumb s hrvatskim prikazom + mini kalendar ispod */
export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromISO(value) : new Date();
  const [view, setView] = useState<Date>(selected);
  const today = new Date();
  const first = startOfMonth(view), last = endOfMonth(view), gridStart = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).filter((d, i) => i < 35 || d <= last);
  const raw = fmt(selected, selected.getFullYear() === new Date().getFullYear() ? "EEEE, d. MMMM" : "EEEE, d. MMMM yyyy.");
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return (
    <div>
      <button type="button" onClick={() => { setView(selected); setOpen((o) => !o); }}
        className={cx("flex h-12 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left text-[16px] transition", open ? "border-brand ring-4 ring-brand/10" : "border-line")}>
        <CalendarDays className="size-4 shrink-0 text-muted" />
        <span className="flex-1 font-semibold">{label}</span>
        {isSameDay(selected, today) ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-deep">Danas</span> : null}
      </button>
      {open ? (
        <div className="anim-pop mt-2 rounded-[20px] border border-line bg-white p-2.5">
          <div className="mb-1 flex items-center justify-between px-1">
            <button type="button" onClick={() => setView(addMonths(view, -1))} className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Prethodni mjesec"><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-bold">{monthLabel(view)}</span>
            <button type="button" onClick={() => setView(addMonths(view, 1))} className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Sljedeći mjesec"><ChevronRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
            {["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d) => {
              const iso = toISO(d), sel = iso === value, other = d < first || d > last, isT = isSameDay(d, today);
              return (
                <button key={iso} type="button" onClick={() => { onChange(iso); setOpen(false); }}
                  className={cx("flex h-10 items-center justify-center rounded-xl text-[15px] font-semibold transition", sel ? "bg-ink text-white" : isT ? "bg-brand-soft text-brand-deep" : "hover:bg-slate-100", other && !sel && "text-slate-300")}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {[["Danas", 0], ["Sutra", 1], ["Za tjedan", 7]].map(([l, n]) => (
              <button key={l} type="button" onClick={() => { onChange(toISO(addDays(today, n as number))); setOpen(false); }} className="h-8 flex-1 rounded-full bg-slate-100 text-xs font-semibold hover:bg-slate-200">{l}</button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
