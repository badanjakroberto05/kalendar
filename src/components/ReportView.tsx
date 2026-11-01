import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Receipt, Copy, Check, Clock, CalendarClock } from "lucide-react";
import { api, type Report, type ReportStudent } from "../lib/api";
import { colorOf } from "../lib/colors";
import { addMonths, fmt, fromISO, hhmm, hours, money, monthLabel, terminaLabel } from "../lib/dates";
import { Button, Card, Empty, IconButton, Toggle, cx, useToast } from "./ui";

export default function ReportView({ anchor, setAnchor, tick }: { anchor: Date; setAnchor: (d: Date) => void; tick: number }) {
  const toast = useToast();
  const month = fmt(anchor, "yyyy-MM");
  const [data, setData] = useState<Report | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [local, setLocal] = useState(0);

  useEffect(() => {
    let alive = true;
    api.report.month(month).then((r) => alive && setData(r)).catch((e) => toast(e.message, "err"));
    return () => { alive = false; };
  }, [month, tick, local, toast]);

  async function toggleInvoiced(s: ReportStudent, on: boolean) {
    try { await api.report.setInvoiced(s.key, month, on); setLocal((x) => x + 1); toast(on ? `${s.student_name}: označeno kao fakturirano.` : `${s.student_name}: oznaka maknuta.`); }
    catch (e) { toast((e as Error).message, "err"); }
  }
  async function copyFor(s: ReportStudent) {
    const lines = [
      `Instrukcije – ${s.student_name} – ${monthLabel(anchor)}`,
      ...s.done.map((l) => `${fmt(fromISO(l.date), "d.M.yyyy.")}  ${hhmm(l.start_time)}–${hhmm(l.end_time)}  ${hours(l.minutes)}${l.price != null ? `  ${money(l.price)}` : ""}${l.subject ? `  ${l.subject}` : ""}`),
      `Ukupno: ${terminaLabel(s.done.length)}, ${hours(s.minutes)}, ${money(s.amount)}`,
    ];
    try { await navigator.clipboard.writeText(lines.join("\n")); toast("Kopirano – zalijepi u fakturu ili poruku."); }
    catch { toast("Kopiranje nije uspjelo.", "err"); }
  }

  const t = data?.totals;
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-brand">Obračun</div>
          <h1 className="text-[22px] font-bold tracking-tight sm:text-2xl">{monthLabel(anchor)}</h1>
          <p className="hidden text-sm text-muted sm:block">Održani termini po učeniku, sati i iznos za fakturu.</p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Prethodni mjesec" onClick={() => setAnchor(addMonths(anchor, -1))}><ChevronLeft className="size-5" /></IconButton>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setAnchor(new Date())}>Ovaj mjesec</Button>
          <IconButton label="Sljedeći mjesec" onClick={() => setAnchor(addMonths(anchor, 1))}><ChevronRight className="size-5" /></IconButton>
        </div>
      </header>

      {t ? (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat label="Održano" value={String(t.lessons)} sub={t.scheduled ? `+${t.scheduled} zakazano` : "termina"} />
          <Stat label="Sati" value={hours(t.minutes)} sub="ukupno" />
          <Stat label="Za fakturirati" value={money(t.amount - t.invoiced_amount)} sub={t.invoiced_amount ? `fakturirano ${money(t.invoiced_amount)}` : `ukupno ${money(t.amount)}`} accent />
        </div>
      ) : null}

      {data && !data.students.length ? (
        <Card><Empty icon={<Receipt className="size-6" />} title="Nema održanih termina" text="Kad termin označiš kao „Održano”, pojavit će se ovdje s brojem sati i iznosom." /></Card>
      ) : null}

      <div className="grid gap-2">
        {data?.students.map((s) => {
          const c = colorOf(s.color), isOpen = open === s.key;
          return (
            <Card key={s.key} className={cx("overflow-hidden transition", s.invoiced && "opacity-80")}>
              <button onClick={() => setOpen(isOpen ? null : s.key)} className="flex w-full items-center gap-3.5 p-4 text-left">
                <span className={cx("flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold", c.soft, c.fg)}>{initials(s.student_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate font-semibold">{s.student_name}</span>{s.invoiced ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Fakturirano</span> : null}</span>
                  <span className="block text-sm text-muted">{s.done.length ? `${terminaLabel(s.done.length)} · ${hours(s.minutes)}` : "Još ništa održano"}{s.scheduled ? ` · ${s.scheduled} zakazano` : ""}</span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-lg font-bold">{money(s.amount)}</span>
                </span>
                <ChevronDown className={cx("size-4 shrink-0 text-slate-300 transition", isOpen && "rotate-180")} />
              </button>
              {isOpen ? (
                <div className="border-t border-line bg-slate-50/60 px-4 pb-4 pt-3">
                  {s.done.length ? (
                    <ul className="grid gap-1.5">
                      {s.done.map((l) => (
                        <li key={l.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[15px]">
                          <span className="w-[4.5rem] shrink-0 font-semibold">{fmt(fromISO(l.date), "EEE d.M.")}</span>
                          <span className="tabular flex items-center gap-1.5 text-ink-soft"><Clock className="size-3.5 text-muted" />{hhmm(l.start_time)}–{hhmm(l.end_time)}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-muted">{hours(l.minutes)}{l.subject ? <span className="hidden sm:inline"> · {l.subject}</span> : null}</span>
                          <span className="tabular font-semibold">{l.price != null ? money(l.price) : "–"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted">Nema održanih termina ovaj mjesec.</p>}
                  {s.scheduled ? <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarClock className="size-3.5" />Još {s.scheduled} zakazano ovaj mjesec – ulazi u obračun kad ga označiš kao održano.</p> : null}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 text-sm font-semibold"><Toggle checked={s.invoiced} onChange={(v) => toggleInvoiced(s, v)} />Fakturirano</label>
                    <Button variant="secondary" size="sm" onClick={() => copyFor(s)} disabled={!s.done.length}><Copy className="size-4" />Kopiraj popis</Button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
      {t && t.lessons > 0 && t.amount - t.invoiced_amount === 0 ? <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-emerald-700"><Check className="size-4" />Sve je fakturirano za ovaj mjesec.</p> : null}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cx("rounded-[20px] px-3.5 py-3 shadow-(--shadow-card)", accent ? "bg-ink text-white" : "bg-white")}>
      <div className={cx("text-[11px] font-bold uppercase tracking-wider", accent ? "text-white/60" : "text-muted")}>{label}</div>
      <div className="tabular mt-0.5 truncate text-lg font-bold sm:text-xl">{value}</div>
      {sub ? <div className={cx("truncate text-xs", accent ? "text-white/60" : "text-muted")}>{sub}</div> : null}
    </div>
  );
}
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
