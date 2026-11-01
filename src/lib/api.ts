export type LessonStatus = "scheduled" | "done" | "cancelled";
export interface Lesson {
  id: string;
  student_id: string | null;
  student_name: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;
  subject: string | null;
  note: string | null;
  price: number | null;
  status: LessonStatus;
  series_id: string | null;
}
export interface Student {
  id: string;
  name: string;
  subject: string | null;
  phone: string | null;
  price: number | null;
  color: string;
  note: string | null;
  total?: number;
  upcoming?: number;
}
export interface Settings {
  notify_email: string;
  weekly_email: boolean;
  weekly_push: boolean;
  summary_hour: number;
  reminder_push: boolean;
  reminder_minutes: number;
  default_duration: number;
}
export interface Me {
  settings: Settings;
  vapidPublicKey: string | null;
  emailConfigured: boolean;
  pushDevices: number;
  today: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event("kal:unauthorized"));
    throw new ApiError(res.status, data?.error || `Greška ${res.status}`);
  }
  return data as T;
}

export const api = {
  login: (password: string) => req<{ ok: true }>("POST", "/api/login", { password }),
  logout: () => req<{ ok: true }>("POST", "/api/logout"),
  me: () => req<Me>("GET", "/api/me"),
  changePassword: (current: string, next: string) => req<{ ok: true }>("PUT", "/api/password", { current, next }),
  settings: {
    save: (patch: Partial<Settings>) => req<Settings>("PUT", "/api/settings", patch),
  },
  lessons: {
    range: (from: string, to: string) => req<Lesson[]>("GET", `/api/lessons?from=${from}&to=${to}`),
    create: (input: Partial<Lesson> & { repeat_weeks?: number }) => req<Lesson[]>("POST", "/api/lessons", input),
    update: (id: string, patch: Partial<Lesson> & { scope?: "one" | "future" }) => req<Lesson>("PUT", `/api/lessons/${id}`, patch),
    remove: (id: string, scope: "one" | "future" = "one") => req<{ ok: true }>("DELETE", `/api/lessons/${id}?scope=${scope}`),
  },
  students: {
    all: () => req<Student[]>("GET", "/api/students"),
    create: (s: Partial<Student>) => req<Student>("POST", "/api/students", s),
    update: (id: string, s: Partial<Student>) => req<Student>("PUT", `/api/students/${id}`, s),
    remove: (id: string) => req<{ ok: true }>("DELETE", `/api/students/${id}`),
  },
  push: {
    subscribe: (subscription: PushSubscriptionJSON) => req<{ ok: true; devices: number }>("POST", "/api/push/subscribe", { subscription }),
    unsubscribe: (endpoint: string) => req<{ ok: true; devices: number }>("POST", "/api/push/unsubscribe", { endpoint }),
  },
  summary: {
    send: () => req<{ email: { ok: boolean; error?: string; to?: string } | null; push: { ok: number; failed: number; total: number } | null; summary: { total: number; range: string } }>("POST", "/api/summary/send"),
  },
};
