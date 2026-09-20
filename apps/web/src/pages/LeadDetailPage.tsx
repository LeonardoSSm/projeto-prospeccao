import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? (error.problem.detail ?? error.problem.title) : fallback;
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

  if (lead.isLoading) return <p className="text-slate-500">Carregando...</p>;
  if (lead.isError || !lead.data) return <p className="text-red-600">Lead não encontrado.</p>;
  const currentLead = lead.data;

  return (
    <div>
      <Link to="/leads" className="text-sm text-slate-500 hover:underline">
        ← Voltar para Leads
      </Link>
      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{currentLead.tradeName}</h1>
          <p className="text-sm text-slate-500">
            {currentLead.legalName} · {currentLead.category} · {currentLead.city}
          </p>
          {currentLead.website && (
            <a href={currentLead.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
              {currentLead.website}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Badge value={currentLead.websiteStatus} />
          <Badge value={currentLead.crmStage} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ContactsCard leadId={id} contacts={currentLead.contacts} onSuppressed={invalidateLead} />
        <ScoreCard leadId={id} score={score.data} onRecalculated={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "score"] })} />
        <CrmCard lead={currentLead} members={members.data?.items ?? []} onSaved={() => { invalidateLead(); void queryClient.invalidateQueries({ queryKey: ["lead", id, "activities"] }); }} />
        <ActivitiesCard activities={activities.data ?? []} />
        <AuditsCard leadId={id} audits={audits.data?.items ?? []} onRequested={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "audits"] })} />
        <DiagnosisCard leadId={id} analyses={analyses.data?.items ?? []} onRequested={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "analyses"] })} />
        <ProposalsCard leadId={id} proposals={proposals.data ?? []} onChanged={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "proposals"] })} />
        <OutreachCard leadId={id} messages={messages.data ?? []} onChanged={() => void queryClient.invalidateQueries({ queryKey: ["lead", id, "messages"] })} />
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
    <Card title="Contatos">
      {contacts.length === 0 && <p className="text-sm text-slate-400">Nenhum contato coletado.</p>}
      <ul className="space-y-1 text-sm">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex items-center justify-between">
            <span>
              <span className="font-medium text-slate-700">{contact.type}:</span> {contact.value}
              {contact.primaryContact && <span className="ml-1 text-xs text-slate-400">(principal)</span>}
            </span>
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={() => suppressMutation.mutate(contact.type === "PHONE" ? "SMS" : contact.type)}
            >
              suprimir
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
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
    <Card
      title="Score"
      action={
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {mutation.isPending ? "Calculando..." : "Recalcular"}
        </button>
      }
    >
      {!score ? (
        <p className="text-sm text-slate-400">Sem score calculado ainda.</p>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-3xl font-semibold text-slate-900">{score.totalScore}</span>
            <Badge value={score.band} />
            {!score.eligibleForOutreach && (
              <span className="text-xs text-red-500">não elegível para contato</span>
            )}
          </div>
          <ul className="space-y-1 text-xs text-slate-600">
            {score.factors.map((factor, i) => (
              <li key={i} className="flex justify-between">
                <span>{factor.code}</span>
                <span className={factor.points >= 0 ? "text-slate-700" : "text-emerald-700"}>
                  {factor.points > 0 ? "+" : ""}
                  {factor.points}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">política {score.policyVersion}</p>
        </div>
      )}
    </Card>
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
    <Card title="Funil (CRM)">
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Estágio</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            {CRM_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Responsável</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
          >
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName} ({m.role})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Próxima ação</label>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={nextActionAt}
            onChange={(e) => setNextActionAt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Nota (vira atividade)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Card>
  );
}

function ActivitiesCard({ activities }: { activities: import("../api/crm").CrmActivity[] }) {
  return (
    <Card title="Histórico de atividades">
      {activities.length === 0 && <p className="text-sm text-slate-400">Nenhuma atividade ainda.</p>}
      <ul className="space-y-2 text-sm">
        {activities.map((activity) => (
          <li key={activity.id} className="border-l-2 border-slate-200 pl-3">
            <p className="text-slate-700">{activity.summary}</p>
            <p className="text-xs text-slate-400">
              {activity.activityType} · {new Date(activity.occurredAt).toLocaleString("pt-BR")}
            </p>
          </li>
        ))}
      </ul>
    </Card>
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
    <Card title="Auditoria do site">
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url) mutation.mutate();
        }}
      >
        <input
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Solicitar
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <ul className="space-y-2 text-sm">
        {audits.map((audit) => (
          <li key={audit.id} className="rounded-md border border-slate-100 p-2">
            <div className="flex items-center justify-between">
              <span className="truncate text-slate-700">{audit.requestedUrl}</span>
              <Badge value={audit.status} />
            </div>
            {audit.lighthouse && (
              <p className="mt-1 text-xs text-slate-500">
                Perf {audit.lighthouse.performance} · A11y {audit.lighthouse.accessibility} · SEO {audit.lighthouse.seo} ·
                Boas práticas {audit.lighthouse.bestPractices}
              </p>
            )}
            {audit.findings.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-slate-500">
                {audit.findings.map((f) => (
                  <li key={f.code}>{f.code}</li>
                ))}
              </ul>
            )}
            {audit.failureReason && <p className="mt-1 text-xs text-red-500">{audit.failureReason}</p>}
          </li>
        ))}
        {audits.length === 0 && <p className="text-sm text-slate-400">Nenhuma auditoria ainda.</p>}
      </ul>
    </Card>
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
    <Card
      title="Diagnóstico por IA"
      action={
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {mutation.isPending ? "Gerando..." : "Gerar diagnóstico"}
        </button>
      }
    >
      {!latest ? (
        <p className="text-sm text-slate-400">Nenhum diagnóstico concluído ainda.</p>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-slate-700">{latest.diagnosis!.summary}</p>
          {latest.diagnosis!.problems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500">Problemas</p>
              <ul className="list-inside list-disc text-slate-600">
                {latest.diagnosis!.problems.map((p, i) => (
                  <li key={i}>{p.text}</li>
                ))}
              </ul>
            </div>
          )}
          {latest.diagnosis!.opportunities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500">Oportunidades</p>
              <ul className="list-inside list-disc text-slate-600">
                {latest.diagnosis!.opportunities.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Oferta recomendada: <span className="font-medium">{latest.diagnosis!.recommendedOffer}</span> ·{" "}
            {latest.generation.modelAlias}
          </p>
        </div>
      )}
    </Card>
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
    <Card
      title="Propostas"
      action={
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {generateMutation.isPending ? "Gerando..." : "Gerar proposta"}
        </button>
      }
    >
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {proposals.length === 0 && <p className="text-sm text-slate-400">Nenhuma proposta ainda.</p>}
      <ul className="space-y-2 text-sm">
        {proposals.map((proposal) => (
          <li key={proposal.id} className="rounded-md border border-slate-100 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">Revisão {proposal.revision}</span>
              <Badge value={proposal.status} />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600">{proposal.content}</pre>
            {proposal.status === "PENDING_APPROVAL" && (
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                  onClick={() => decideMutation.mutate({ id: proposal.id, decision: "APPROVED" })}
                >
                  Aprovar
                </button>
                <button
                  className="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                  onClick={() => decideMutation.mutate({ id: proposal.id, decision: "REJECTED" })}
                >
                  Rejeitar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
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
    <Card title="Outreach">
      <form
        className="mb-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (content) createMutation.mutate();
        }}
      >
        <div className="flex gap-2">
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {OUTREACH_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Criar mensagem
          </button>
        </div>
        <textarea
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          rows={2}
          placeholder="Conteúdo da mensagem..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </form>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <ul className="space-y-2 text-sm">
        {messages.map((message) => (
          <li key={message.id} className="rounded-md border border-slate-100 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {message.channel} → {message.recipientValue}
              </span>
              <Badge value={message.status} />
            </div>
            <p className="text-xs text-slate-600">{message.content}</p>
            {message.rejectedReason && <p className="mt-1 text-xs text-red-500">{message.rejectedReason}</p>}
            {message.failureReason && <p className="mt-1 text-xs text-red-500">{message.failureReason}</p>}
            <div className="mt-2 flex gap-2">
              {message.status === "PENDING_APPROVAL" && (
                <>
                  <button
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                    onClick={() => decideMutation.mutate({ id: message.id, decision: "APPROVED" })}
                  >
                    Aprovar
                  </button>
                  <button
                    className="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                    onClick={() => decideMutation.mutate({ id: message.id, decision: "REJECTED" })}
                  >
                    Rejeitar
                  </button>
                </>
              )}
              {message.status === "APPROVED" && (
                <button
                  className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-700"
                  onClick={() => sendMutation.mutate(message.id)}
                >
                  Solicitar envio
                </button>
              )}
            </div>
          </li>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-400">Nenhuma mensagem ainda.</p>}
      </ul>
    </Card>
  );
}
