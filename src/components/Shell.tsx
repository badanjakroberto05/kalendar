import type { ReactNode } from "react";
import { CalendarRange, CalendarDays, Users, Receipt, Settings as SettingsIcon, Plus } from "lucide-react";
import { cx } from "./ui";

export type View = "termini" | "students" | "report" | "settings";
const NAV: { id: View; label: string; icon: typeof CalendarRange }[] = [
  { id: "termini", label: "Termini", icon: CalendarRange },
  { id: "students", label: "Učenici", icon: Users },
  { id: "report", label: "Obračun", icon: Receipt },
  { id: "settings", label: "Postavke", icon: SettingsIcon },
];

export default function Shell({ view, setView, onAdd, children }: { view: View; setView: (v: View) => void; onAdd: () => void; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white/70 px-4 py-6 backdrop-blur lg:flex lg:sticky lg:top-0 lg:h-dvh">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_6px_16px_rgba(91,95,239,.3)]"><CalendarDays className="size-5" /></span>
          <div><div className="font-bold leading-tight">Kalendar</div><div className="text-xs text-muted">instrukcije</div></div>
        </div>
        <button onClick={onAdd} className="mb-6 flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink font-semibold text-white transition hover:bg-black active:scale-[.98]"><Plus className="size-5" />Novi termin</button>
        <nav className="grid gap-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition", view === n.id ? "bg-brand-soft text-brand-deep" : "text-ink-soft hover:bg-slate-100")}>
              <n.icon className="size-5" />{n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-2 text-xs text-muted">kalendar.badxmedia.com</div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="pt-safe" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</div>
      </main>

      {/* Mobile bottom nav + FAB */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-canvas to-transparent" />
        <div className="pointer-events-none flex justify-end px-5 pb-3">
          <button onClick={onAdd} aria-label="Novi termin" className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-ink text-white shadow-(--shadow-pop) transition active:scale-95"><Plus className="size-7" /></button>
        </div>
        <nav className="pb-safe border-t border-line bg-white/90 backdrop-blur-xl">
          <div className="grid grid-cols-4">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setView(n.id)} className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition", view === n.id ? "text-brand" : "text-muted")}>
                <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition", view === n.id && "bg-brand-soft")}><n.icon className="size-5" /></span>{n.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
