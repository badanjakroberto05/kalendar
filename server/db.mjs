import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "kalendar.sqlite"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
create table if not exists kv (
  key text primary key,
  value text not null
);
create table if not exists students (
  id text primary key,
  name text not null,
  subject text,
  phone text,
  price real,
  color text not null default 'indigo',
  note text,
  created_at text not null default (datetime('now'))
);
create table if not exists lessons (
  id text primary key,
  student_id text references students(id) on delete set null,
  student_name text not null,
  date text not null,
  start_time text not null,
  end_time text not null,
  subject text,
  note text,
  price real,
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  series_id text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists lessons_date_idx on lessons(date, start_time);
create index if not exists lessons_series_idx on lessons(series_id);
create table if not exists invoiced (
  student_key text not null,
  month text not null,
  created_at text not null default (datetime('now')),
  primary key (student_key, month)
);
create table if not exists push_subscriptions (
  id text primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at text not null default (datetime('now'))
);
`);

export const uuid = () => crypto.randomUUID();

export function kvGet(key, fallback = null) {
  const row = db.prepare("select value from kv where key = ?").get(key);
  return row ? row.value : fallback;
}
export function kvSet(key, value) {
  db.prepare(
    "insert into kv (key, value) values (?, ?) on conflict(key) do update set value = excluded.value"
  ).run(key, String(value));
}

const DEFAULT_SETTINGS = {
  notify_email: process.env.NOTIFY_EMAIL || "",
  weekly_email: true,
  weekly_push: true,
  summary_hour: 19,
  reminder_push: true,
  reminder_minutes: 60,
  default_duration: 60,
};

export function getSettings() {
  const raw = kvGet("settings");
  const saved = raw ? JSON.parse(raw) : {};
  return { ...DEFAULT_SETTINGS, ...saved };
}
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  kvSet("settings", JSON.stringify(next));
  return next;
}

// ---- učenici ----
export const students = {
  all: () => db.prepare("select * from students order by name collate nocase").all(),
  get: (id) => db.prepare("select * from students where id = ?").get(id),
  findByName: (name) =>
    db.prepare("select * from students where lower(trim(name)) = lower(trim(?))").get(name),
  create: (s) => {
    const id = uuid();
    db.prepare(
      "insert into students (id, name, subject, phone, price, color, note) values (?,?,?,?,?,?,?)"
    ).run(id, s.name.trim(), s.subject || null, s.phone || null, s.price ?? null, s.color || "indigo", s.note || null);
    return students.get(id);
  },
  update: (id, s) => {
    const cur = students.get(id);
    if (!cur) return null;
    const next = { ...cur, ...s };
    db.prepare(
      "update students set name=?, subject=?, phone=?, price=?, color=?, note=? where id=?"
    ).run(next.name.trim(), next.subject || null, next.phone || null, next.price ?? null, next.color || "indigo", next.note || null, id);
    if (s.name && s.name !== cur.name) {
      db.prepare("update lessons set student_name=? where student_id=?").run(next.name.trim(), id);
    }
    return students.get(id);
  },
  remove: (id) => db.prepare("delete from students where id = ?").run(id),
  counts: () =>
    db.prepare(
      "select student_id, count(*) as total, sum(case when date >= date('now','localtime') and status='scheduled' then 1 else 0 end) as upcoming from lessons where student_id is not null group by student_id"
    ).all(),
};

// ---- termini ----
export const lessons = {
  range: (from, to) =>
    db.prepare("select * from lessons where date >= ? and date <= ? order by date, start_time").all(from, to),
  get: (id) => db.prepare("select * from lessons where id = ?").get(id),
  insertMany: (rows) => {
    const stmt = db.prepare(
      "insert into lessons (id, student_id, student_name, date, start_time, end_time, subject, note, price, status, series_id) values (?,?,?,?,?,?,?,?,?,?,?)"
    );
    const tx = () => {
      for (const r of rows) {
        stmt.run(r.id, r.student_id || null, r.student_name, r.date, r.start_time, r.end_time, r.subject || null, r.note || null, r.price ?? null, r.status || "scheduled", r.series_id || null);
      }
    };
    db.exec("begin");
    try { tx(); db.exec("commit"); } catch (e) { db.exec("rollback"); throw e; }
    return rows.map((r) => lessons.get(r.id));
  },
  update: (id, patch) => {
    const cur = lessons.get(id);
    if (!cur) return null;
    const n = { ...cur, ...patch };
    db.prepare(
      "update lessons set student_id=?, student_name=?, date=?, start_time=?, end_time=?, subject=?, note=?, price=?, status=?, updated_at=datetime('now') where id=?"
    ).run(n.student_id || null, n.student_name, n.date, n.start_time, n.end_time, n.subject || null, n.note || null, n.price ?? null, n.status, id);
    return lessons.get(id);
  },
  futureInSeries: (seriesId, fromDate) =>
    db.prepare("select * from lessons where series_id = ? and date >= ? order by date").all(seriesId, fromDate),
  remove: (id) => db.prepare("delete from lessons where id = ?").run(id),
  removeFutureInSeries: (seriesId, fromDate) =>
    db.prepare("delete from lessons where series_id = ? and date >= ?").run(seriesId, fromDate),
};

// ---- push ----
export const pushSubs = {
  all: () => db.prepare("select * from push_subscriptions").all(),
  upsert: (sub, ua) => {
    db.prepare(
      "insert into push_subscriptions (id, endpoint, p256dh, auth, user_agent) values (?,?,?,?,?) on conflict(endpoint) do update set p256dh=excluded.p256dh, auth=excluded.auth, user_agent=excluded.user_agent"
    ).run(uuid(), sub.endpoint, sub.keys.p256dh, sub.keys.auth, ua || null);
  },
  remove: (endpoint) => db.prepare("delete from push_subscriptions where endpoint = ?").run(endpoint),
  count: () => db.prepare("select count(*) as n from push_subscriptions").get().n,
};

// ---- obračun ----
export const report = {
  month: (month) => {
    const rows = db.prepare(
      "select l.*, s.color, s.phone from lessons l left join students s on s.id = l.student_id where substr(l.date,1,7) = ? and l.status != 'cancelled' order by l.date, l.start_time"
    ).all(month);
    const invoiced = new Set(db.prepare("select student_key from invoiced where month = ?").all(month).map((r) => r.student_key));
    const groups = new Map();
    for (const l of rows) {
      const key = l.student_id || "name:" + l.student_name.toLowerCase();
      if (!groups.has(key)) groups.set(key, { key, student_id: l.student_id, student_name: l.student_name, color: l.color || "indigo", phone: l.phone, done: [], scheduled: 0, minutes: 0, amount: 0, invoiced: invoiced.has(key) });
      const g = groups.get(key);
      if (l.status === "done") {
        const [sh, sm] = l.start_time.split(":").map(Number), [eh, em] = l.end_time.split(":").map(Number);
        const mins = eh * 60 + em - (sh * 60 + sm);
        g.minutes += mins; g.amount += Number(l.price) || 0;
        g.done.push({ id: l.id, date: l.date, start_time: l.start_time, end_time: l.end_time, minutes: mins, price: l.price, subject: l.subject, note: l.note });
      } else g.scheduled++;
    }
    const students = [...groups.values()].sort((a, b) => b.amount - a.amount || b.minutes - a.minutes || a.student_name.localeCompare(b.student_name));
    return {
      month, students,
      totals: {
        lessons: students.reduce((n, g) => n + g.done.length, 0),
        minutes: students.reduce((n, g) => n + g.minutes, 0),
        amount: students.reduce((n, g) => n + g.amount, 0),
        scheduled: students.reduce((n, g) => n + g.scheduled, 0),
        invoiced_amount: students.filter((g) => g.invoiced).reduce((n, g) => n + g.amount, 0),
      },
    };
  },
  setInvoiced: (key, month, on) => {
    if (on) db.prepare("insert or ignore into invoiced (student_key, month) values (?, ?)").run(key, month);
    else db.prepare("delete from invoiced where student_key = ? and month = ?").run(key, month);
  },
};
