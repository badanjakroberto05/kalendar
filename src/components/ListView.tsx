import { useEffect, useMemo, useState } from "react";
import { ListChecks, Copy } from "lucide-react";
import { api, type Lesson, type Student } from "../lib/api";
import { addDays, dayLong, endOfMonth, fromISO, hhmm, hours, money, startOfMonth, terminaLabel, toISO, weekStart, isSameDay } from "../lib/dates";
import { DateField } from "./pickers";
import LessonCard from "./LessonCard";
import { Button, Chip, Empty, Field, useToast } from "./ui";

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: "Ovaj tjedan", range: () => { const a = weekStart(new Date()); return [toISO(a), toISO(addDays(a, 6))]; } },
  { label: "Sljedeći tjedan", range: () => { const a = addDays(weekStart(new Date()), 7); return [toISO(a), toISO(addDays(a, 6))]; } },
  { label: "Ovaj mjesec", range: () => [toISO(startOfMonth(new Date())), toISO(endOfMonth(new Date()))] },
  { label: "Sljedećih 30 dana", range: () => [toISO(new Date()), toISO(addDays(new Date(), 30))] },
];

export default function ListView({ studentsById, tick, onOpen, onDone }: { studentsById: Map<string, Student>; tick: number; onOpen: (l: Lesson) => void; onDone: (ids: string[]) => void }) {
  const toast = useToast();
  const [[from, to], setRange] = useState<[string, string]>(() => { try { const s = localStorage.getItem("kal:list-range"); if (s) return JSON.parse(s); } catch { /* ignore */ } return PRESETS[0].range(); });
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  useEffect(() => { try { localStorage.setItem("kal:list-range", JSON.stringify([from, to])); } catch { /* ignore */ } }, [from, to]);
  useEffect(() => {
    if (!from || !to || from > to) return;
    let alive = true;
    api.lessons.range(from, to).then((l) => alive && setLessons(l)).catch((e) => toast(e.message, "err"));
    return () => { alive = false; };
  }, [from, to, tick, toast]);

  const groups = useMemo(() => {
    const m = new Map<string, Lesson[]>();
    for (const l of lessons || []) { if (!m.has(l.date)) m.set(l.date, []); m.get(l.date)!.push(l); }
    return [...m.entries()];
  }, [lessons]);
  const active = (lessons || []).filter((l) => l.status !== "cancelled");
  const minutes = active.reduce((s, l) => { const [a, b] = [l.start_time, l.end_time].map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; }); return s + (b - a); }, 0);
  const amount = active.reduce((s, l) => s + (l.price || 0), 0);
  const now = new Date(), todayIso = toISO(now);
  const invalid = from > to;

  async function copyList() {
    const lines = [`Termini ${fromISO(from).toLocaleDateString("hr-HR")} – ${fromISO(to).toLocaleDateString("hr-HR")}`, ""];
    for (const [d, items] of groups) {
      lines.push(dayLong(fromISO(d)));
      for (const l of items) lines.push(`  ${hhmm(l.start_time)}–${hhmm(l.end_time)}  ${l.student_name}${l.subject ? " · " + l.subject : ""}${l.status === "cancelled" ? " (otkazano)" : l.status === "done" ? " ✓" : ""}`);
      lines.push("");
    }
    lines.push(`Ukupno: ${terminaLabel(active.length)}, ${hours(minutes)}${amount ? `, ${money(amount)}` : ""}`);
    try { await navigator.clipboard.writeText(lines.join("\n")); toast("Popis je kopiran."); } catch { toast("Kopiranje nije uspjelo.", "err"); }
  }

  return (
    <div>
      <div className="mb-4 rounded-[22px] bg-white p-4 shadow-(--shadow-card)">
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => { const [a, b] = p.range(); return <Chip key={p.label} active={a === from && b === to} onClick={() => setRange([a, b])}>{p.label}</Chip>; })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Od"><DateField value={from} onChange={(d) => setRange([d, to < d ? d : to])} /></Field>
          <Field label="Do"><DateField value={to} onChange={(d) => setRange([from > d ? d : from, d])} /></Field>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-muted">{lessons ? (active.length ? `${terminaLabel(active.length)} · ${hours(minutes)}${amount ? ` · ${money(amount)}` : ""}` : "Nema termina u odabranom razdoblju") : "Učitavanje…"}</p>
        {active.length ? <Button variant="ghost" size="sm" onClick={copyList}><Copy className="size-4" />Kopiraj popis</Button> : null}
      </div>

      {invalid ? <p className="text-sm text-rose-600">Datum „Od” mora biti prije datuma „Do”.</p> : null}
      {lessons && !groups.length ? (
        <div className="rounded-[22px] bg-white/60"><Empty icon={<ListChecks className="size-6" />} title="Nema termina" text="Promijeni razdoblje ili dodaj novi termin gumbom +." /></div>
      ) : null}
      <div className="grid gap-5">
        {groups.map(([d, items]) => {
          const date = fromISO(d), isToday = isSameDay(date, now);
          return (
            <section key={d}>
              <h3 className="mb-2 px-1 text-sm font-bold text-ink-soft">{dayLong(date)}{isToday ? <span className="ml-2 text-xs font-bold uppercase tracking-wider text-brand">Danas</span> : null}</h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((l) => <LessonCard key={l.id} lesson={l} student={l.student_id ? studentsById.get(l.student_id) : undefined} onClick={() => onOpen(l)} past={l.date < todayIso} onDone={() => onDone([l.id])} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
