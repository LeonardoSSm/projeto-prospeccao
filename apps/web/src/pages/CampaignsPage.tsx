import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Plus, Rocket, Satellite } from "lucide-react";
import {
  createCampaign,
  listCampaigns,
  startCampaignRun,
  type CreateCampaignInput,
} from "../api/campaigns";
import { ApiError } from "../api/client";
import { listNiches } from "../api/niches";
import { Badge } from "../components/Badge";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";

const emptyForm: CreateCampaignInput = {
  name: "",
  category: "",
  geography: { countryCode: "BR", city: "", radiusKm: 20 },
  filters: { maximumResults: 50 },
  providers: ["GOOGLE_PLACES"],
};

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-shadow focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]";
const labelClass = "block text-xs font-medium uppercase tracking-wider text-slate-500";

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCampaignInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });
  const niches = useQuery({ queryKey: ["niches", "active"], queryFn: () => listNiches(true) });
  const items = campaigns.data?.items ?? [];
  const cities = new Set(items.map((c) => c.geography.city)).size;
  const categories = new Set(items.map((c) => c.category)).size;

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
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Campanhas</h1>
        <p className="mt-1 text-sm text-slate-500">Orquestre a descoberta automática de leads por região e categoria.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Campanhas" value={items.length} icon={Rocket} accent="cyan" />
        <StatCard label="Cidades cobertas" value={cities} icon={MapPin} accent="violet" />
        <StatCard label="Categorias" value={categories} icon={Building2} accent="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Todas as campanhas" icon={Satellite}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">Categoria</th>
                  <th className="pb-3 pr-4">Cidade</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((campaign) => (
                  <tr key={campaign.id} className="group transition-colors hover:bg-white/[0.03]">
                    <td className="py-3.5 pr-4 font-medium text-slate-100">{campaign.name}</td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-slate-400">{campaign.category}</td>
                    <td className="py-3.5 pr-4 text-slate-400">{campaign.geography.city}</td>
                    <td className="py-3.5 pr-4">
                      <Badge value={campaign.status} />
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        className="rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                        disabled={runningId === campaign.id}
                        onClick={() => runMutation.mutate(campaign.id)}
                      >
                        {runningId === campaign.id ? "Iniciando..." : "Iniciar execução"}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-600">
                      Nenhuma campanha ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Depois de iniciar, acompanhe os leads descobertos em{" "}
            <Link to="/leads" className="text-cyan-400 underline-offset-2 hover:underline">
              Leads
            </Link>
            .
          </p>
        </Panel>

        <Panel title="Nova campanha" icon={Plus}>
          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <label className={labelClass}>Nome</label>
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Nicho</label>
              {niches.data && niches.data.length > 0 ? (
                <select
                  required
                  className={`${inputClass} font-mono`}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="" disabled className="bg-slate-900">
                    Selecione um nicho...
                  </option>
                  {niches.data.map((niche) => (
                    <option key={niche.id} value={niche.category} className="bg-slate-900">
                      {niche.name} ({niche.category})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Nenhum nicho ativo ainda.{" "}
                  <Link to="/niches" className="text-cyan-400 underline-offset-2 hover:underline">
                    Cadastre um nicho
                  </Link>{" "}
                  para escolher a categoria de busca.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <input
                required
                className={inputClass}
                value={form.geography.city}
                onChange={(e) => setForm({ ...form, geography: { ...form.geography, city: e.target.value } })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Raio (km)</label>
                <input
                  type="number"
                  min={1}
                  className={`${inputClass} font-mono`}
                  value={form.geography.radiusKm}
                  onChange={(e) =>
                    setForm({ ...form, geography: { ...form.geography, radiusKm: Number(e.target.value) } })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Máx. resultados</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={`${inputClass} font-mono`}
                  value={form.filters.maximumResults}
                  onChange={(e) =>
                    setForm({ ...form, filters: { ...form.filters, maximumResults: Number(e.target.value) } })
                  }
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Criando..." : "Criar campanha"}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
