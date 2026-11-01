import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Lesson, Student } from "../lib/api";
import { addMinutes, diffMinutes, todayISO } from "../lib/dates";
import { colorOf } from "../lib/colors";
import { Button, Chip, Field, Input, Segmented, Select, Sheet, Textarea, cx } from "./ui";

export interface LessonFormValues {
  student_name: string; student_id: string | null; date: string; start_time: string; end_time: string;
  subject: string; note: string; price: string; repeat_weeks: number; scope: "one" | "future";
}
const DURATIONS = [45, 60, 90, 120];

export default function LessonForm({ open, onClose, onSubmit, lesson, students, initialDate, defaultDuration = 60, busy }: {
  open: boolean; onClose: () => void; onSubmit: (v: LessonFormValues) => Promise<void> | void;
  lesson?: Lesson | null; students: Student[]; initialDate?: string; defaultDuration?: number; busy?: boolean;
}) {
  const editing = Boolean(lesson);
  const [v, setV] = useState<LessonFormValues>(() => initial(lesson, initialDate, defaultDuration));
  const [err, setErr] = useState<string | null>(null);
  const [focusStudent, setFocusStudent] = useState(false);

  useEffect(() => { if (open) { setV(initial(lesson, initialDate, defaultDuration)); setErr(null); } }, [open, lesson, initialDate, defaultDuration]);

  const set = <K extends keyof LessonFormValues>(k: K, val: LessonFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const dur = diffMinutes(v.start_time, v.end_time);

  const matches = useMemo(() => {
    const q = v.student_name.trim().toLowerCase();
    const list = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;
    return list.slice(0, 6);
  }, [v.student_name, students]);
  const exact = students.find((s) => s.name.toLowerCase() === v.student_name.trim().toLowerCase());

  function pickStudent(s: Student) {
    setV((st) => ({
      ...st, student_name: s.name, student_id: s.id,
      subject: st.subject || s.subject || "",
      price: st.price || (s.price != null ? String(s.price) : ""),
    }));
    setFocusStudent(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.student_name.trim()) return setErr("Upiši ime učenika.");
    if (!v.date) return setErr("Odaberi datum.");
    if (!v.start_time || !v.end_time) return setErr("Upiši vrijeme.");
    if (dur <= 0) return setErr("Kraj mora biti nakon početka.");
    setErr(null);
    await onSubmit({ ...v, student_id: exact?.id ?? v.student_id });
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Uredi termin" : "Novi termin"}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Odustani</Button>
          <Button type="submit" form="lesson-form" className="flex-[2]" loading={busy}>{editing ? "Spremi" : v.repeat_weeks > 1 ? `Dodaj ${v.repeat_weeks} termina` : "Dodaj termin"}</Button>
        </div>
      }>
      <form id="lesson-form" onSubmit={submit} className="grid gap-4 pt-1">
        <Field label="Učenik">
          <div className="relative">
            <Input value={v.student_name} onChange={(e) => { set("student_name", e.target.value); set("student_id", null); }}
              onFocus={() => setFocusStudent(true)} onBlur={() => setTimeout(() => setFocusStudent(false), 150)}
              placeholder="Ime učenika" autoComplete="off" autoCapitalize="words" />
            {exact ? <span className={cx("absolute right-3 top-1/2 size-3 -translate-y-1/2 rounded-full", colorOf(exact.color).dot)} /> : null}
          </div>
          {focusStudent && matches.length > 0 && !(matches.length === 1 && exact) ? (
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
              {matches.map((s) => (
                <button key={s.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickStudent(s)}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-medium hover:border-slate-300">
                  <span className={cx("size-2.5 rounded-full", colorOf(s.color).dot)} />{s.name}
                </button>
              ))}
            </div>
          ) : null}
          {v.student_name.trim() && !exact ? <span className="mt-1.5 block text-xs text-brand-deep">Novi učenik – bit će dodan u popis.</span> : null}
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <Field label="Datum" className="col-span-2">
            <Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} required />
          </Field>
          <Field label="Početak" className="sm:col-span-2">
            <Input type="time" step={300} value={v.start_time} onChange={(e) => { const st = e.target.value; setV((s) => ({ ...s, start_time: st, end_time: st ? addMinutes(st, dur > 0 ? dur : defaultDuration) : s.end_time })); }} required />
          </Field>
          <Field label="Kraj" className="sm:col-span-2">
            <Input type="time" step={300} value={v.end_time} onChange={(e) => set("end_time", e.target.value)} required />
          </Field>
        </div>
        <div className="-mt-1 flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <Chip key={d} active={dur === d} onClick={() => set("end_time", addMinutes(v.start_time, d))}>{d} min</Chip>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Predmet" className="col-span-2">
            <Input value={v.subject} onChange={(e) => set("subject", e.target.value)} placeholder="npr. Matematika" />
          </Field>
          <Field label="Cijena (€)">
            <Input type="number" inputMode="decimal" min={0} step="0.5" value={v.price} onChange={(e) => set("price", e.target.value)} placeholder="–" />
          </Field>
        </div>

        <Field label="Napomena">
          <Textarea value={v.note} onChange={(e) => set("note", e.target.value)} placeholder="Gradivo, priprema za ispit, online..." rows={2} />
        </Field>

        {!editing ? (
          <Field label="Ponavljanje">
            <Segmented value={v.repeat_weeks > 1 ? "weekly" : "once"} onChange={(x) => set("repeat_weeks", x === "weekly" ? 8 : 1)}
              options={[{ value: "once", label: "Jednom" }, { value: "weekly", label: "Svaki tjedan" }]} />
            {v.repeat_weeks > 1 ? (
              <div className="mt-2">
                <Select value={v.repeat_weeks} onChange={(e) => set("repeat_weeks", Number(e.target.value))}>
                  {[4, 8, 12, 16, 20, 30, 40].map((n) => <option key={n} value={n}>{n} tjedana</option>)}
                </Select>
                <span className="mt-1.5 block text-xs text-muted">Isti dan i vrijeme svaki tjedan. Svaki termin kasnije možeš zasebno urediti.</span>
              </div>
            ) : null}
          </Field>
        ) : lesson?.series_id ? (
          <Field label="Primijeni na" hint="Datum se mijenja samo ovom terminu. Vrijeme, učenik, predmet, cijena i napomena mogu se primijeniti na sve buduće.">
            <Segmented value={v.scope} onChange={(x) => set("scope", x)} options={[{ value: "one", label: "Samo ovaj termin" }, { value: "future", label: "Ovaj i sve buduće" }]} />
          </Field>
        ) : null}

        {err ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{err}</div> : null}
      </form>
    </Sheet>
  );
}

function initial(lesson: Lesson | null | undefined, initialDate: string | undefined, defaultDuration: number): LessonFormValues {
  if (lesson) {
    return { student_name: lesson.student_name, student_id: lesson.student_id, date: lesson.date, start_time: lesson.start_time.slice(0, 5), end_time: lesson.end_time.slice(0, 5),
      subject: lesson.subject || "", note: lesson.note || "", price: lesson.price != null ? String(lesson.price) : "", repeat_weeks: 1, scope: "one" };
  }
  const start = "16:00";
  return { student_name: "", student_id: null, date: initialDate || todayISO(), start_time: start, end_time: addMinutes(start, defaultDuration), subject: "", note: "", price: "", repeat_weeks: 1, scope: "one" };
}
