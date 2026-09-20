import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Database, Lock, Search, ShieldAlert } from "lucide-react";
import { listAdminModels, listAdminRecords, type AdminFieldMeta, type AdminModelSummary } from "../api/admin";
import { getMe } from "../api/identity";
import { ApiError } from "../api/client";
import { Panel } from "../components/Panel";
import { AdminRecordDrawer } from "../components/admin/AdminRecordDrawer";
import { formatCellValue } from "../components/admin/adminFieldUtils";

const GROUP_LABELS: Record<string, string> = {
  IDENTIDADE: "Identidade",
  DESCOBERTA: "Descoberta",
  LEADS: "Leads",
  AUDITORIA: "Auditoria de Sites",
  SCORING: "Scoring",
  INTELIGENCIA: "Inteligência (IA)",
  OUTREACH: "Outreach",
  CRM: "CRM",
  SISTEMA: "Sistema",
};
const GROUP_ORDER = Object.keys(GROUP_LABELS);

const PAGE_SIZE = 20;

function groupModels(models: AdminModelSummary[]): Array<[string, AdminModelSummary[]]> {
  const byGroup = new Map<string, AdminModelSummary[]>();
  for (const model of models) {
    const list = byGroup.get(model.group) ?? [];
    list.push(model);
    byGroup.set(model.group, list);
  }
  return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => [g, byGroup.get(g)!]);
}

export function AdminCentralPage() {
  const navigate = useNavigate();
  const { modelKey } = useParams<{ modelKey: string }>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ field?: string; direction: "asc" | "desc" }>({ direction: "desc" });
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  const me = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });
  const models = useQuery({ queryKey: ["admin", "models"], queryFn: listAdminModels, enabled: me.data?.role === "ADMIN" });
  const grouped = useMemo(() => groupModels(models.data ?? []), [models.data]);
  const activeModel = models.data?.find((m) => m.key === modelKey) ?? models.data?.[0];

  const records = useQuery({
    queryKey: ["admin", activeModel?.key, page, search, sort.field, sort.direction],
    queryFn: () =>
      listAdminRecords(activeModel!.key, {
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        sortField: sort.field,
        sortDirection: sort.direction,
      }),
    enabled: Boolean(activeModel),
    placeholderData: (prev) => prev,
  });

  function selectModel(key: string) {
    setSearch("");
    setPage(1);
    setSort({ direction: "desc" });
    navigate(`/central/${key}`);
  }

  function toggleSort(field: AdminFieldMeta) {
    if (field.kind !== "scalar") return;
    setPage(1);
    setSort((prev) =>
      prev.field === field.name
        ? { field: field.name, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field: field.name, direction: "asc" },
    );
  }

  if (me.isLoading) return null;

  if (me.data?.role !== "ADMIN") {
    return (
      <Panel title="Central de Dados" icon={ShieldAlert}>
        <p className="text-sm text-slate-400">
          Esta área é exclusiva para usuários com papel <span className="font-mono text-slate-200">ADMIN</span>.
          {me.data ? ` Seu papel atual é ${me.data.role}.` : ""}
        </p>
      </Panel>
    );
  }

  const totalPages = records.data ? Math.max(1, Math.ceil(records.data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Central de Dados</h1>
        <p className="mt-1 text-sm text-slate-500">
          Visão completa de todas as tabelas do sistema — {models.data?.length ?? 0} tabelas, acesso ADMIN.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <Panel className="h-fit lg:sticky lg:top-24">
          <nav className="space-y-4">
            {grouped.map(([group, groupModelsList]) => (
              <div key={group}>
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                  {GROUP_LABELS[group]}
                </p>
                <div className="space-y-0.5">
                  {groupModelsList.map((model) => (
                    <button
                      key={model.key}
                      onClick={() => selectModel(model.key)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                        activeModel?.key === model.key
                          ? "bg-cyan-400/10 text-cyan-300"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{model.label}</span>
                      {model.readOnly && <Lock className="h-3 w-3 shrink-0 text-slate-600" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </Panel>

        <div>
          {activeModel && (
            <Panel
              title={activeModel.label}
              icon={Database}
              action={
                <div className="flex items-center gap-2">
                  {activeModel.readOnly && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 ring-1 ring-inset ring-slate-400/25">
                      <Lock className="h-3 w-3" /> somente leitura
                    </span>
                  )}
                  {activeModel.global && (
                    <span className="rounded-full bg-violet-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-300 ring-1 ring-inset ring-violet-400/30">
                      catálogo global
                    </span>
                  )}
                </div>
              }
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    value={search}
                    disabled={!activeModel.searchable}
                    onChange={(e) => {
                      setPage(1);
                      setSearch(e.target.value);
                    }}
                    placeholder={activeModel.searchable ? "Buscar..." : "Este modelo não tem busca configurada"}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-shadow focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <span className="whitespace-nowrap font-mono text-xs text-slate-500">
                  {records.data?.total ?? 0} registros
                </span>
              </div>

              {records.error && (
                <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
                  {records.error instanceof ApiError ? records.error.problem.detail : "Falha ao carregar dados."}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                      {activeModel.fields.map((field) => (
                        <th
                          key={field.name}
                          onClick={() => toggleSort(field)}
                          className="cursor-pointer whitespace-nowrap py-2.5 pr-4 hover:text-slate-300"
                        >
                          {field.name}
                          {sort.field === field.name && (sort.direction === "asc" ? " ▲" : " ▼")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.data?.items.map((item) => (
                      <tr
                        key={item.id as string}
                        onClick={() => setSelectedRecord(item)}
                        className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                      >
                        {activeModel.fields.map((field) => (
                          <td key={field.name} className="max-w-[240px] truncate whitespace-nowrap py-3 pr-4 text-slate-300">
                            {formatCellValue(field, item[field.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {records.data?.items.length === 0 && (
                      <tr>
                        <td colSpan={activeModel.fields.length} className="py-10 text-center text-slate-600">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <span className="font-mono text-xs text-slate-500">
                  página {page} de {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {activeModel && selectedRecord && (
        <AdminRecordDrawer model={activeModel} record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}
