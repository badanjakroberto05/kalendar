import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Lesson, type Me, type Student } from "./lib/api";
import { addDays, endOfMonth, startOfMonth, toISO, weekStart, fromISO } from "./lib/dates";
import { ToastProvider, useToast } from "./components/ui";
import Login from "./components/Login";
import Shell, { type View } from "./components/Shell";
import WeekView from "./components/WeekView";
import MonthView from "./components/MonthView";
import StudentsView from "./components/StudentsView";
import SettingsView from "./components/SettingsView";
import ReportView from "./components/ReportView";
import LessonForm, { type LessonFormValues } from "./components/LessonForm";
import LessonDetail from "./components/LessonDetail";

export default function App() {
  return <ToastProvider><Root /></ToastProvider>;
}

function Root() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const load = useCallback(async () => { try { setMe(await api.me()); } catch { setMe(null); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const h = () => setMe(null); window.addEventListener("kal:unauthorized", h); return () => window.removeEventListener("kal:unauthorized", h); }, []);
  if (me === undefined) return <div className="flex min-h-dvh items-center justify-center text-muted">Učitavanje…</div>;
  if (me === null) return <Login onDone={load} />;
  return <Main me={me} refreshMe={load} onLogout={async () => { await api.logout(); setMe(null); }} />;
}

type SheetState = { kind: "create"; date?: string } | { kind: "edit"; lesson: Lesson } | { kind: "detail"; lesson: Lesson } | null;

function Main({ me, refreshMe, onLogout }: { me: Me; refreshMe: () => Promise<void>; onLogout: () => void }) {
  const toast = useToast();
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => { const p = params.get("week") || params.get("date"); return p ? fromISO(p) : new Date(); });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // raspon koji se učitava: cijeli mjesec oko ankera (+ tjedan prije/poslije) – pokriva tjedan i mjesec
  const range = useMemo(() => {
    const from = addDays(weekStart(startOfMonth(anchor)), -7), to = addDays(endOfMonth(anchor), 14);
    return { from: toISO(from), to: toISO(to) };
  }, [anchor]);

  useEffect(() => {
    let alive = true;
    api.lessons.range(range.from, range.to).then((l) => alive && setLessons(l)).catch((e) => toast(e.message, "err"));
    return () => { alive = false; };
  }, [range, tick, toast]);
  useEffect(() => { api.students.all().then(setStudents).catch(() => {}); }, [tick]);
  useEffect(() => { const h = () => document.visibilityState === "visible" && refresh(); document.addEventListener("visibilitychange", h); return () => document.removeEventListener("visibilitychange", h); }, []);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  async function run<T>(fn: () => Promise<T>, ok?: string) {
    setBusy(true);
    try { const r = await fn(); refresh(); if (ok) toast(ok); return r; }
    catch (e) { toast((e as Error).message, "err"); throw e; }
    finally { setBusy(false); }
  }

  async function submitLesson(v: LessonFormValues) {
    const payload = { student_name: v.student_name.trim(), student_id: v.student_id, date: v.date, start_time: v.start_time, end_time: v.end_time, subject: v.subject.trim() || null, note: v.note.trim() || null, price: v.price === "" ? null : Number(v.price) };
    try {
      if (sheet?.kind === "edit") { await run(() => api.lessons.update(sheet.lesson.id, { ...payload, scope: v.scope }), "Termin je spremljen."); }
      else { await run(() => api.lessons.create({ ...payload, repeat_weeks: v.repeat_weeks }), v.repeat_weeks > 1 ? `Dodano ${v.repeat_weeks} termina.` : "Termin je dodan."); }
      setSheet(null);
    } catch { /* toast već prikazan */ }
  }

  const detail = sheet?.kind === "detail" ? lessons.find((l) => l.id === sheet.lesson.id) || sheet.lesson : null;

  return (
    <Shell view={view} setView={setView} onAdd={() => setSheet({ kind: "create", date: view === "week" ? toISO(anchor >= new Date() ? anchor : new Date()) : undefined })}>
      {view === "week" ? <WeekView anchor={anchor} setAnchor={setAnchor} lessons={lessons} studentsById={studentsById} onOpen={(l) => setSheet({ kind: "detail", lesson: l })} onAdd={(d) => setSheet({ kind: "create", date: d })} /> : null}
      {view === "month" ? <MonthView anchor={anchor} setAnchor={setAnchor} lessons={lessons} studentsById={studentsById} onOpen={(l) => setSheet({ kind: "detail", lesson: l })} onAdd={(d) => setSheet({ kind: "create", date: d })} /> : null}
      {view === "students" ? <StudentsView students={students} busy={busy}
        onSave={async (s, id) => { await run(() => (id ? api.students.update(id, s) : api.students.create(s)), "Spremljeno."); }}
        onDelete={async (id) => { await run(() => api.students.remove(id), "Učenik je obrisan."); }} /> : null}
      {view === "report" ? <ReportView anchor={anchor} setAnchor={setAnchor} tick={tick} /> : null}
      {view === "settings" ? <SettingsView me={me} refreshMe={refreshMe} onLogout={onLogout} /> : null}

      <LessonForm open={sheet?.kind === "create" || sheet?.kind === "edit"} onClose={() => setSheet(null)} onSubmit={submitLesson} busy={busy}
        lesson={sheet?.kind === "edit" ? sheet.lesson : null} students={students} initialDate={sheet?.kind === "create" ? sheet.date : undefined} defaultDuration={me.settings.default_duration} />
      <LessonDetail lesson={detail} student={detail?.student_id ? studentsById.get(detail.student_id) : undefined} onClose={() => setSheet(null)}
        onEdit={() => detail && setSheet({ kind: "edit", lesson: detail })}
        onStatus={(st) => detail && run(() => api.lessons.update(detail.id, { status: st }), st === "done" ? "Označeno kao održano." : st === "cancelled" ? "Termin je otkazan." : "Vraćeno u zakazano.").catch(() => {})}
        onDelete={(scope) => detail && run(() => api.lessons.remove(detail.id, scope), scope === "future" ? "Obrisani su ovaj i budući termini." : "Termin je obrisan.").then(() => setSheet(null)).catch(() => {})} />
    </Shell>
  );
}
