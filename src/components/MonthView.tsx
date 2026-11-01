import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import type { Lesson, Student } from "../lib/api";
import { addDays, addMonths, dayLong, endOfMonth, fromISO, isSameDay, money, monthLabel, startOfMonth, terminaLabel, toISO, weekStart } from "../lib/dates";
import { colorOf } from "../lib/colors";
import LessonCard from "./LessonCard";
import { Button, Empty, IconButton, cx } from "./ui";

export default function MonthView({ anchor, setAnchor, lessons, studentsById, onOpen, onAdd, onDone }: {
  anchor: Date; setAnchor: (d: Date) => void; lessons: Lesson[]; studentsById: Map<string, Student>;
  onOpen: (l: Lesson) => void; onAdd: (date: string) => void; onDone: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string>(toISO(new Date()));
  const now = new Date();
  const first = startOfMonth(anchor), last = endOfMonth(anchor);
  const gridStart = weekStart(first);
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).filter((d, i) => i < 35 || d <= last), [gridStart, last]);
  const byDay = useMemo(() => { const m = new Map<string, Lesson[]>(); for (const l of lessons) { if (!m.has(l.date)) m.set(l.date, []); m.get(l.date)!.push(l); } return m; }, [lessons]);
  const inMonth = lessons.filter((l) => l.date >= toISO(first) && l.date <= toISO(last));
  const active = inMonth.filter((l) => l.status !== "cancelled");
  const done = inMonth.filter((l) => l.status === "done");
  const earnings = active.reduce((s, l) => s + (l.price || 0), 0);
  const selItems = byDay.get(selected) || [];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div>
        <header className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold tracking-tight sm:text-2xl">{monthLabel(anchor)}</h1>
            <p className="text-sm text-muted">{active.length ? `${terminaLabel(active.length)} · ${done.length} održano${earnings ? ` · ${money(earnings)}` : ""}` : "Nema termina ovaj mjesec"}</p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Prethodni mjesec" onClick={() => setAnchor(addMonths(anchor, -1))}><ChevronLeft className="size-5" /></IconButton>
            <Button variant="secondary" size="sm" className="rounded-full" onClick={() => { setAnchor(new Date()); setSelected(toISO(new Date())); }}>Danas</Button>
            <IconButton label="Sljedeći mjesec" onClick={() => setAnchor(addMonths(anchor, 1))}><ChevronRight className="size-5" /></IconButton>
          </div>
        </header>

        <div className="rounded-[22px] bg-white p-2 shadow-(--shadow-card) sm:p-3">
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-muted">
            {["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const iso = toISO(d), items = byDay.get(iso) || [], isToday = isSameDay(d, now), isSel = iso === selected, other = d < first || d > last;
              const visible = items.filter((l) => l.status !== "cancelled");
              return (
                <button key={iso} onClick={() => { setSelected(iso); if (other) setAnchor(d); }}
                  className={cx("flex aspect-square flex-col items-center justify-start rounded-2xl pt-1.5 transition sm:aspect-[5/4]",
                    isSel ? "bg-ink text-white" : isToday ? "bg-brand-soft text-brand-deep" : "hover:bg-slate-50", other && !isSel && "opacity-35")}>
                  <span className={cx("text-[15px] font-semibold leading-none", isToday && !isSel && "font-bold")}>{d.getDate()}</span>
                  <span className="mt-1.5 flex h-2 items-center gap-0.5">
                    {visible.slice(0, 4).map((l) => <span key={l.id} className={cx("size-1.5 rounded-full", isSel ? "bg-white/90" : colorOf(l.student_id ? studentsById.get(l.student_id)?.color : null).dot)} />)}
                  </span>
                  {visible.length > 4 ? <span className={cx("mt-0.5 text-[10px] font-bold", isSel ? "text-white/80" : "text-muted")}>{visible.length}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside>
        <div className="mb-3 flex items-center justify-between lg:mt-[60px]">
          <div>
            <h2 className="text-lg font-bold">{dayLong(fromISO(selected))}</h2>
            <p className="text-sm text-muted">{selItems.length ? terminaLabel(selItems.length) : "Nema termina"}</p>
          </div>
          <Button variant="soft" size="sm" onClick={() => onAdd(selected)}><Plus className="size-4" />Dodaj</Button>
        </div>
        {selItems.length ? (
          <div className="grid gap-2">{selItems.map((l) => <LessonCard key={l.id} lesson={l} student={l.student_id ? studentsById.get(l.student_id) : undefined} onClick={() => onOpen(l)} past={selected < toISO(now)} onDone={() => onDone([l.id])} />)}</div>
        ) : (
          <div className="rounded-[22px] bg-white/60"><Empty icon={<CalendarDays className="size-6" />} title="Slobodan dan" text="Dodirni „Dodaj“ za novi termin na ovaj dan." /></div>
        )}
      </aside>
    </div>
  );
}
