type Tone = "emerald" | "cyan" | "violet" | "amber" | "rose" | "slate";

const TONE_BY_VALUE: Record<string, Tone> = {
  // faixas de score
  PRIORITY: "rose",
  INTERESTING: "amber",
  REVIEW: "cyan",
  LOW: "slate",
  // presença digital / status genéricos positivos
  HAS_WEBSITE: "emerald",
  COMPLETED: "emerald",
  SENT: "emerald",
  APPROVED: "emerald",
  WON: "emerald",
  ACTIVE: "emerald",
  // neutros / em andamento
  NO_WEBSITE: "slate",
  SOCIAL_ONLY: "violet",
  QUEUED: "slate",
  RUNNING: "cyan",
  PENDING_APPROVAL: "amber",
  NEW: "slate",
  // negativos
  FAILED: "rose",
  REJECTED: "rose",
  SITE_UNREACHABLE: "rose",
  LOST: "rose",
};

const TONE_CLASSES: Record<Tone, string> = {
  emerald: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  cyan: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/30",
  violet: "bg-violet-400/10 text-violet-300 ring-violet-400/30",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  rose: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
  slate: "bg-slate-400/10 text-slate-400 ring-slate-400/25",
};

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-600">—</span>;
  const tone = TONE_BY_VALUE[value] ?? "slate";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {value}
    </span>
  );
}
