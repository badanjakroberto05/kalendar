import crypto from "node:crypto";
import { kvGet, kvSet } from "./db.mjs";

const SESSION_DAYS = 180;
const COOKIE = "kal_session";

function secret() {
  let s = process.env.SESSION_SECRET || kvGet("session_secret");
  if (!s) {
    s = crypto.randomBytes(32).toString("hex");
    kvSet("session_secret", s);
  }
  return s;
}

// --- lozinka: scrypt hash u bazi, inicijalno iz APP_PASSWORD ---
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyHash(pw, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(pw, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && crypto.timingSafeEqual(test, ref);
}
export function ensurePassword() {
  if (kvGet("password_hash")) return;
  const initial = process.env.APP_PASSWORD;
  if (!initial) {
    console.warn("[auth] APP_PASSWORD nije postavljen i nema spremljene lozinke. Prijava neće raditi dok ga ne postaviš.");
    return;
  }
  kvSet("password_hash", hashPassword(initial));
  console.log("[auth] Početna lozinka spremljena iz APP_PASSWORD.");
}
export function checkPassword(pw) {
  const stored = kvGet("password_hash");
  if (!stored || typeof pw !== "string") return false;
  return verifyHash(pw, stored);
}
export function setPassword(pw) {
  kvSet("password_hash", hashPassword(pw));
}

// --- session cookie (HMAC potpisan token) ---
function sign(payload) {
  const mac = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}
export function issueSession() {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  return sign(`${exp}.${crypto.randomBytes(8).toString("hex")}`);
}
export function verifySession(token) {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const expected = sign(payload);
  if (expected.length !== token.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))) return false;
  const exp = Number(payload.split(".")[0]);
  return Number.isFinite(exp) && exp > Date.now();
}

export function parseCookies(header = "") {
  const out = {};
  header.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
export function cookieHeader(token, req, clear = false) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  const maxAge = clear ? 0 : SESSION_DAYS * 86400;
  return `${COOKIE}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
export const COOKIE_NAME = COOKIE;

// --- jednostavna zaštita od pogađanja lozinke ---
const attempts = new Map();
export function loginAllowed(ip) {
  const a = attempts.get(ip);
  if (!a) return true;
  if (a.count >= 6 && Date.now() - a.last < 5 * 60_000) return false;
  if (Date.now() - a.last > 5 * 60_000) attempts.delete(ip);
  return true;
}
export function loginFailed(ip) {
  const a = attempts.get(ip) || { count: 0, last: 0 };
  attempts.set(ip, { count: a.count + 1, last: Date.now() });
}
export function loginSucceeded(ip) { attempts.delete(ip); }
