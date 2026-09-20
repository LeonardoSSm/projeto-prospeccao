import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ListFilter, Star, Users2 } from "lucide-react";
import { listLeads } from "../api/leads";
import { Badge } from "../components/Badge";
import { Panel } from "../components/Panel";

const WEBSITE_STATUSES = ["NO_WEBSITE", "SOCIAL_ONLY", "HAS_WEBSITE", "SITE_UNREACHABLE", "UNKNOWN"];
const SCORE_BANDS = ["PRIORITY", "INTERESTING", "REVIEW", "LOW"];

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-shadow focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]";
const labelClass = "block text-xs font-medium uppercase tracking-wider text-slate-500";

function scoreBarColor(band: string | null) {
  switch (band) {
    case "PRIORITY":
      return "bg-rose-400";
    case "INTERESTING":
      return "bg-amber-400";
    case "REVIEW":
      return "bg-cyan-400";
    default:
      return "bg-slate-500";
  }
}

export function LeadsPage() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [websiteStatus, setWebsiteStatus] = useState<string[]>([]);
  const [scoreBand, setScoreBand] = useState<string[]>([]);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursorStack[cursorStack.length - 1];

  const leads = useQuery({
    queryKey: ["leads", city, category, websiteStatus, scoreBand, cursor],
    queryFn: () => listLeads({ city: city || undefined, category: category || undefined, websiteStatus, scoreBand, cursor, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setCursorStack([undefined]);
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Leads</h1>
        <p className="mt-1 text-sm text-slate-500">Explore, filtre e priorize empresas descobertas pelas campanhas.</p>
      </div>

      <Panel title="Filtros" icon={ListFilter} className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelClass}>Cidade</label>
            <input
              className={inputClass}
              value={city}
              onChange={(e) => {
                setCursorStack([undefined]);
                setCity(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Categoria</label>
            <input
              className={`${inputClass} font-mono`}
              value={category}
              onChange={(e) => {
                setCursorStack([undefined]);
                setCategory(e.target.value);
              }}
            />
          </div>
          <div>
            <span className={labelClass}>Site</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WEBSITE_STATUSES.map((status) => {
                const active = websiteStatus.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggle(websiteStatus, status, setWebsiteStatus)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${
                      active
                        ? "bg-cyan-400/10 text-cyan-300 ring-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                        : "text-slate-500 ring-white/10 hover:text-slate-300"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className={labelClass}>Faixa de score</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SCORE_BANDS.map((band) => {
                const active = scoreBand.includes(band);
                return (
                  <button
                    key={band}
                    onClick={() => toggle(scoreBand, band, setScoreBand)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${
                      active
                        ? "bg-violet-400/10 text-violet-300 ring-violet-400/40 shadow-[0_0_12px_rgba(167,139,250,0.15)]"
                        : "text-slate-500 ring-white/10 hover:text-slate-300"
                    }`}
                  >
                    {band}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Resultados" icon={Users2}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="pb-3 pr-4">Nome</th>
                <th className="pb-3 pr-4">Categoria / Cidade</th>
                <th className="pb-3 pr-4">Avaliação</th>
                <th className="pb-3 pr-4">Site</th>
                <th className="pb-3 pr-4">Score</th>
                <th className="pb-3">Estágio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.data?.items.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="py-3.5 pr-4">
                    <Link to={`/leads/${lead.id}`} className="font-medium text-slate-100 hover:text-cyan-300">
                      {lead.tradeName}
                    </Link>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-400">
                    <span className="font-mono text-xs">{lead.category}</span> · {lead.city}
                  </td>
                  <td className="py-3.5 pr-4 text-slate-400">
                    {lead.rating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {lead.rating} <span className="text-slate-600">({lead.reviewCount})</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge value={lead.websiteStatus} />
                  </td>
                  <td className="py-3.5 pr-4">
                    {lead.currentScore != null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-7 font-mono text-sm font-semibold text-slate-200">{lead.currentScore}</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full ${scoreBarColor(lead.scoreBand)}`}
                            style={{ width: `${lead.currentScore}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600">sem score</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <Badge value={lead.crmStage} />
                  </td>
                </tr>
              ))}
              {leads.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-600">
                    Nenhum lead encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            disabled={cursorStack.length <= 1}
            onClick={() => setCursorStack((stack) => stack.slice(0, -1))}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button
            disabled={!leads.data?.page.hasMore}
            onClick={() =>
              leads.data?.page.nextCursor && setCursorStack((stack) => [...stack, leads.data!.page.nextCursor!])
            }
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Panel>
    </div>
  );
}
