export const STUDENT_COLORS: Record<string, { bg: string; fg: string; bar: string; dot: string; soft: string }> = {
  indigo:  { bg: "bg-indigo-50",  fg: "text-indigo-700",  bar: "bg-indigo-500",  dot: "bg-indigo-500",  soft: "bg-indigo-100" },
  sky:     { bg: "bg-sky-50",     fg: "text-sky-700",     bar: "bg-sky-500",     dot: "bg-sky-500",     soft: "bg-sky-100" },
  emerald: { bg: "bg-emerald-50", fg: "text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500", soft: "bg-emerald-100" },
  amber:   { bg: "bg-amber-50",   fg: "text-amber-700",   bar: "bg-amber-500",   dot: "bg-amber-500",   soft: "bg-amber-100" },
  rose:    { bg: "bg-rose-50",    fg: "text-rose-700",    bar: "bg-rose-500",    dot: "bg-rose-500",    soft: "bg-rose-100" },
  violet:  { bg: "bg-violet-50",  fg: "text-violet-700",  bar: "bg-violet-500",  dot: "bg-violet-500",  soft: "bg-violet-100" },
  teal:    { bg: "bg-teal-50",    fg: "text-teal-700",    bar: "bg-teal-500",    dot: "bg-teal-500",    soft: "bg-teal-100" },
  orange:  { bg: "bg-orange-50",  fg: "text-orange-700",  bar: "bg-orange-500",  dot: "bg-orange-500",  soft: "bg-orange-100" },
};
export const COLOR_KEYS = Object.keys(STUDENT_COLORS);
export const colorOf = (key: string | null | undefined) => STUDENT_COLORS[key || "indigo"] || STUDENT_COLORS.indigo;
