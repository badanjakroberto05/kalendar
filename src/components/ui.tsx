import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { X, Check, AlertCircle, Loader2 } from "lucide-react";

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

/* ---------- Button ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
export function Button({ variant = "primary", size = "md", loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none";
  const sizes = { sm: "h-10 px-3.5 text-sm", md: "h-12 px-5 text-[15px]", lg: "h-14 px-6 text-base" }[size];
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white shadow-[0_6px_16px_rgba(91,95,239,.28)] hover:bg-brand-deep",
    secondary: "bg-white text-ink border border-line shadow-sm hover:bg-slate-50",
    ghost: "bg-transparent text-ink-soft hover:bg-slate-100",
    soft: "bg-brand-soft text-brand-deep hover:bg-indigo-100",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return (
    <button className={cx(base, sizes, variants[variant], className)} {...rest} disabled={rest.disabled || loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cx("inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-slate-100 active:scale-95 transition", className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
const inputCls = "w-full h-12 rounded-2xl border border-line bg-white px-4 text-[16px] text-ink placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputCls, className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, "h-auto min-h-[88px] py-3 resize-none", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", className)} {...rest}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cx("grid gap-1 rounded-2xl bg-slate-100 p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx("h-10 rounded-xl text-sm font-semibold transition", value === o.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cx("h-10 rounded-full px-4 text-sm font-semibold transition border", active ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line hover:border-slate-300", className)}>
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx("relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40", checked ? "bg-emerald-500" : "bg-slate-300")}>
      <span className={cx("absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[22px] bg-white shadow-(--shadow-card)", className)}>{children}</div>;
}

export function SettingRow({ title, desc, right }: { title: string; desc?: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink">{title}</div>
        {desc ? <div className="mt-0.5 text-sm text-muted">{desc}</div> : null}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

/* ---------- Sheet (bottom sheet on mobile, dialog on desktop) ---------- */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={cx("anim-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-(--shadow-pop) sm:rounded-[28px]", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2 sm:px-7 sm:pt-6">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <IconButton label="Zatvori" onClick={onClose} className="-mr-2"><X className="size-5" /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">{children}</div>
        {footer ? <div className="border-t border-line bg-white px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7 sm:pb-5">{footer}</div> : <div className="pb-safe" />}
      </div>
    </div>
  );
}

/* ---------- Confirm ---------- */
export function Confirm({ open, title, text, confirmLabel = "Potvrdi", danger, onConfirm, onClose, options }: {
  open: boolean; title: string; text?: string; confirmLabel?: string; danger?: boolean; onConfirm: (choice?: string) => void; onClose: () => void;
  options?: { value: string; label: string; desc?: string }[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {text ? <p className="text-[15px] text-ink-soft">{text}</p> : null}
      {options ? (
        <div className="mt-2 grid gap-2">
          {options.map((o) => (
            <button key={o.value} onClick={() => onConfirm(o.value)} className="rounded-2xl border border-line bg-white px-4 py-3.5 text-left transition hover:border-slate-300 active:scale-[.99]">
              <div className="font-semibold">{o.label}</div>
              {o.desc ? <div className="text-sm text-muted">{o.desc}</div> : null}
            </button>
          ))}
          <Button variant="ghost" onClick={onClose} className="mt-1">Odustani</Button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>Odustani</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => onConfirm()}>{confirmLabel}</Button>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; kind: "ok" | "err" };
const ToastCtx = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 4500 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 pt-safe">
        {toasts.map((t) => (
          <div key={t.id} className={cx("anim-pop pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-(--shadow-pop)", t.kind === "ok" ? "bg-ink text-white" : "bg-rose-600 text-white")}>
            {t.kind === "ok" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>
      <div className="text-lg font-bold">{title}</div>
      {text ? <div className="mt-1 max-w-xs text-sm text-muted">{text}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
