import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { createNiche, deleteNiche, listNiches, updateNiche, type Niche } from "../api/niches";
import { ApiError } from "../api/client";
import { Badge } from "../components/Badge";
import { Panel } from "../components/Panel";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-shadow focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]";
const labelClass = "block text-xs font-medium uppercase tracking-wider text-slate-500";

const emptyForm = { name: "", category: "", description: "" };

export function NichesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const niches = useQuery({ queryKey: ["niches"], queryFn: () => listNiches(false) });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["niches"] });

  const createMutation = useMutation({
    mutationFn: () => createNiche({ ...form, category: form.category.toUpperCase() }),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : "Falha ao criar nicho"),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; input: Parameters<typeof updateNiche>[1] }) => updateNiche(vars.id, vars.input),
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : "Falha ao atualizar nicho"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNiche(id),
    onSuccess: invalidate,
  });

  function startEdit(niche: Niche) {
    setEditingId(niche.id);
    setForm({ name: niche.name, category: niche.category, description: niche.description ?? "" });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        input: { ...form, category: form.category.toUpperCase() },
      });
    } else {
      createMutation.mutate();
    }
  }

  const items = niches.data ?? [];
  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Nichos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cadastre os segmentos de negócio que a prospecção deve buscar — use-os ao criar uma campanha.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Nichos cadastrados" icon={Layers}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">Categoria</th>
                  <th className="pb-3 pr-4">Descrição</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((niche) => (
                  <tr key={niche.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="py-3.5 pr-4 font-medium text-slate-100">{niche.name}</td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-cyan-300">{niche.category}</td>
                    <td className="py-3.5 pr-4 max-w-xs truncate text-slate-500">{niche.description ?? "—"}</td>
                    <td className="py-3.5 pr-4">
                      <Badge value={niche.active ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td className="py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          title="Editar"
                          onClick={() => startEdit(niche)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-cyan-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title={niche.active ? "Desativar" : "Ativar"}
                          onClick={() => updateMutation.mutate({ id: niche.id, input: { active: !niche.active } })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-amber-300"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Excluir"
                          onClick={() => {
                            if (window.confirm(`Excluir o nicho "${niche.name}"?`)) deleteMutation.mutate(niche.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-600">
                      Nenhum nicho cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={editingId ? "Editar nicho" : "Novo nicho"} icon={editingId ? Pencil : Plus}>
          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className={labelClass}>Nome</label>
              <input
                required
                className={inputClass}
                placeholder="Dentistas"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Categoria de busca</label>
              <input
                required
                className={`${inputClass} font-mono`}
                placeholder="DENTIST"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-slate-600">
                Usada como categoria de busca nas campanhas (maiúsculas, sem espaço).
              </p>
            </div>
            <div>
              <label className={labelClass}>Descrição (opcional)</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Salvando..." : editingId ? "Salvar alterações" : "Criar nicho"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-white/10 px-3 py-2.5 text-slate-400 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
