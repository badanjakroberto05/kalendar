import { Check, Ban, Repeat } from "lucide-react";
import type { Lesson, Student } from "../lib/api";
import { colorOf } from "../lib/colors";
import { hhmm, diffMinutes } from "../lib/dates";
import { cx } from "./ui";

export default function LessonCard({ lesson, student, onClick, onDone, compact, past }: {
  lesson: Lesson; student?: Student; onClick: () => void; onDone?: () => void; compact?: boolean; past?: boolean;
}) {
  const c = colorOf(student?.color);
  const done = lesson.status === "done", cancelled = lesson.status === "cancelled";
  const dur = diffMinutes(lesson.start_time, lesson.end_time);
  const needsCheck = past && lesson.status === "scheduled" && Boolean(onDone);
  const status = done ? <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Održano"><Check className="size-3" strokeWidth={3} /></span>
    : cancelled ? <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-500" title="Otkazano"><Ban className="size-3" /></span>
    : needsCheck ? (
      <button onClick={(e) => { e.stopPropagation(); onDone?.(); }} title="Označi kao održano" aria-label="Označi kao održano"
        className="flex size-6 items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-amber-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 active:scale-90">
        <Check className="size-3.5" strokeWidth={3} />
      </button>
    ) : null;
  if (compact) {
    return (
      <div className={cx("relative min-w-0 overflow-hidden rounded-2xl bg-white p-2.5 shadow-(--shadow-card) transition hover:-translate-y-px", cancelled && "opacity-60")}>
        <div className="flex items-center justify-between gap-1.5">
          <button onClick={onClick} className={cx("tabular min-w-0 truncate text-[12px] font-bold", cancelled && "text-muted line-through")}>{hhmm(lesson.start_time)}<span className="font-medium text-muted">–{hhmm(lesson.end_time)}</span></button>
          <span className="shrink-0">{status}</span>
        </div>
        <button onClick={onClick} className="block w-full min-w-0 text-left">
          <span className="flex items-center gap-1.5">
            <span className={cx("size-2 shrink-0 rounded-full", cancelled ? "bg-slate-300" : c.dot)} />
            <span className={cx("truncate text-[14px] font-semibold leading-tight", cancelled ? "text-muted line-through" : "text-ink")}>{lesson.student_name}</span>
          </span>
          {lesson.subject ? <span className="block truncate pl-3.5 text-xs text-muted">{lesson.subject}</span> : null}
        </button>
      </div>
    );
  }
  return (
    <div className={cx("group relative flex w-full min-w-0 items-stretch overflow-hidden rounded-2xl bg-white text-left shadow-(--shadow-card) transition hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(11,14,26,.05),0_14px_32px_rgba(11,14,26,.1)]",
      compact ? "gap-2 p-2.5" : "gap-3 p-3", cancelled && "opacity-60")}>
      <span className={cx("w-1.5 shrink-0 rounded-full", cancelled ? "bg-slate-300" : c.bar)} />
      <button onClick={onClick} className="min-w-0 flex-1 overflow-hidden text-left active:scale-[.99]">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cx("tabular block truncate font-bold", compact ? "text-[13px]" : "text-[15px]", cancelled && "text-muted line-through")}>
            {hhmm(lesson.start_time)}<span className="font-medium text-muted">–{hhmm(lesson.end_time)}</span>
          </span>
          {!compact ? <span className="text-xs text-muted">{dur} min</span> : null}
        </span>
        <span className={cx("mt-0.5 block truncate font-semibold", compact ? "text-[14px] leading-tight" : "", cancelled ? "text-muted line-through" : "text-ink")}>{lesson.student_name}</span>
        {(lesson.subject || (!compact && lesson.note)) ? (
          <span className={cx("block truncate text-muted", compact ? "text-xs" : "text-sm")}>{[lesson.subject, compact ? null : lesson.note].filter(Boolean).join(" · ")}</span>
        ) : null}
      </button>
      <span className={cx("flex shrink-0 flex-col items-end justify-between", compact ? "gap-0.5" : "gap-1")}>
        {done ? <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Održano"><Check className="size-3.5" strokeWidth={3} /></span>
          : cancelled ? <span className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-500" title="Otkazano"><Ban className="size-3.5" /></span>
          : needsCheck ? (
            <button onClick={(e) => { e.stopPropagation(); onDone?.(); }} title="Označi kao održano" aria-label="Označi kao održano"
              className={cx("flex items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-amber-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 active:scale-90", compact ? "size-7" : "size-8")}>
              <Check className="size-4" strokeWidth={3} />
            </button>
          ) : <span className="size-6" />}
        {lesson.series_id && !compact ? <Repeat className="size-3.5 text-slate-300" /> : null}
      </span>
    </div>
  );
}
