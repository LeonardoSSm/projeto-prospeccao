import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { ApiError } from "../../api/client";
import { deleteAdminRecord, updateAdminRecord, type AdminModelSummary } from "../../api/admin";
import { ConfirmDialog } from "./ConfirmDialog";
import { fromEditableValue, inputTypeFor, isEditableField, toEditableValue } from "./adminFieldUtils";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]";
const labelClass = "block text-xs font-medium uppercase tracking-wider text-slate-500";

export function AdminRecordDrawer({
  model,
  record,
  onClose,
}: {
  model: AdminModelSummary;
  record: Record<string, unknown>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(model.fields.map((field) => [field.name, toEditableValue(field, record[field.name])])),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const patch: Record<string, unknown> = {};
      for (const field of model.fields.filter(isEditableField)) {
        const original = toEditableValue(field, record[field.name]);
        if (values[field.name] !== original) {
          patch[field.name] = fromEditableValue(field, values[field.name]);
        }
      }
      return updateAdminRecord(model.key, record.id as string, patch);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", model.key] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : "Falha ao salvar."),
  });

  const remove = useMutation({
    mutationFn: () => deleteAdminRecord(model.key, record.id as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", model.key] });
      onClose();
    },
    onError: (err) => {
      setConfirmingDelete(false);
      setError(err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : "Falha ao apagar.");
    },
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#05070d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">{model.label}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500">{record.id as string}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 transition-colors hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}
          <div className="space-y-4">
            {model.fields.map((field) => {
              const editable = isEditableField(field) && !model.readOnly;
              const type = inputTypeFor(field);
              return (
                <div key={field.name}>
                  <label className={labelClass}>
                    {field.name}
                    {field.isRequired && !field.isId && <span className="text-rose-400"> *</span>}
                  </label>
                  {type === "checkbox" ? (
                    <div className="mt-1.5">
                      <input
                        type="checkbox"
                        checked={values[field.name] === "true"}
                        disabled={!editable}
                        onChange={(e) => setValues((v) => ({ ...v, [field.name]: String(e.target.checked) }))}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-400 disabled:opacity-50"
                      />
                    </div>
                  ) : type === "textarea" ? (
                    <textarea
                      className={`${inputClass} font-mono text-xs`}
                      rows={field.type === "Json" ? 6 : 2}
                      value={values[field.name] ?? ""}
                      disabled={!editable}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type={type}
                      className={inputClass}
                      value={values[field.name] ?? ""}
                      disabled={!editable}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!model.readOnly && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-400/10"
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Apagar registro"
          description={`Isso remove permanentemente este registro de "${model.label}". Não pode ser desfeito.`}
          confirmLabel="Apagar"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
