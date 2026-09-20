import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Globe,
  History,
  Lightbulb,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { getLead } from "../api/leads";
import { listAudits, requestAudit } from "../api/auditing";
import { getLatestScore, recalculateScore } from "../api/scoring";
import { CRM_STAGES, listActivities, listMembers, updateCrm } from "../api/crm";
import { generateProposal, listAnalyses, listProposals, decideProposal, requestAnalysis } from "../api/intelligence";
import {
  OUTREACH_CHANNELS,
  createOutreachMessage,
  decideOutreachMessage,
  listOutreachMessages,
  requestOutreachSend,
  suppressContact,
} from "../api/outreach";
import { ApiError } from "../api/client";
import { Badge } from "../components/Badge";
import { Panel } from "../components/Panel";
import { RadialGauge, type GaugeColor } from "../components/RadialGauge";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-shadow focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]";
const labelClass = "block text-xs font-medium uppercase tracking-wider text-slate-500";
const primaryBtn =
  "rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";
const ghostBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40";
const approveBtn =
  "flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30 transition-colors hover:bg-emerald-400/20";
const rejectBtn =
  "flex items-center gap-1.5 rounded-lg bg-rose-400/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/30 transition-colors hover:bg-rose-400/20";

const CHANNEL_ICON: Record<string, typeof Phone> = { PHONE: Phone, EMAIL: Mail, WHATSAPP: MessageSquare, SMS: Phone };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? (error.problem.detail ?? error.problem.title) : fallback;
}

function bandColor(band: string | null | undefined): GaugeColor {
  switch (band) {
    case "PRIORITY":
      return "rose";
    case "INTERESTING":
      return "amber";
    case "REVIEW":
      return "cyan";
    default:
      return "slate";
  }
}

function lighthouseColor(value: number | null | undefined): GaugeColor {
  if (value == null) return "slate";
  if (value >= 90) return "emerald";
  if (value >= 50) return "amber";
  return "rose";
}

export function LeadDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const invalidateLead = () => void queryClient.invalidateQueries({ queryKey: ["lead", id] });

  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => getLead(id) });
  const score = useQuery({ queryKey: ["lead", id, "score"], queryFn: () => getLatestScore(id), retry: false });
  const audits = useQuery({ queryKey: ["lead", id, "audits"], queryFn: () => listAudits(id) });
  const activities = useQuery({ queryKey: ["lead", id, "activities"], queryFn: () => listActivities(id) });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const analyses = useQuery({ queryKey: ["lead", id, "analyses"], queryFn: () => listAnalyses(id) });
  const proposals = useQuery({ queryKey: ["lead", id, "proposals"], queryFn: () => listProposals(id) });
  const messages = useQuery({ queryKey: ["lead", id, "messages"], queryFn: () => listOutreachMessages(id) });

  if (lead.isLoading) {
    return <p className="py-16 text-center text-slate-500">Carregando lead...</p>;
  }
  if (lead.isError || !lead.data) {
    return <p className="py-16 text-center text-rose-400">Lead não encontrado.</p>;
  }
  const currentLead = lead.data;

  return (
    <div>
      <Link to="/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Leads
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300 ring-1 ring-white/10">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">{currentLead.tradeName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {currentLead.legalName} · <span className="font-mono text-xs">{currentLead.category}</span> ·{" "}
              {currentLead.city}
            </p>
            {currentLead.website && (
              <a
                href={currentLead.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                {currentLead.website}
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge value={currentLead.websiteStatus} />
          <Badge value={currentLead.crmStage} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ContactsCard leadId={id} contacts={currentLead.contacts} onSuppressed={invalidateLead} />
        <ScoreCard
          leadId={id}
          score={score.data}
          onRecalculated={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "score"] })}
        />
        <CrmCard
          lead={currentLead}
          members={members.data?.items ?? []}
          onSaved={() => {
            invalidateLead();
            void queryClient.invalidateQueries({ queryKey: ["lead", id, "activities"] });
          }}
        />
        <ActivitiesCard activities={activities.data ?? []} />
        <AuditsCard
          leadId={id}
          audits={audits.data?.items ?? []}
          onRequested={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "audits"] })}
        />
        <DiagnosisCard
          leadId={id}
          analyses={analyses.data?.items ?? []}
          onRequested={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "analyses"] })}
        />
        <ProposalsCard
          leadId={id}
          proposals={proposals.data ?? []}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "proposals"] })}
        />
        <OutreachCard
          leadId={id}
          messages={messages.data ?? []}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "messages"] })}
        />
      </div>
    </div>
  );
}

