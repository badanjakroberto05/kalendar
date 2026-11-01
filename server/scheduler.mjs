import { kvGet, kvSet, getSettings } from "./db.mjs";
import { zonedNow } from "./dates.mjs";
import { sendWeeklySummary, sendLessonReminders } from "./notify.mjs";

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    const { date, hour, minute, weekday } = zonedNow();
    const s = getSettings();
    // nedjelja navečer: tjedni pregled za tjedan koji dolazi
    if (weekday === 0 && hour === Number(s.summary_hour) && minute < 5 && kvGet("weekly_sent") !== date) {
      kvSet("weekly_sent", date);
      const r = await sendWeeklySummary();
      console.log("[scheduler] tjedni pregled poslan", JSON.stringify(r));
    }
    await sendLessonReminders();
  } catch (e) {
    console.error("[scheduler]", e);
  } finally {
    busy = false;
  }
}
export function startScheduler() {
  setTimeout(tick, 3000);
  setInterval(tick, 30_000);
}
