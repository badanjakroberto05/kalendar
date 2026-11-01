import { Check, Ban, Repeat } from "lucide-react";
import type { Lesson, Student } from "../lib/api";
import { colorOf } from "../lib/colors";
import { hhmm, diffMinutes } from "../lib/dates";
import { cx } from "./ui";

export default function LessonCard({ lesson, student, onClick, compact, past }: { lesson: Lesson; student?: Student; onClick: () => void; compact?: boolean; past?: boolean }) {
  const c = colorOf(student?.color);
  const done = lesson.status === "done", cancelled = lesson.status === "cancelled";
  const dur = diffMinutes(lesson.start_time, lesson.end_time);
  return (
    <button onClick={onClick}
      className={cx("group flex w-full items-stretch gap-3 rounded-2xl bg-white p-3 text-left shadow-(--shadow-card) transition hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(11,14,26,.05),0_14px_32px_rgba(11,14,26,.1)] active:scale-[.99]",
        (cancelled || (past && !done)) && "opacity-70")}>
      <span className={cx("w-1.5 shrink-0 rounded-full", cancelled ? "bg-slate-300" : c.bar)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cx("tabular text-[15px] font-bold", cancelled && "text-muted line-through")}>{hhmm(lesson.start_time)}<span className="text-muted font-medium"> – {hhmm(lesson.end_time)}</span></span>
          {!compact ? <span className="text-xs text-muted">{dur} min</span> : null}
        </span>
        <span className={cx("mt-0.5 block truncate font-semibold", cancelled ? "text-muted line-through" : "text-ink")}>{lesson.student_name}</span>
        {(lesson.subject || lesson.note) ? (
          <span className="block truncate text-sm text-muted">{[lesson.subject, compact ? null : lesson.note].filter(Boolean).join(" · ")}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end justify-between gap-1">
        {done ? <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" strokeWidth={3} /></span>
          : cancelled ? <span className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Ban className="size-3.5" /></span>
          : <span className="size-6" />}
        {lesson.series_id ? <Repeat className="size-3.5 text-slate-300" /> : null}
      </span>
    </button>
  );
}
