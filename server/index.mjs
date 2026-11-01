import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { students, lessons, pushSubs, report, getSettings, saveSettings, uuid } from "./db.mjs";
import {
  ensurePassword, checkPassword, setPassword, issueSession, verifySession,
  parseCookies, cookieHeader, COOKIE_NAME, loginAllowed, loginFailed, loginSucceeded,
} from "./auth.mjs";
import { ensureVapid, vapidPublicKey, emailConfigured, sendWeeklySummary, buildWeeklySummary } from "./notify.mjs";
import { startScheduler } from "./scheduler.mjs";
import { addDays, zonedNow } from "./dates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT || 3000);

ensurePassword();
ensureVapid();

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));

// ---------- auth ----------
const api = express.Router();

api.get("/health", (_req, res) => res.json({ ok: true }));

api.post("/login", (req, res) => {
  const ip = req.ip;
  if (!loginAllowed(ip)) return res.status(429).json({ error: "Previše pokušaja. Pričekaj 5 minuta." });
  if (!checkPassword(req.body?.password)) {
    loginFailed(ip);
    return res.status(401).json({ error: "Pogrešna lozinka." });
  }
  loginSucceeded(ip);
  res.setHeader("Set-Cookie", cookieHeader(issueSession(), req));
  res.json({ ok: true });
});

api.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", cookieHeader("", req, true));
  res.json({ ok: true });
});

api.use((req, res, next) => {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!verifySession(token)) return res.status(401).json({ error: "Nisi prijavljena." });
  next();
});

api.get("/me", (_req, res) => {
  res.json({
    settings: getSettings(),
    vapidPublicKey: vapidPublicKey(),
    emailConfigured: emailConfigured(),
    pushDevices: pushSubs.count(),
    today: zonedNow().date,
  });
});

api.put("/password", (req, res) => {
  const { current, next } = req.body || {};
  if (!checkPassword(current)) return res.status(400).json({ error: "Trenutna lozinka nije točna." });
  if (typeof next !== "string" || next.length < 4) return res.status(400).json({ error: "Nova lozinka mora imati bar 4 znaka." });
  setPassword(next);
  res.json({ ok: true });
});

// ---------- postavke ----------
api.get("/settings", (_req, res) => res.json(getSettings()));
api.put("/settings", (req, res) => {
  const allowed = ["notify_email", "weekly_email", "weekly_push", "summary_hour", "reminder_push", "reminder_minutes", "default_duration"];
  const patch = {};
  for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
  if ("summary_hour" in patch) patch.summary_hour = Math.min(23, Math.max(0, Number(patch.summary_hour) || 19));
  res.json(saveSettings(patch));
});

// ---------- učenici ----------
api.get("/students", (_req, res) => {
  const counts = Object.fromEntries(students.counts().map((c) => [c.student_id, c]));
  res.json(students.all().map((s) => ({ ...s, total: counts[s.id]?.total || 0, upcoming: counts[s.id]?.upcoming || 0 })));
});
api.post("/students", (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim()) return res.status(400).json({ error: "Ime je obavezno." });
  const existing = students.findByName(b.name);
  if (existing) return res.status(409).json({ error: "Učenik s tim imenom već postoji.", student: existing });
  res.json(students.create(b));
});
api.put("/students/:id", (req, res) => {
  const s = students.update(req.params.id, req.body || {});
  if (!s) return res.status(404).json({ error: "Nema učenika." });
  res.json(s);
});
api.delete("/students/:id", (req, res) => {
  students.remove(req.params.id);
  res.json({ ok: true });
});

// ---------- termini ----------
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const isTime = (s) => /^\d{2}:\d{2}$/.test(s || "");

function resolveStudent(b) {
  if (b.student_id) {
    const s = students.get(b.student_id);
    if (s) return s;
  }
  const name = (b.student_name || "").trim();
  if (!name) return null;
  return students.findByName(name) || students.create({ name, subject: b.subject || null, price: b.price ?? null, color: b.color || pickColor() });
}
const COLORS = ["indigo", "sky", "emerald", "amber", "rose", "violet", "teal", "orange"];
function pickColor() {
  const used = students.all().map((s) => s.color);
  return COLORS.find((c) => !used.includes(c)) || COLORS[used.length % COLORS.length];
}

api.get("/lessons", (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: "from/to obavezni (YYYY-MM-DD)." });
  res.json(lessons.range(from, to));
});

