import { useEffect, useState } from "react";
import type { Lesson, Student } from "../lib/api";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import ListView from "./ListView";
import { Segmented } from "./ui";

export type Mode = "week" | "month" | "list";
const KEY = "kal:termini-mode";

export default function TerminiView(props: {
  anchor: Date; setAnchor: (d: Date) => void; lessons: Lesson[]; studentsById: Map<string, Student>; tick: number;
  onOpen: (l: Lesson) => void; onAdd: (date: string) => void; onDone: (ids: string[]) => void; initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(() => { if (props.initialMode) return props.initialMode; try { const m = localStorage.getItem(KEY); if (m === "week" || m === "month" || m === "list") return m; } catch { /* ignore */ } return "week"; });
  useEffect(() => { try { localStorage.setItem(KEY, mode); } catch { /* ignore */ } }, [mode]);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold tracking-tight sm:text-2xl">Termini</h1>
        <Segmented value={mode} onChange={setMode} className="w-full max-w-[320px]" options={[{ value: "week", label: "Tjedan" }, { value: "month", label: "Mjesec" }, { value: "list", label: "Popis" }]} />
      </div>
      {mode === "week" ? <WeekView {...props} /> : null}
      {mode === "month" ? <MonthView {...props} /> : null}
      {mode === "list" ? <ListView studentsById={props.studentsById} tick={props.tick} onOpen={props.onOpen} onDone={props.onDone} /> : null}
    </div>
  );
}
