import { PrismaClient } from "@prisma/client";
import { DEV_ORGANIZATION_ID } from "../src/common/constants";

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
