import { useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarX2 } from "lucide-react";
import type { Lesson, Student } from "../lib/api";
import { addDays, dayName, fmt, isSameDay, money, terminaLabel, toISO, weekDays, weekLabel } from "../lib/dates";
import LessonCard from "./LessonCard";
import { Button, IconButton, cx } from "./ui";

export default function WeekView({ anchor, setAnchor, lessons, studentsById, onOpen, onAdd }: {
  anchor: Date; setAnchor: (d: Date) => void; lessons: Lesson[]; studentsById: Map<string, Student>;
  onOpen: (l: Lesson) => void; onAdd: (date: string) => void;
}) {
  const days = weekDays(anchor);
  const now = new Date();
  const byDay = new Map<string, Lesson[]>();
  for (const l of lessons) { const k = l.date; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k)!.push(l); }
  const fromISO = toISO(days[0]), toISOs = toISO(days[6]);
  const active = lessons.filter((l) => l.status !== "cancelled" && l.date >= fromISO && l.date <= toISOs);
  const earnings = active.reduce((s, l) => s + (l.price || 0), 0);
  const touch = useRef<number | null>(null);

  return (
    <div
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 70) setAnchor(addDays(anchor, dx < 0 ? 7 : -7)); }}
    >
      <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] font-bold tracking-tight sm:text-2xl"><span className="sm:hidden">{weekLabel(anchor, false)}</span><span className="hidden sm:inline">{weekLabel(anchor)}</span></h1>
          <p className="text-sm text-muted">{active.length ? `${terminaLabel(active.length)}${earnings ? ` · ${money(earnings)}` : ""}` : "Nema termina ovaj tjedan"}</p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Prethodni tjedan" onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft className="size-5" /></IconButton>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())} className="rounded-full">Danas</Button>
          <IconButton label="Sljedeći tjedan" onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight className="size-5" /></IconButton>
        </div>
      </header>

      {/* Mobilni prikaz: lista po danima */}
      <div className="grid gap-5 lg:hidden">
        {days.map((d) => {
          const iso = toISO(d), items = byDay.get(iso) || [], isToday = isSameDay(d, now), past = d < now && !isToday;
          return (
            <section key={iso}>
              <div className="mb-2 flex items-center gap-3 px-1">
                <span className={cx("flex size-10 items-center justify-center rounded-2xl text-lg font-bold", isToday ? "bg-brand text-white" : "bg-white text-ink shadow-sm")}>{fmt(d, "d")}</span>
                <div className="flex-1">
                  <div className={cx("font-bold", past && "text-muted")}>{dayName(d)}{isToday ? <span className="ml-2 text-xs font-bold uppercase tracking-wider text-brand">Danas</span> : null}</div>
                  <div className="text-xs text-muted">{fmt(d, "d. MMMM")}{items.length ? ` · ${terminaLabel(items.length)}` : ""}</div>
                </div>
                <IconButton label="Dodaj termin" onClick={() => onAdd(iso)} className="size-9 bg-white shadow-sm"><Plus className="size-4" /></IconButton>
              </div>
              {items.length ? (
                <div className="grid gap-2">{items.map((l) => <LessonCard key={l.id} lesson={l} student={l.student_id ? studentsById.get(l.student_id) : undefined} onClick={() => onOpen(l)} past={past} />)}</div>
              ) : (
                <div className={cx("rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400", past && "opacity-60")}>Slobodno</div>
              )}
            </section>
          );
        })}
      </div>

      {/* Desktop prikaz: 7 kolona */}
      <div className="hidden grid-cols-7 gap-3 lg:grid">
        {days.map((d) => {
          const iso = toISO(d), items = byDay.get(iso) || [], isToday = isSameDay(d, now), past = d < now && !isToday;
          return (
            <section key={iso} className={cx("group flex min-h-[420px] flex-col rounded-[22px] p-2.5 transition", isToday ? "bg-brand-soft/70 ring-1 ring-brand/20" : "bg-white/60")}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div>
                  <div className={cx("text-xs font-bold uppercase tracking-wider", isToday ? "text-brand" : "text-muted")}>{fmt(d, "EEE")}</div>
                  <div className={cx("text-xl font-bold", past && "text-muted")}>{fmt(d, "d.")}</div>
                </div>
                <IconButton label="Dodaj termin" onClick={() => onAdd(iso)} className="size-8 opacity-0 transition group-hover:opacity-100 focus:opacity-100"><Plus className="size-4" /></IconButton>
              </div>
              <div className="grid content-start gap-2">
                {items.map((l) => <LessonCard key={l.id} lesson={l} student={l.student_id ? studentsById.get(l.student_id) : undefined} onClick={() => onOpen(l)} compact past={past} />)}
              </div>
              {!items.length ? <button onClick={() => onAdd(iso)} className="mt-1 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 transition hover:border-brand/40 hover:text-brand"><CalendarX2 className="mb-1 size-4" />Slobodno</button> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
