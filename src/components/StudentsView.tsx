import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Users, Phone, Trash2, ChevronRight } from "lucide-react";
import type { Student } from "../lib/api";
import { COLOR_KEYS, colorOf } from "../lib/colors";
import { money, plural } from "../lib/dates";
import { Button, Confirm, Empty, Field, Input, Sheet, Textarea, cx } from "./ui";

export default function StudentsView({ students, onSave, onDelete, busy }: {
  students: Student[]; onSave: (s: Partial<Student>, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void>; busy?: boolean;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Student | null | "new">(null);
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? students.filter((x) => x.name.toLowerCase().includes(s) || (x.subject || "").toLowerCase().includes(s)) : students; }, [q, students]);

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-[22px] font-bold tracking-tight sm:text-2xl">Učenici</h1>
          <p className="text-sm text-muted">{students.length ? `${students.length} ${plural(students.length, "učenik", "učenika", "učenika")}` : "Još nema učenika"}</p>
        </div>
        <Button variant="soft" size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />Novi</Button>
      </header>
      {students.length > 4 ? (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Traži učenika" className="pl-11" />
        </div>
      ) : null}
      {list.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((s) => {
            const c = colorOf(s.color);
            return (
              <button key={s.id} onClick={() => setEditing(s)} className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 text-left shadow-(--shadow-card) transition hover:-translate-y-px active:scale-[.99]">
                <span className={cx("flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold", c.soft, c.fg)}>{initials(s.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-sm text-muted">{[s.subject, s.price != null ? money(s.price) : null, s.upcoming ? `${s.upcoming} ${plural(s.upcoming, "nadolazeći", "nadolazeća", "nadolazećih")}` : null].filter(Boolean).join(" · ") || "Bez detalja"}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[22px] bg-white/60"><Empty icon={<Users className="size-6" />} title={q ? "Nema rezultata" : "Još nema učenika"} text={q ? "Pokušaj s drugim imenom." : "Učenici se automatski dodaju kad upišeš novi termin, a ovdje ih možeš urediti."} action={!q ? <Button variant="soft" onClick={() => setEditing("new")}><Plus className="size-4" />Dodaj učenika</Button> : undefined} /></div>
      )}
      <StudentForm open={editing !== null} student={editing === "new" ? null : editing} onClose={() => setEditing(null)} busy={busy}
        onSave={async (v, id) => { await onSave(v, id); setEditing(null); }}
        onDelete={async (id) => { await onDelete(id); setEditing(null); }} />
    </div>
  );
}

const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function StudentForm({ open, student, onClose, onSave, onDelete, busy }: {
  open: boolean; student: Student | null; onClose: () => void; onSave: (v: Partial<Student>, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void>; busy?: boolean;
}) {
  const blank = { name: "", subject: "", phone: "", price: "", color: "indigo", note: "" };
  const [v, setV] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (open) { setV(student ? { name: student.name, subject: student.subject || "", phone: student.phone || "", price: student.price != null ? String(student.price) : "", color: student.color, note: student.note || "" } : blank); setErr(null); } }, [open, student]); // eslint-disable-line
  const set = (k: keyof typeof blank, val: string) => setV((s) => ({ ...s, [k]: val }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return setErr("Upiši ime.");
    try { await onSave({ name: v.name.trim(), subject: v.subject || null, phone: v.phone || null, price: v.price === "" ? null : Number(v.price), color: v.color, note: v.note || null }, student?.id); }
    catch (e) { setErr((e as Error).message); }
  }
  return (
    <>
      <Sheet open={open} onClose={onClose} title={student ? "Učenik" : "Novi učenik"}
        footer={<div className="flex gap-2">
          {student ? <Button variant="danger" onClick={() => setConfirm(true)} className="px-4"><Trash2 className="size-4" /></Button> : null}
          <Button variant="secondary" onClick={onClose} className="flex-1">Odustani</Button>
          <Button type="submit" form="student-form" className="flex-[2]" loading={busy}>Spremi</Button>
        </div>}>
        <form id="student-form" onSubmit={submit} className="grid gap-4 pt-1">
          <Field label="Ime i prezime"><Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="npr. Ana Horvat" autoCapitalize="words" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Predmet" className="col-span-2"><Input value={v.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Matematika" /></Field>
            <Field label="Cijena (€)"><Input type="number" inputMode="decimal" min={0} step="0.5" value={v.price} onChange={(e) => set("price", e.target.value)} placeholder="–" /></Field>
          </div>
          <Field label="Telefon (roditelj / učenik)">
            <div className="relative"><Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+385 ..." className="pl-11" /></div>
          </Field>
          <Field label="Boja u kalendaru">
            <div className="flex flex-wrap gap-2.5">
              {COLOR_KEYS.map((k) => <button key={k} type="button" aria-label={k} onClick={() => set("color", k)} className={cx("size-9 rounded-full transition", colorOf(k).dot, v.color === k ? "ring-4 ring-ink/15 scale-110" : "opacity-80 hover:opacity-100")} />)}
            </div>
          </Field>
          <Field label="Bilješke"><Textarea value={v.note} onChange={(e) => set("note", e.target.value)} placeholder="Razred, škola, ciljevi..." rows={2} /></Field>
          {err ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{err}</div> : null}
        </form>
      </Sheet>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title="Obrisati učenika?" text="Termini ostaju u kalendaru, ali više neće biti povezani s učenikom." danger confirmLabel="Obriši"
        onConfirm={async () => { setConfirm(false); if (student) await onDelete(student.id); }} />
    </>
  );
}
