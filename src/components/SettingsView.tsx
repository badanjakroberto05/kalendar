import { useEffect, useState, type FormEvent } from "react";
import { Bell, BellRing, Mail, Smartphone, Share, SquarePlus, LogOut, KeyRound, Send, Info } from "lucide-react";
import { api, type Me, type Settings } from "../lib/api";
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from "../lib/push";
import { Button, Card, Field, Input, Select, SettingRow, Sheet, Toggle, useToast } from "./ui";

export default function SettingsView({ me, refreshMe, onLogout }: { me: Me; refreshMe: () => Promise<void>; onLogout: () => void }) {
  const toast = useToast();
  const [s, setS] = useState<Settings>(me.settings);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  useEffect(() => setS(me.settings), [me.settings]);
  useEffect(() => { currentSubscription().then((sub) => setPushOn(Boolean(sub))).catch(() => {}); }, []);

  async function save(patch: Partial<Settings>) {
    const next = { ...s, ...patch }; setS(next);
    try { await api.settings.save(patch); } catch (e) { toast((e as Error).message, "err"); }
  }
  async function togglePush(on: boolean) {
    setPushBusy(true);
    try {
      if (on) {
        if (isIOS() && !isStandalone()) { setHowOpen(true); return; }
        await enablePush(me.vapidPublicKey || ""); setPushOn(true); toast("Obavijesti su uključene na ovom uređaju.");
      } else { await disablePush(); setPushOn(false); toast("Obavijesti su isključene."); }
      await refreshMe();
    } catch (e) { toast((e as Error).message, "err"); }
    finally { setPushBusy(false); }
  }
  async function sendNow() {
    setSendBusy(true);
    try {
      const r = await api.summary.send();
      const parts: string[] = [];
      if (r.push) parts.push(r.push.ok ? `push poslan na ${r.push.ok} uređaj${r.push.ok === 1 ? "" : "a"}` : "push nije poslan");
      if (r.email) parts.push(r.email.ok ? `email poslan na ${r.email.to}` : `email: ${r.email.error}`);
      if (!parts.length) parts.push("nema uključenih kanala ili uređaja");
      toast(`Pregled (${r.summary.range}): ${parts.join(", ")}.`, r.push?.ok || r.email?.ok ? "ok" : "err");
    } catch (e) { toast((e as Error).message, "err"); }
    finally { setSendBusy(false); }
  }

  const hourOpts = Array.from({ length: 8 }, (_, i) => 15 + i);
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <header><h1 className="text-[22px] font-bold tracking-tight sm:text-2xl">Postavke</h1><p className="text-sm text-muted">Obavijesti, uređaj i račun.</p></header>

      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">Tjedni pregled</h2>
        <Card className="divide-y divide-line">
          <SettingRow title="Nedjeljom navečer" desc="Sažetak svih termina za tjedan koji dolazi."
            right={<div className="w-28"><Select value={s.summary_hour} onChange={(e) => save({ summary_hour: Number(e.target.value) })} className="h-11">{hourOpts.map((h) => <option key={h} value={h}>{h}:00</option>)}</Select></div>} />
          <SettingRow title={<span className="flex items-center gap-2"><Smartphone className="size-4 text-muted" />Obavijest na mobitel</span> as unknown as string}
            desc={pushSupported() ? (me.pushDevices ? `Uključeno na ${me.pushDevices} ${me.pushDevices === 1 ? "uređaju" : "uređaja"}.` : "Stiže kao prava notifikacija na zaključani ekran.") : "Ovaj preglednik ne podržava obavijesti."}
            right={<Toggle checked={s.weekly_push} onChange={(v) => save({ weekly_push: v })} />} />
          <SettingRow title={<span className="flex items-center gap-2"><Mail className="size-4 text-muted" />Email</span> as unknown as string}
            desc={me.emailConfigured ? "Isti pregled stiže i na email." : "Slanje emaila nije podešeno na serveru (SMTP)."}
            right={<Toggle checked={s.weekly_email} onChange={(v) => save({ weekly_email: v })} disabled={!me.emailConfigured} />} />
          {s.weekly_email && me.emailConfigured ? (
            <div className="px-5 py-4">
              <Field label="Email adresa za pregled"><Input type="email" inputMode="email" value={s.notify_email} onChange={(e) => setS({ ...s, notify_email: e.target.value })} onBlur={() => save({ notify_email: s.notify_email })} placeholder="ime@gmail.com" /></Field>
            </div>
          ) : null}
          <div className="px-5 py-4"><Button variant="soft" onClick={sendNow} loading={sendBusy} className="w-full"><Send className="size-4" />Pošalji mi pregled odmah (test)</Button></div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">Ovaj uređaj</h2>
        <Card className="divide-y divide-line">
          <SettingRow title={<span className="flex items-center gap-2">{pushOn ? <BellRing className="size-4 text-emerald-600" /> : <Bell className="size-4 text-muted" />}Obavijesti na ovom uređaju</span> as unknown as string}
            desc={pushOn ? "Ovaj uređaj prima obavijesti." : isIOS() && !isStandalone() ? "Na iPhoneu prvo dodaj aplikaciju na početni zaslon." : "Dopusti obavijesti da ti stižu pregledi i podsjetnici."}
            right={<Toggle checked={pushOn} onChange={togglePush} disabled={pushBusy || !pushSupported()} />} />
          <SettingRow title="Podsjetnik prije termina" desc="Push obavijest neposredno prije svakog termina."
            right={<div className="flex items-center gap-2"><div className="w-24"><Select value={s.reminder_minutes} onChange={(e) => save({ reminder_minutes: Number(e.target.value) })} className="h-11 px-3" disabled={!s.reminder_push}>{[15, 30, 60, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></div><Toggle checked={s.reminder_push} onChange={(v) => save({ reminder_push: v })} /></div>} />
          <SettingRow title="Uobičajeno trajanje" desc="Koliko traje novi termin dok ne promijeniš."
            right={<div className="w-28"><Select value={s.default_duration} onChange={(e) => save({ default_duration: Number(e.target.value) })} className="h-11">{[45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></div>} />
          {!isStandalone() ? <div className="px-5 py-4"><Button variant="secondary" onClick={() => setHowOpen(true)} className="w-full"><SquarePlus className="size-4" />Kako dodati na početni zaslon</Button></div> : null}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">Račun</h2>
        <Card className="divide-y divide-line">
          <div className="grid gap-2 p-4">
            <Button variant="secondary" onClick={() => setPwOpen(true)}><KeyRound className="size-4" />Promijeni lozinku</Button>
            <Button variant="ghost" onClick={onLogout} className="text-rose-600"><LogOut className="size-4" />Odjava</Button>
          </div>
        </Card>
        <p className="mt-3 flex items-start gap-2 px-1 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />Podaci se čuvaju isključivo na tvom serveru (badxmedia). Nema vanjskih servisa ni pretplata.</p>
      </section>

      <PasswordSheet open={pwOpen} onClose={() => setPwOpen(false)} />
      <Sheet open={howOpen} onClose={() => setHowOpen(false)} title="Dodaj na početni zaslon">
        <ol className="grid gap-3 text-[15px]">
          <Step n={1}>Otvori ovu stranicu u <b>Safariju</b> (na iPhoneu).</Step>
          <Step n={2}>Dodirni gumb <b>Dijeli</b> <Share className="inline size-4 align-text-bottom" /> na dnu ekrana.</Step>
          <Step n={3}>Odaberi <b>„Dodaj na početni zaslon“</b> <SquarePlus className="inline size-4 align-text-bottom" /> i potvrdi.</Step>
          <Step n={4}>Otvori <b>Kalendar</b> s početnog zaslona i u Postavkama uključi obavijesti.</Step>
        </ol>
        <p className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-deep">Na Androidu: izbornik ⋮ u Chromeu → „Dodaj na početni zaslon“ / „Instaliraj aplikaciju“.</p>
        <Button className="mt-5 w-full" onClick={() => setHowOpen(false)}>U redu</Button>
      </Sheet>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span><span className="pt-0.5">{children}</span></li>;
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [rep, setRep] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setCur(""); setNext(""); setRep(""); setErr(null); } }, [open]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 4) return setErr("Nova lozinka mora imati bar 4 znaka.");
    if (next !== rep) return setErr("Lozinke se ne podudaraju.");
    setBusy(true);
    try { await api.changePassword(cur, next); toast("Lozinka je promijenjena."); onClose(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Promijeni lozinku">
      <form onSubmit={submit} className="grid gap-4 pt-1">
        <Field label="Trenutna lozinka"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="Nova lozinka"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Ponovi novu lozinku"><Input type="password" value={rep} onChange={(e) => setRep(e.target.value)} autoComplete="new-password" /></Field>
        {err ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{err}</div> : null}
        <Button type="submit" loading={busy} className="mt-1">Spremi lozinku</Button>
      </form>
    </Sheet>
  );
}