function ContactsCard({
  leadId,
  contacts,
  onSuppressed,
}: {
  leadId: string;
  contacts: { id: string; type: string; value: string; primaryContact: boolean }[];
  onSuppressed: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const suppressMutation = useMutation({
    mutationFn: (channel: string) => suppressContact(leadId, channel, "Solicitado via interface"),
    onSuccess: onSuppressed,
    onError: (err) => setError(errorMessage(err, "Falha ao suprimir contato")),
  });

  return (
    <Panel title="Contatos" icon={Users}>
      {contacts.length === 0 && <p className="text-sm text-slate-600">Nenhum contato coletado.</p>}
      <ul className="space-y-2 text-sm">
        {contacts.map((contact) => {
          const Icon = CHANNEL_ICON[contact.type] ?? Phone;
          return (
            <li key={contact.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="flex items-center gap-2 text-slate-300">
                <Icon className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-mono text-xs">{contact.value}</span>
                {contact.primaryContact && (
                  <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cyan-300">
                    principal
                  </span>
                )}
              </span>
              <button
                className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-rose-400/80 hover:text-rose-300"
                onClick={() => suppressMutation.mutate(contact.type === "PHONE" ? "SMS" : contact.type)}
              >
                <Ban className="h-3 w-3" /> suprimir
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </Panel>
  );
}

function ScoreCard({
  leadId,
  score,
  onRecalculated,
}: {
  leadId: string;
  score?: import("../api/scoring").LeadScoreDetail;
  onRecalculated: () => void;
}) {
  const mutation = useMutation({ mutationFn: () => recalculateScore(leadId), onSuccess: onRecalculated });

  return (
    <Panel
      title="Score"
      icon={Gauge}
      action={
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className={ghostBtn}>
          <span className="flex items-center gap-1.5">
            <RefreshCw className={`h-3 w-3 ${mutation.isPending ? "animate-spin" : ""}`} />
            {mutation.isPending ? "Calculando..." : "Recalcular"}
          </span>
        </button>
      }
    >
      {!score ? (
        <p className="text-sm text-slate-600">Sem score calculado ainda.</p>
      ) : (
        <div className="flex items-center gap-5">
          <RadialGauge value={score.totalScore} color={bandColor(score.band)} size={84} />
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge value={score.band} />
              {!score.eligibleForOutreach && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-rose-400">
                  não elegível para contato
                </span>
              )}
            </div>
            <ul className="space-y-1 text-xs">
              {score.factors.map((factor, i) => (
                <li key={i} className="flex justify-between text-slate-400">
                  <span className="font-mono">{factor.code}</span>
                  <span className={factor.points >= 0 ? "text-slate-300" : "text-emerald-400"}>
                    {factor.points > 0 ? "+" : ""}
                    {factor.points}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[10px] text-slate-600">política {score.policyVersion}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}

function CrmCard({
  lead,
  members,
  onSaved,
}: {
  lead: import("../api/leads").LeadDetail;
  members: import("../api/crm").Member[];
  onSaved: () => void;
}) {
  const [stage, setStage] = useState(lead.crmStage);
  const [assignedUserId, setAssignedUserId] = useState(lead.assignedUserId ?? "");
  const [nextActionAt, setNextActionAt] = useState(lead.nextActionAt?.slice(0, 16) ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      updateCrm(
        lead.id,
        {
          stage,
          assignedUserId: assignedUserId || undefined,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
          note: note || undefined,
        },
        lead.version,
      ),
    onSuccess: () => {
      setNote("");
      setError(null);
      onSaved();
    },
    onError: (err) => setError(errorMessage(err, "Falha ao atualizar CRM")),
  });

  return (
    <Panel title="Funil (CRM)" icon={Target}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Estágio</label>
          <select className={inputClass} value={stage} onChange={(e) => setStage(e.target.value)}>
            {CRM_STAGES.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Responsável</label>
          <select className={inputClass} value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            <option value="" className="bg-slate-900">
              Sem responsável
            </option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId} className="bg-slate-900">
                {m.displayName} ({m.role})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Próxima ação</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={nextActionAt}
            onChange={(e) => setNextActionAt(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Nota (vira atividade)</label>
          <textarea
            className={inputClass}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={`${primaryBtn} w-full py-2`}
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Panel>
  );
}

function ActivitiesCard({ activities }: { activities: import("../api/crm").CrmActivity[] }) {
  return (
    <Panel title="Histórico de atividades" icon={History}>
      {activities.length === 0 && <p className="text-sm text-slate-600">Nenhuma atividade ainda.</p>}
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="relative border-l-2 border-cyan-400/30 pl-4">
            <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            <p className="text-sm text-slate-300">{activity.summary}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-600">
              {activity.activityType} · {new Date(activity.occurredAt).toLocaleString("pt-BR")}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AuditsCard({
  leadId,
  audits,
  onRequested,
}: {
  leadId: string;
  audits: import("../api/auditing").AuditSummary[];
  onRequested: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => requestAudit(leadId, url),
    onSuccess: () => {
      setUrl("");
      setError(null);
      onRequested();
    },
    onError: (err) => setError(errorMessage(err, "Falha ao solicitar auditoria")),
  });

  return (
    <Panel title="Auditoria do site" icon={ShieldCheck}>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url) mutation.mutate();
        }}
      >
        <input
          className={`${inputClass} mt-0 font-mono`}
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
          Solicitar
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
      <ul className="space-y-3 text-sm">
        {audits.map((audit) => (
          <li key={audit.id} className="rounded-lg bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-slate-400">{audit.requestedUrl}</span>
              <Badge value={audit.status} />
            </div>
            {audit.lighthouse && (
              <div className="mb-2 flex flex-wrap gap-4">
                <RadialGauge
                  value={audit.lighthouse.performance ?? 0}
                  size={52}
                  strokeWidth={4}
                  color={lighthouseColor(audit.lighthouse.performance)}
                  label="Perf"
                />
                <RadialGauge
                  value={audit.lighthouse.accessibility ?? 0}
                  size={52}
                  strokeWidth={4}
                  color={lighthouseColor(audit.lighthouse.accessibility)}
                  label="A11y"
                />
                <RadialGauge
                  value={audit.lighthouse.seo ?? 0}
                  size={52}
                  strokeWidth={4}
                  color={lighthouseColor(audit.lighthouse.seo)}
                  label="SEO"
                />
                <RadialGauge
                  value={audit.lighthouse.bestPractices ?? 0}
                  size={52}
                  strokeWidth={4}
                  color={lighthouseColor(audit.lighthouse.bestPractices)}
                  label="Práticas"
                />
              </div>
            )}
            {audit.findings.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-500">
                {audit.findings.map((f) => (
                  <li key={f.code} className="font-mono">
                    · {f.code}
                  </li>
                ))}
              </ul>
            )}
            {audit.failureReason && <p className="mt-1 text-xs text-rose-400">{audit.failureReason}</p>}
          </li>
        ))}
        {audits.length === 0 && <p className="text-sm text-slate-600">Nenhuma auditoria ainda.</p>}
      </ul>
    </Panel>
  );
}

function DiagnosisCard({
  leadId,
  analyses,
  onRequested,
}: {
  leadId: string;
  analyses: import("../api/intelligence").AiAnalysis[];
  onRequested: () => void;
}) {
  const mutation = useMutation({ mutationFn: () => requestAnalysis(leadId), onSuccess: onRequested });
  const latest = analyses.find((a) => a.status === "COMPLETED" && a.diagnosis);

  return (
    <Panel
      title="Diagnóstico por IA"
      icon={Sparkles}
      action={
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className={ghostBtn}>
          {mutation.isPending ? "Gerando..." : "Gerar diagnóstico"}
        </button>
      }
    >
      {!latest ? (
        <p className="text-sm text-slate-600">Nenhum diagnóstico concluído ainda.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-slate-300">{latest.diagnosis!.summary}</p>
          {latest.diagnosis!.problems.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                <XCircle className="h-3 w-3" /> Problemas
              </p>
              <ul className="space-y-1 text-slate-400">
                {latest.diagnosis!.problems.map((p, i) => (
                  <li key={i}>· {p.text}</li>
                ))}
              </ul>
            </div>
          )}
          {latest.diagnosis!.opportunities.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <Lightbulb className="h-3 w-3" /> Oportunidades
              </p>
              <ul className="space-y-1 text-slate-400">
                {latest.diagnosis!.opportunities.map((o, i) => (
                  <li key={i}>· {o}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="border-t border-white/5 pt-2 font-mono text-[10px] text-slate-600">
            Oferta recomendada: <span className="text-cyan-400">{latest.diagnosis!.recommendedOffer}</span> ·{" "}
            {latest.generation.modelAlias}
          </p>
        </div>
      )}
    </Panel>
  );
}

function ProposalsCard({
  leadId,
  proposals,
  onChanged,
}: {
  leadId: string;
  proposals: import("../api/intelligence").Proposal[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const generateMutation = useMutation({
    mutationFn: () => generateProposal(leadId),
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (err) => setError(errorMessage(err, "Falha ao gerar proposta")),
  });
  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVED" | "REJECTED" }) => decideProposal(id, decision),
    onSuccess: onChanged,
  });

  return (
    <Panel
      title="Propostas"
      icon={ClipboardList}
      action={
        <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className={ghostBtn}>
          {generateMutation.isPending ? "Gerando..." : "Gerar proposta"}
        </button>
      }
    >
      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
      {proposals.length === 0 && <p className="text-sm text-slate-600">Nenhuma proposta ainda.</p>}
      <ul className="space-y-3 text-sm">
        {proposals.map((proposal) => (
          <li key={proposal.id} className="rounded-lg bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Revisão {proposal.revision}
              </span>
              <Badge value={proposal.status} />
            </div>
            <pre className="whitespace-pre-wrap rounded-md bg-black/30 p-3 font-mono text-xs leading-relaxed text-slate-400">
              {proposal.content}
            </pre>
            {proposal.status === "PENDING_APPROVAL" && (
              <div className="mt-2.5 flex gap-2">
                <button
                  className={approveBtn}
                  onClick={() => decideMutation.mutate({ id: proposal.id, decision: "APPROVED" })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                </button>
                <button
                  className={rejectBtn}
                  onClick={() => decideMutation.mutate({ id: proposal.id, decision: "REJECTED" })}
                >
                  <XCircle className="h-3.5 w-3.5" /> Rejeitar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function OutreachCard({
  leadId,
  messages,
  onChanged,
}: {
  leadId: string;
  messages: import("../api/outreach").OutreachMessage[];
  onChanged: () => void;
}) {
  const [channel, setChannel] = useState(OUTREACH_CHANNELS[0]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createOutreachMessage(leadId, channel, content),
    onSuccess: () => {
      setContent("");
      setError(null);
      onChanged();
    },
    onError: (err) => setError(errorMessage(err, "Falha ao criar mensagem")),
  });
  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVED" | "REJECTED" }) =>
      decideOutreachMessage(id, decision),
    onSuccess: onChanged,
  });
  const sendMutation = useMutation({
    mutationFn: (id: string) => requestOutreachSend(id),
    onSuccess: onChanged,
    onError: (err) => setError(errorMessage(err, "Falha ao solicitar envio")),
  });

  return (
    <Panel title="Outreach" icon={Send} className="lg:col-span-2">
      <form
        className="mb-4 space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (content) createMutation.mutate();
        }}
      >
        <div className="flex gap-2">
          <select
            className={`${inputClass} mt-0 w-40 font-mono`}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {OUTREACH_CHANNELS.map((c) => (
              <option key={c} value={c} className="bg-slate-900">
                {c}
              </option>
            ))}
          </select>
          <button type="submit" disabled={createMutation.isPending} className={primaryBtn}>
            Criar mensagem
          </button>
        </div>
        <textarea
          className={`${inputClass} mt-0`}
          rows={2}
          placeholder="Conteúdo da mensagem..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </form>
      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {messages.map((message) => {
          const Icon = CHANNEL_ICON[message.channel] ?? MessageSquare;
          return (
            <div key={message.id} className="rounded-lg bg-white/[0.03] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <Icon className="h-3 w-3 text-cyan-400" />
                  {message.channel} → {message.recipientValue}
                </span>
                <Badge value={message.status} />
              </div>
              <p className="text-xs text-slate-400">{message.content}</p>
              {message.rejectedReason && <p className="mt-1 text-xs text-rose-400">{message.rejectedReason}</p>}
              {message.failureReason && <p className="mt-1 text-xs text-rose-400">{message.failureReason}</p>}
              <div className="mt-2.5 flex gap-2">
                {message.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      className={approveBtn}
                      onClick={() => decideMutation.mutate({ id: message.id, decision: "APPROVED" })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                    </button>
                    <button
                      className={rejectBtn}
                      onClick={() => decideMutation.mutate({ id: message.id, decision: "REJECTED" })}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Rejeitar
                    </button>
                  </>
                )}
                {message.status === "APPROVED" && (
                  <button className={primaryBtn} onClick={() => sendMutation.mutate(message.id)}>
                    <span className="flex items-center gap-1.5">
                      <Send className="h-3 w-3" /> Solicitar envio
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-sm text-slate-600">Nenhuma mensagem ainda.</p>}
      </div>
    </Panel>
  );
}
