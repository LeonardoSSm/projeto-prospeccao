import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCampaign,
  listCampaigns,
  startCampaignRun,
  type CreateCampaignInput,
} from "../api/campaigns";
import { ApiError } from "../api/client";
import { Badge } from "../components/Badge";

const emptyForm: CreateCampaignInput = {
  name: "",
  category: "",
  geography: { countryCode: "BR", city: "", radiusKm: 20 },
  filters: { maximumResults: 50 },
  providers: ["GOOGLE_PLACES"],
};

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCampaignInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });

  const createMutation = useMutation({
    mutationFn: () => createCampaign(form),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : "Falha ao criar campanha");
    },
  });

  const runMutation = useMutation({
    mutationFn: (campaignId: string) => startCampaignRun(campaignId),
    onMutate: (campaignId) => setRunningId(campaignId),
    onSettled: () => setRunningId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section>
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Campanhas</h1>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Cidade</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.data?.items.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{campaign.name}</td>
                  <td className="px-4 py-3 text-slate-600">{campaign.category}</td>
                  <td className="px-4 py-3 text-slate-600">{campaign.geography.city}</td>
                  <td className="px-4 py-3">
                    <Badge value={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                      disabled={runningId === campaign.id}
                      onClick={() => runMutation.mutate(campaign.id)}
                    >
                      {runningId === campaign.id ? "Iniciando..." : "Iniciar execução"}
                    </button>
                  </td>
                </tr>
              ))}
              {campaigns.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma campanha ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Depois de iniciar, acompanhe os leads descobertos em{" "}
          <Link to="/leads" className="underline">
            Leads
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nova campanha</h2>
        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div>
            <label className="block text-xs font-medium text-slate-600">Nome</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Categoria</label>
            <input
              required
              placeholder="DENTIST"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Cidade</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              value={form.geography.city}
              onChange={(e) => setForm({ ...form, geography: { ...form.geography, city: e.target.value } })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Raio (km)</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                value={form.geography.radiusKm}
                onChange={(e) =>
                  setForm({ ...form, geography: { ...form.geography, radiusKm: Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Máx. resultados</label>
              <input
                type="number"
                min={1}
                max={100}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                value={form.filters.maximumResults}
                onChange={(e) =>
                  setForm({ ...form, filters: { ...form.filters, maximumResults: Number(e.target.value) } })
                }
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Criando..." : "Criar campanha"}
          </button>
        </form>
      </section>
    </div>
  );
}
