import webpush from "web-push";
import nodemailer from "nodemailer";
import { kvGet, kvSet, getSettings, lessons, pushSubs } from "./db.mjs";
import { zonedNow, nextMonday, addDays, fmtDayLong, fmtRange, hhmm } from "./dates.mjs";

const APP_URL = (process.env.APP_URL || "https://kalendar.badxmedia.com").replace(/\/$/, "");

// ---- VAPID ključevi: generiraju se jednom i čuvaju u bazi ----
export function ensureVapid() {
  let pub = kvGet("vapid_public");
  let priv = kvGet("vapid_private");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    pub = k.publicKey; priv = k.privateKey;
    kvSet("vapid_public", pub); kvSet("vapid_private", priv);
    console.log("[push] Generirani novi VAPID ključevi.");
  }
  webpush.setVapidDetails(`mailto:${process.env.VAPID_CONTACT || "kalendar@badxmedia.com"}`, pub, priv);
  return pub;
}
export const vapidPublicKey = () => kvGet("vapid_public");

// ---- email (opcionalno, preko SMTP-a npr. Gmail) ----
export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
function transporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ---- slanje push poruka svim uređajima ----
export async function sendPushToAll(payload) {
  const subs = pushSubs.all();
  let ok = 0, failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
        ok++;
      } catch (e) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410) pushSubs.remove(s.endpoint);
        else console.warn("[push] greška", e.statusCode, e.body || e.message);
      }
    })
  );
  return { ok, failed, total: subs.length };
}

