import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { DEV_ORGANIZATION_ID } from "../src/common/constants";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "../src/intelligence/prompts/commercial-diagnosis-v3";
import { POLICY_VERSION } from "../src/scoring/policies/policy-2026-09-v1";

const prisma = new PrismaClient();

// Determinístico e idempotente (docs/DOCUMENTATION.md seção 6.5) — nunca roda em
// produção; nada aqui depende de rede ou de uma organização já existente.
async function main(): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { id: DEV_ORGANIZATION_ID },
    update: {},
    create: {
      id: DEV_ORGANIZATION_ID,
      name: "Prospector Dev",
      slug: "prospector-dev",
    },
  });
  console.log(`Organização de desenvolvimento pronta: ${organization.slug} (${organization.id})`);

  // A configuração aqui é só documentação/auditabilidade — a lógica que
  // realmente calcula o score é código (src/scoring/policies/policy-2026-09-v1.ts),
  // versionado junto com esta mesma string.
  const policy = await prisma.scorePolicy.upsert({
    where: { version: POLICY_VERSION },
    update: {},
    create: {
      id: uuidv7(),
      version: POLICY_VERSION,
      description: "Política inicial de score comercial (docs/DOCUMENTATION.md seção 3.3)",
      status: "ACTIVE",
      factorsConfig: {
        NO_WEBSITE: 40,
        SOCIAL_ONLY: 20,
        RATING_HIGH: 10,
        REVIEWS_HIGH: 10,
        PERFORMANCE_LOW: 15,
        SEO_LOW: 10,
        NO_WHATSAPP_CTA: 10,
        NOT_MOBILE_FRIENDLY: 20,
        NO_HTTPS: 20,
        SITE_UNREACHABLE: 25,
        LOW_COMMERCIAL_SIGNAL: -15,
      },
    },
  });
  console.log(`Política de score pronta: ${policy.version}`);

  const prompt = await prisma.promptTemplate.upsert({
    where: { version: PROMPT_VERSION },
    update: {},
    create: {
      id: uuidv7(),
      kind: "COMMERCIAL_DIAGNOSIS",
      version: PROMPT_VERSION,
      content: SYSTEM_PROMPT,
      status: "ACTIVE",
    },
  });
  console.log(`Template de prompt pronto: ${prompt.version}`);

  // "usuários para cada papel" (seção 6.5) — oidc_subject nasce com um valor
  // fixo e legível; no primeiro login real (JwtAuthGuard#resolveUser), a API
  // casa esse usuário pelo e-mail e grava o `sub` de verdade emitido pelo
  // Keycloak, sem precisar de nenhuma mudança aqui.
  const roles: Array<{ role: string; subject: string; name: string }> = [
    { role: "ADMIN", subject: "dev-admin", name: "Admin Dev" },
    { role: "ANALYST", subject: "dev-analyst", name: "Analista Dev" },
    { role: "SALES", subject: "dev-sales", name: "Vendedor Dev" },
    { role: "MANAGER", subject: "dev-manager", name: "Gestor Dev" },
    { role: "OPERATOR", subject: "dev-operator", name: "Operador Dev" },
    { role: "VIEWER", subject: "dev-viewer", name: "Auditor Dev" },
  ];

  for (const { role, subject, name } of roles) {
    const user = await prisma.user.upsert({
      where: { oidcSubject: subject },
      update: {},
      create: {
        id: uuidv7(),
        oidcSubject: subject,
        email: `${subject}@prospector.dev`,
        displayName: name,
      },
    });
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: DEV_ORGANIZATION_ID, userId: user.id } },
      update: { role },
      create: { id: uuidv7(), organizationId: DEV_ORGANIZATION_ID, userId: user.id, role },
    });
  }
  console.log(`Usuários de desenvolvimento prontos: ${roles.map((r) => r.role).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
