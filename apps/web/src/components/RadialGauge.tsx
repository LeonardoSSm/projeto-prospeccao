const COLOR_CLASSES = {
  cyan: "text-cyan-400",
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  slate: "text-slate-500",
} as const;

export type GaugeColor = keyof typeof COLOR_CLASSES;

export function RadialGauge({
  value,
  max = 100,
  size = 76,
  strokeWidth = 6,
  color = "cyan",
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: GaugeColor;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - pct);
  const colorClass = COLOR_CLASSES[color];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.15)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={colorClass}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-mono font-bold ${colorClass}`}
          style={{ fontSize: size * 0.26 }}
        >
          {Math.round(value)}
        </div>
      </div>
      {label && <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>}
    </div>
  );
}
