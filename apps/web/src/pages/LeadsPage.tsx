import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listLeads } from "../api/leads";
import { Badge } from "../components/Badge";

const WEBSITE_STATUSES = ["NO_WEBSITE", "SOCIAL_ONLY", "HAS_WEBSITE", "SITE_UNREACHABLE", "UNKNOWN"];
const SCORE_BANDS = ["PRIORITY", "INTERESTING", "REVIEW", "LOW"];

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
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Leads</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Cidade</label>
          <input
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={city}
            onChange={(e) => {
              setCursorStack([undefined]);
              setCity(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Categoria</label>
          <input
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={category}
            onChange={(e) => {
              setCursorStack([undefined]);
              setCategory(e.target.value);
            }}
          />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-600">Site</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {WEBSITE_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => toggle(websiteStatus, status, setWebsiteStatus)}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  websiteStatus.includes(status)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-600">Faixa de score</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {SCORE_BANDS.map((band) => (
              <button
                key={band}
                onClick={() => toggle(scoreBand, band, setScoreBand)}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  scoreBand.includes(band)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {band}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Categoria / Cidade</th>
              <th className="px-4 py-2">Avaliação</th>
              <th className="px-4 py-2">Site</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Estágio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.data?.items.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">
                    {lead.tradeName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.category} · {lead.city}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.rating != null ? `${lead.rating} (${lead.reviewCount})` : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge value={lead.websiteStatus} />
                </td>
                <td className="px-4 py-3">
                  {lead.currentScore != null ? (
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{lead.currentScore}</span>
                      <Badge value={lead.scoreBand} />
                    </span>
                  ) : (
                    <span className="text-slate-400">sem score</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge value={lead.crmStage} />
                </td>
              </tr>
            ))}
            {leads.data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum lead encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          disabled={cursorStack.length <= 1}
          onClick={() => setCursorStack((stack) => stack.slice(0, -1))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          disabled={!leads.data?.page.hasMore}
          onClick={() =>
            leads.data?.page.nextCursor && setCursorStack((stack) => [...stack, leads.data!.page.nextCursor!])
          }
          className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