api.post("/lessons", (req, res) => {
  const b = req.body || {};
  if (!isDate(b.date) || !isTime(b.start_time) || !isTime(b.end_time)) return res.status(400).json({ error: "Datum i vrijeme nisu ispravni." });
  if (b.end_time <= b.start_time) return res.status(400).json({ error: "Kraj mora biti nakon početka." });
  const student = resolveStudent(b);
  if (!student) return res.status(400).json({ error: "Upiši ime učenika." });
  const weeks = Math.min(60, Math.max(1, Number(b.repeat_weeks) || 1));
  const series_id = weeks > 1 ? uuid() : null;
  const rows = [];
  for (let i = 0; i < weeks; i++) {
    rows.push({
      id: uuid(), student_id: student.id, student_name: student.name,
      date: addDays(b.date, i * 7), start_time: b.start_time, end_time: b.end_time,
      subject: b.subject || student.subject || null, note: b.note || null,
      price: b.price ?? student.price ?? null, status: "scheduled", series_id,
    });
  }
  res.json(lessons.insertMany(rows));
});

api.put("/lessons/:id", (req, res) => {
  const cur = lessons.get(req.params.id);
  if (!cur) return res.status(404).json({ error: "Termin ne postoji." });
  const b = req.body || {};
  const patch = {};
  for (const k of ["date", "start_time", "end_time", "subject", "note", "price", "status"]) if (k in b) patch[k] = b[k];
  if (("student_name" in b || "student_id" in b)) {
    const st = resolveStudent(b);
    if (st) { patch.student_id = st.id; patch.student_name = st.name; }
  }
  if (patch.date && !isDate(patch.date)) return res.status(400).json({ error: "Datum nije ispravan." });
  const st = patch.start_time ?? cur.start_time, et = patch.end_time ?? cur.end_time;
  if (!isTime(st) || !isTime(et) || et <= st) return res.status(400).json({ error: "Vrijeme nije ispravno." });

  const updated = lessons.update(cur.id, patch);
  if (b.scope === "future" && cur.series_id) {
    // na buduće termine primijeni sve osim datuma i statusa
    const { date: _d, status: _s, ...rest } = patch;
    for (const l of lessons.futureInSeries(cur.series_id, cur.date)) {
      if (l.id !== cur.id) lessons.update(l.id, rest);
    }
  }
  res.json(updated);
});

api.post("/lessons/status", (req, res) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || !["scheduled", "done", "cancelled"].includes(status)) return res.status(400).json({ error: "Neispravan zahtjev." });
  let n = 0;
  for (const id of ids.slice(0, 200)) if (lessons.update(String(id), { status })) n++;
  res.json({ ok: true, updated: n });
});

api.delete("/lessons/:id", (req, res) => {
  const cur = lessons.get(req.params.id);
  if (!cur) return res.json({ ok: true });
  if (req.query.scope === "future" && cur.series_id) lessons.removeFutureInSeries(cur.series_id, cur.date);
  else lessons.remove(cur.id);
  res.json({ ok: true });
});

// ---------- obračun ----------
api.get("/report", (req, res) => {
  const m = String(req.query.month || "");
  if (!/^\d{4}-\d{2}$/.test(m)) return res.status(400).json({ error: "month obavezan (YYYY-MM)." });
  res.json(report.month(m));
});
api.post("/report/invoiced", (req, res) => {
  const { key, month, invoiced } = req.body || {};
  if (!key || !/^\d{4}-\d{2}$/.test(month || "")) return res.status(400).json({ error: "Neispravan zahtjev." });
  report.setInvoiced(key, month, Boolean(invoiced));
  res.json({ ok: true });
});

// ---------- push ----------
api.post("/push/subscribe", (req, res) => {
  const sub = req.body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return res.status(400).json({ error: "Neispravna pretplata." });
  pushSubs.upsert(sub, req.headers["user-agent"]);
  res.json({ ok: true, devices: pushSubs.count() });
});
api.post("/push/unsubscribe", (req, res) => {
  if (req.body?.endpoint) pushSubs.remove(req.body.endpoint);
  res.json({ ok: true, devices: pushSubs.count() });
});

// ---------- obavijesti ----------
api.get("/summary/preview", (_req, res) => res.json(buildWeeklySummary(zonedNow().date)));
api.post("/summary/send", async (_req, res) => {
  try {
    res.json(await sendWeeklySummary({ force: true }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ error: "Nepoznata ruta." }));

// ---------- statika (PWA) ----------
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, {
    index: false,
    setHeaders(res, filePath) {
      if (/\/assets\//.test(filePath)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      else res.setHeader("Cache-Control", "no-cache");
    },
  }));
  app.get(/.*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Kalendar sluša na http://localhost:${PORT} (TZ ${process.env.TZ_NAME || "Europe/Zagreb"})`);
  startScheduler();
});