// ---- tjedni pregled ----
export function buildWeeklySummary(baseDate) {
  const from = nextMonday(baseDate);
  const to = addDays(from, 6);
  const rows = lessons.range(from, to).filter((l) => l.status !== "cancelled");
  const byDay = new Map();
  for (const l of rows) {
    if (!byDay.has(l.date)) byDay.set(l.date, []);
    byDay.get(l.date).push(l);
  }
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    days.push({ date: d, label: fmtDayLong(d), lessons: byDay.get(d) || [] });
  }
  const total = rows.length;
  const earnings = rows.reduce((s, l) => s + (Number(l.price) || 0), 0);
  return { from, to, rangeLabel: fmtRange(from, to), days, total, earnings, first: rows[0] || null };
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function summaryHtml(sum) {
  const dayBlocks = sum.days
    .map((d) => {
      const items = d.lessons.length
        ? d.lessons
            .map(
              (l) => `<tr>
  <td style="padding:10px 14px;white-space:nowrap;font-weight:600;color:#0b0e1a;font-variant-numeric:tabular-nums">${hhmm(l.start_time)}–${hhmm(l.end_time)}</td>
  <td style="padding:10px 14px;color:#0b0e1a">${esc(l.student_name)}${l.subject ? `<span style="color:#6b7280"> · ${esc(l.subject)}</span>` : ""}${l.note ? `<div style="color:#6b7280;font-size:13px;margin-top:2px">${esc(l.note)}</div>` : ""}</td>
</tr>`
            )
            .join("")
        : `<tr><td colspan="2" style="padding:10px 14px;color:#9ca3af">Nema termina</td></tr>`;
      const isEmpty = d.lessons.length === 0;
      return `<div style="margin:0 0 14px 0;border:1px solid #eceef3;border-radius:16px;overflow:hidden;${isEmpty ? "opacity:.6" : ""}">
  <div style="padding:10px 14px;background:#f6f7fb;font-weight:700;color:#0b0e1a;font-size:14px">${esc(d.label)}${d.lessons.length ? ` <span style="color:#5b5fef;font-weight:600">· ${d.lessons.length}</span>` : ""}</div>
  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:15px">${items}</table>
</div>`;
    })
    .join("");

  return `<!doctype html><html lang="hr"><body style="margin:0;background:#f3f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="background:#fff;border-radius:24px;padding:28px 24px;box-shadow:0 8px 24px rgba(0,0,0,.06)">
    <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5b5fef;font-weight:700">Tjedni pregled</div>
    <h1 style="margin:6px 0 4px;font-size:24px;color:#0b0e1a">${esc(sum.rangeLabel)}</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px">${sum.total === 0 ? "Sljedeći tjedan nemaš zakazanih termina." : `Sljedeći tjedan imaš <strong style="color:#0b0e1a">${sum.total} ${plural(sum.total)}</strong>${sum.earnings ? ` · ukupno ${fmtMoney(sum.earnings)}` : ""}.`}</p>
    ${dayBlocks}
    <a href="${APP_URL}" style="display:block;text-align:center;margin-top:20px;background:#5b5fef;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:14px;font-size:15px">Otvori kalendar</a>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Kalendar instrukcija · šalje se automatski nedjeljom navečer</p>
</div></body></html>`;
}
export function summaryText(sum) {
  const lines = [`Tjedni pregled: ${sum.rangeLabel}`, ""];
  for (const d of sum.days) {
    lines.push(d.label);
    if (!d.lessons.length) lines.push("  – nema termina");
    for (const l of d.lessons) lines.push(`  ${hhmm(l.start_time)}–${hhmm(l.end_time)}  ${l.student_name}${l.subject ? " · " + l.subject : ""}`);
    lines.push("");
  }
  lines.push(`Ukupno: ${sum.total} ${plural(sum.total)}`);
  lines.push(APP_URL);
  return lines.join("\n");
}
export function plural(n) {
  if (n === 1) return "termin";
  if (n >= 2 && n <= 4) return "termina";
  return "termina";
}
export const fmtMoney = (n) => `${Number(n).toLocaleString("hr-HR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

export async function sendWeeklySummary({ force = false } = {}) {
  const settings = getSettings();
  const { date } = zonedNow();
  const sum = buildWeeklySummary(date);
  const result = { email: null, push: null, summary: { total: sum.total, range: sum.rangeLabel } };

  if ((settings.weekly_push || force) && pushSubs.count() > 0) {
    const body = sum.total === 0
      ? "Sljedeći tjedan nemaš zakazanih termina."
      : `${sum.total} ${plural(sum.total)} sljedeći tjedan.${sum.first ? ` Prvi: ${fmtDayShortLocal(sum.first.date)} u ${hhmm(sum.first.start_time)} – ${sum.first.student_name}.` : ""}`;
    result.push = await sendPushToAll({ title: `Tjedni pregled · ${sum.rangeLabel}`, body, url: "/?week=" + sum.from, tag: "weekly-" + sum.from });
  }

  if ((settings.weekly_email || force) && settings.notify_email) {
    if (!emailConfigured()) {
      result.email = { ok: false, error: "SMTP nije podešen" };
    } else {
      try {
        await transporter().sendMail({
          from: process.env.SMTP_FROM || `"Kalendar instrukcija" <${process.env.SMTP_USER}>`,
          to: settings.notify_email,
          subject: `Tjedni pregled · ${sum.rangeLabel} · ${sum.total} ${plural(sum.total)}`,
          text: summaryText(sum),
          html: summaryHtml(sum),
        });
        result.email = { ok: true, to: settings.notify_email };
      } catch (e) {
        console.warn("[email] greška", e.message);
        result.email = { ok: false, error: e.message };
      }
    }
  }
  return result;
}

function fmtDayShortLocal(iso) {
  const [, m, d] = iso.split("-").map(Number);
  const names = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
  return `${names[new Date(iso + "T00:00:00Z").getUTCDay()]} ${d}.${m}.`;
}

// ---- podsjetnik prije termina (push) ----
export async function sendLessonReminders() {
  const s = getSettings();
  if (!s.reminder_push || pushSubs.count() === 0) return;
  const { date, hour, minute } = zonedNow();
  const nowMin = hour * 60 + minute;
  const lead = Number(s.reminder_minutes) || 60;
  const todays = lessons.range(date, date).filter((l) => l.status === "scheduled");
  for (const l of todays) {
    const [h, m] = l.start_time.split(":").map(Number);
    const startMin = h * 60 + m;
    const diff = startMin - nowMin;
    if (diff <= lead && diff > lead - 2) {
      const key = "reminded:" + l.id;
      if (kvGet(key)) continue;
      kvSet(key, "1");
      await sendPushToAll({
        title: `Za ${diff} min: ${l.student_name}`,
        body: `${hhmm(l.start_time)}–${hhmm(l.end_time)}${l.subject ? " · " + l.subject : ""}${l.note ? " · " + l.note : ""}`,
        url: "/?date=" + l.date,
        tag: "reminder-" + l.id,
      });
    }
  }
}
