import type { LucideIcon } from "lucide-react";

const ACCENT_CLASSES = {
  cyan: "bg-cyan-400/10 text-cyan-300",
  violet: "bg-violet-400/10 text-violet-300",
  emerald: "bg-emerald-400/10 text-emerald-300",
  amber: "bg-amber-400/10 text-amber-300",
  rose: "bg-rose-400/10 text-rose-300",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: keyof typeof ACCENT_CLASSES;
}) {
  return (
    <div className="glass-panel flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT_CLASSES[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-2xl font-bold text-white">{value}</p>
        <p className="truncate text-xs uppercase tracking-wider text-slate-500">{label}</p>
      </div>
    </div>
  );
}
