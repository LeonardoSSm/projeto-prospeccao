import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm p-6">
        <div className="mb-3 flex items-center gap-2.5 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{title}</h3>
        </div>
        <p className="text-sm text-slate-400">{description}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-rose-500/90 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(244,63,94,0.3)] transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {busy ? "Apagando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
