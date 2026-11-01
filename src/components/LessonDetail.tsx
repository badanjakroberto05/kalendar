import { useState } from "react";
import { Check, Ban, Pencil, Trash2, Clock, CalendarDays, Phone, Repeat, RotateCcw, StickyNote, Euro } from "lucide-react";
import type { Lesson, Student } from "../lib/api";
import { colorOf } from "../lib/colors";
import { dayLong, fromISO, hhmm, diffMinutes, money, relativeDay } from "../lib/dates";
import { Button, Confirm, Sheet, cx } from "./ui";

export default function LessonDetail({ lesson, student, onClose, onEdit, onStatus, onDelete }: {
  lesson: Lesson | null; student?: Student; onClose: () => void; onEdit: () => void;
  onStatus: (s: Lesson["status"]) => void; onDelete: (scope: "one" | "future") => void;
}) {
  const [confirm, setConfirm] = useState(false);
  if (!lesson) return null;
  const c = colorOf(student?.color);
  const rel = relativeDay(lesson.date);
  return (
    <>
      <Sheet open={Boolean(lesson)} onClose={onClose} title="Termin">
        <div className={cx("rounded-[22px] p-5", c.bg)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cx("text-[13px] font-bold uppercase tracking-wider", c.fg)}>{student?.subject || lesson.subject || "Instrukcije"}</div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{lesson.student_name}</div>
            </div>
            <StatusBadge status={lesson.status} />
          </div>
          <div className="mt-4 grid gap-2 text-[15px]">
            <Row icon={<CalendarDays className="size-4" />}>{dayLong(fromISO(lesson.date))}{rel ? <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{rel}</span> : null}</Row>
            <Row icon={<Clock className="size-4" />}><span className="tabular">{hhmm(lesson.start_time)} – {hhmm(lesson.end_time)}</span><span className="text-muted"> · {diffMinutes(lesson.start_time, lesson.end_time)} min</span></Row>
            {lesson.subject && student?.subject && lesson.subject !== student.subject ? <Row icon={<StickyNote className="size-4" />}>{lesson.subject}</Row> : null}
            {lesson.price != null ? <Row icon={<Euro className="size-4" />}>{money(lesson.price)}</Row> : null}
            {lesson.note ? <Row icon={<StickyNote className="size-4" />}>{lesson.note}</Row> : null}
            {student?.phone ? <Row icon={<Phone className="size-4" />}><a href={`tel:${student.phone}`} className="underline decoration-dotted">{student.phone}</a></Row> : null}
            {lesson.series_id ? <Row icon={<Repeat className="size-4" />}><span className="text-muted">Dio tjednog ponavljanja</span></Row> : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {lesson.status === "done" ? (
            <Button variant="secondary" onClick={() => onStatus("scheduled")}><RotateCcw className="size-4" />Vrati u zakazano</Button>
          ) : (
            <Button variant="secondary" className="text-emerald-700" onClick={() => onStatus("done")}><Check className="size-4" />Održano</Button>
          )}
          {lesson.status === "cancelled" ? (
            <Button variant="secondary" onClick={() => onStatus("scheduled")}><RotateCcw className="size-4" />Vrati u zakazano</Button>
          ) : (
            <Button variant="secondary" className="text-slate-600" onClick={() => onStatus("cancelled")}><Ban className="size-4" />Otkazano</Button>
          )}
          <Button variant="soft" onClick={onEdit}><Pencil className="size-4" />Uredi</Button>
          <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" />Obriši</Button>
        </div>
      </Sheet>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title="Obrisati termin?" danger confirmLabel="Obriši"
        text={lesson.series_id ? undefined : `${lesson.student_name}, ${dayLong(fromISO(lesson.date))} u ${hhmm(lesson.start_time)}.`}
        options={lesson.series_id ? [
          { value: "one", label: "Samo ovaj termin", desc: dayLong(fromISO(lesson.date)) },
          { value: "future", label: "Ovaj i sve buduće", desc: "Briše cijelo ponavljanje od ovog datuma nadalje" },
        ] : undefined}
        onConfirm={(choice) => { setConfirm(false); onDelete((choice as "one" | "future") || "one"); }} />
    </>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-3"><span className="text-muted">{icon}</span><span className="min-w-0">{children}</span></div>;
}
export function StatusBadge({ status }: { status: Lesson["status"] }) {
  if (status === "done") return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Održano</span>;
  if (status === "cancelled") return <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">Otkazano</span>;
  return <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-ink-soft">Zakazano</span>;
}
