const COLORS: Record<string, string> = {
  // faixas de score
  PRIORITY: "bg-red-100 text-red-700",
  INTERESTING: "bg-amber-100 text-amber-700",
  REVIEW: "bg-blue-100 text-blue-700",
  LOW: "bg-slate-100 text-slate-600",
  // presença digital / status genéricos positivos
  HAS_WEBSITE: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  SENT: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  WON: "bg-emerald-100 text-emerald-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  // neutros / em andamento
  NO_WEBSITE: "bg-slate-100 text-slate-600",
  SOCIAL_ONLY: "bg-sky-100 text-sky-700",
  QUEUED: "bg-slate-100 text-slate-600",
  RUNNING: "bg-blue-100 text-blue-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  NEW: "bg-slate-100 text-slate-600",
  // negativos
  FAILED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  SITE_UNREACHABLE: "bg-red-100 text-red-700",
  LOST: "bg-red-100 text-red-700",
};

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const className = COLORS[value] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {value}
    </span>
  );
}
