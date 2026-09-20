export type AdminGroup =
  | "IDENTIDADE"
  | "DESCOBERTA"
  | "LEADS"
  | "AUDITORIA"
  | "SCORING"
  | "INTELIGENCIA"
  | "OUTREACH"
  | "CRM"
  | "SISTEMA";

// Registro central de tudo que a Central de Dados expõe. Cada entrada mapeia
// uma tabela do Prisma pro seu "escopo de tenant" real — a maioria tem
// organizationId direto, mas várias (WebsiteAudit, Proposal, CrmActivity...)
// só chegam lá através de uma cadeia de relações até Lead ou Campaign. Sem
// isso, um ADMIN de uma organização enxergaria dado de outro tenant através
// desta tela (a única "porta dos fundos" que dá acesso genérico ao banco
// inteiro) — por isso o filtro é explícito por modelo, não best-effort.
export interface AdminModelEntry {
  // Nome do model no Prisma Client (camelCase) — dobra como chave de URL.
  key: string;
  label: string;
  group: AdminGroup;
  // undefined = catálogo global (ex.: CnpjEstablishment, ScorePolicy) — visível
  // a qualquer ADMIN autenticado, sem filtro de organização.
  scopeFilter?: (organizationId: string) => Record<string, unknown>;
  // AuditLog é trilha de auditoria de segurança — permitir editar/apagar por
  // aqui destruiria a própria garantia que a tabela existe para dar (rastro
  // imutável). Fora isso, único ponto de leitura-only do registro.
  readOnly?: boolean;
  searchFields?: string[];
  defaultSort?: { field: string; direction: "asc" | "desc" };
}

const byOrg = (field = "organizationId") => (organizationId: string) => ({ [field]: organizationId });

export const ADMIN_MODELS: AdminModelEntry[] = [
  // --- Identidade ---
  { key: "organization", label: "Organizações", group: "IDENTIDADE", scopeFilter: (orgId) => ({ id: orgId }), searchFields: ["name", "slug"] },
  { key: "user", label: "Usuários", group: "IDENTIDADE", scopeFilter: (orgId) => ({ memberships: { some: { organizationId: orgId } } }), searchFields: ["email", "displayName"] },
  { key: "membership", label: "Memberships", group: "IDENTIDADE", scopeFilter: byOrg() },

  // --- Descoberta ---
  { key: "niche", label: "Nichos", group: "DESCOBERTA", scopeFilter: byOrg(), searchFields: ["name", "category"] },
  { key: "campaign", label: "Campanhas", group: "DESCOBERTA", scopeFilter: byOrg(), searchFields: ["name", "category"] },
  { key: "campaignRun", label: "Execuções de Campanha", group: "DESCOBERTA", scopeFilter: (orgId) => ({ campaign: { organizationId: orgId } }) },
  { key: "leadSource", label: "Fontes de Lead", group: "DESCOBERTA", scopeFilter: byOrg(), searchFields: ["provider", "externalId"] },
  { key: "cnpjEstablishment", label: "Catálogo CNPJ (Receita Federal)", group: "DESCOBERTA", searchFields: ["razaoSocial", "nomeFantasia", "cnpj", "municipioNome"] },

  // --- Leads ---
  { key: "lead", label: "Leads", group: "LEADS", scopeFilter: byOrg(), searchFields: ["legalName", "tradeName", "cnpj", "city"] },
  { key: "leadContact", label: "Contatos de Lead", group: "LEADS", scopeFilter: (orgId) => ({ lead: { organizationId: orgId } }), searchFields: ["value"] },

  // --- Auditoria de sites ---
  { key: "websiteSnapshot", label: "Snapshots de Site", group: "AUDITORIA", scopeFilter: (orgId) => ({ lead: { organizationId: orgId } }) },
  { key: "websiteAudit", label: "Auditorias de Site", group: "AUDITORIA", scopeFilter: (orgId) => ({ snapshot: { lead: { organizationId: orgId } } }) },
  { key: "auditFinding", label: "Achados de Auditoria", group: "AUDITORIA", scopeFilter: (orgId) => ({ audit: { snapshot: { lead: { organizationId: orgId } } } }) },

  // --- Scoring ---
  { key: "scorePolicy", label: "Políticas de Score", group: "SCORING", searchFields: ["version", "description"] },
  { key: "leadScore", label: "Scores de Lead", group: "SCORING", scopeFilter: (orgId) => ({ lead: { organizationId: orgId } }) },
  { key: "scoreFactor", label: "Fatores de Score", group: "SCORING", scopeFilter: (orgId) => ({ leadScore: { lead: { organizationId: orgId } } }) },

  // --- Inteligência (IA) ---
  { key: "promptTemplate", label: "Templates de Prompt", group: "INTELIGENCIA", searchFields: ["kind", "version"] },
  { key: "aiAnalysis", label: "Análises de IA", group: "INTELIGENCIA", scopeFilter: byOrg() },
  { key: "proposal", label: "Propostas", group: "INTELIGENCIA", scopeFilter: (orgId) => ({ lead: { organizationId: orgId } }) },

  // --- Outreach ---
  { key: "outreachMessage", label: "Mensagens de Outreach", group: "OUTREACH", scopeFilter: byOrg(), searchFields: ["recipientValue"] },
  { key: "contactSuppression", label: "Supressões de Contato", group: "OUTREACH", scopeFilter: byOrg() },

  // --- CRM ---
  { key: "crmActivity", label: "Atividades de CRM", group: "CRM", scopeFilter: (orgId) => ({ lead: { organizationId: orgId } }), searchFields: ["summary"] },

  // --- Sistema / operações ---
  { key: "auditLog", label: "Log de Auditoria (segurança)", group: "SISTEMA", scopeFilter: byOrg(), readOnly: true },
  { key: "job", label: "Jobs", group: "SISTEMA", scopeFilter: byOrg(), searchFields: ["type"] },
  { key: "outboxEvent", label: "Outbox de Eventos", group: "SISTEMA", scopeFilter: byOrg(), searchFields: ["eventType"] },
];

export const ADMIN_MODEL_BY_KEY = new Map(ADMIN_MODELS.map((entry) => [entry.key, entry]));

export function getAdminModel(key: string): AdminModelEntry {
  const entry = ADMIN_MODEL_BY_KEY.get(key);
  if (!entry) {
    throw new Error(`Modelo "${key}" não está registrado na Central de Dados.`);
  }
  return entry;
}

// Campos que o Prisma gerencia sozinho (chave, timestamps automáticos) ou que
// mudariam o tenant dono do registro — nunca aceitos de um PATCH genérico,
// mesmo que a tabela em si não esteja marcada `readOnly`.
export const IMMUTABLE_FIELDS = new Set(["id", "organizationId", "createdAt", "updatedAt"]);

// Formato mínimo do DMMF que realmente usamos — `Prisma.dmmf` é runtime-only
// (o namespace de tipos `Prisma.DMMF` não é exportado publicamente), então
// modelamos aqui só os campos que lemos.
export interface PrismaFieldMeta {
  name: string;
  kind: "scalar" | "object" | "enum" | "unsupported";
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isReadOnly: boolean;
  hasDefaultValue: boolean;
  isUpdatedAt: boolean;
}

export interface PrismaModelMeta {
  name: string;
  fields: PrismaFieldMeta[];
}
