import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { DEV_ORGANIZATION_ID } from "../src/common/constants";
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
