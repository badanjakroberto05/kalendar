import { useState, type FormEvent } from "react";
import { Eye, EyeOff, CalendarDays } from "lucide-react";
import { api } from "../lib/api";
import { Button, Input } from "./ui";

export default function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await api.login(pw); onDone(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="anim-pop w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-[22px] bg-brand text-white shadow-[0_10px_30px_rgba(91,95,239,.35)]">
            <CalendarDays className="size-8" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">Kalendar instrukcija</h1>
          <p className="mt-1.5 text-muted">Upiši lozinku za ulaz.</p>
        </div>
        <form onSubmit={submit} className="rounded-[26px] bg-white p-5 shadow-(--shadow-card)">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Lozinka</span>
            <div className="relative">
              <Input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" placeholder="••••••••" className="pr-12 h-14 text-lg" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sakrij lozinku" : "Prikaži lozinku"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:bg-slate-100">
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </label>
          {err ? <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{err}</div> : null}
          <Button type="submit" size="lg" className="mt-4 w-full" loading={busy} disabled={!pw}>Uđi</Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">Privatna aplikacija · badxmedia.com</p>
      </div>
    </div>
  );
}
