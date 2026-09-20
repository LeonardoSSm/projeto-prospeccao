import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { CNAE_BY_CATEGORY } from "../../src/discovery/providers/cnae-by-category";
import { parseArgs } from "./config";
import { collectEstabelecimentos } from "./import-estabelecimentos";
import { enrichWithEmpresas } from "./import-empresas";
import { resolveMunicipioCodigo } from "./municipios";

const prisma = new PrismaClient();

// Orquestra a importação completa para um município: resolve o código de
// município da Receita, filtra Estabelecimentos por município+CNAE (passe 1),
// completa razão social/porte/capital via Empresas (passe 2) só para quem
// sobreviveu ao filtro, e grava tudo em cnpj_establishments em lote.
//
// Uso: pnpm run import:cnpj -- --municipio="Fortaleza" --cnaes=DENTIST,LAWYER
// (--cnaes aceita categorias de nicho, mapeadas via CNAE_BY_CATEGORY, ou
// códigos CNAE diretos separados por vírgula; sem --cnaes, usa todos os
// nichos mapeados.)
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const municipioNome = args.municipio;
  if (!municipioNome) {
    throw new Error('Use --municipio="Nome Do Município" (grafia oficial da Receita, sem UF)');
  }

  const cnaes = resolveCnaes(args.cnaes);
  console.log(`Resolvendo código de município para "${municipioNome}"...`);
  const municipioCodigo = await resolveMunicipioCodigo(municipioNome);
  console.log(`Município: ${municipioNome} -> código ${municipioCodigo}`);
  console.log(`CNAEs alvo: ${cnaes.join(", ")}`);

  console.log("\nPasse 1/2 — filtrando Estabelecimentos...");
  const estabelecimentos = await collectEstabelecimentos(municipioCodigo, cnaes, (file, matched, scanned) => {
    console.log(`  ${file}: ${scanned} linhas lidas, ${matched} casamentos até aqui`);
  });
  console.log(`Passe 1 concluído: ${estabelecimentos.length} estabelecimentos candidatos.`);

  if (estabelecimentos.length === 0) {
    console.log("Nada encontrado — nada a importar.");
    return;
  }

  const cnpjBasicosNeeded = new Set(estabelecimentos.map((e) => e.cnpj.slice(0, 8)));
  console.log(`\nPasse 2/2 — completando razão social de ${cnpjBasicosNeeded.size} empresas...`);
  const empresas = await enrichWithEmpresas(cnpjBasicosNeeded, (file, found) => {
    console.log(`  ${file}: ${found}/${cnpjBasicosNeeded.size} encontrados até aqui`);
  });

  let skipped = 0;
  const rows = estabelecimentos.flatMap((estab) => {
    const empresa = empresas.get(estab.cnpj.slice(0, 8));
    const razaoSocial = empresa?.razaoSocial ?? estab.nomeFantasia;
    if (!razaoSocial) {
      skipped += 1;
      return [];
    }
    return [
      {
        id: uuidv7(),
        cnpj: estab.cnpj,
        matrizFilial: estab.matrizFilial,
        razaoSocial,
        nomeFantasia: estab.nomeFantasia,
        situacaoCadastral: estab.situacaoCadastral,
        dataSituacao: estab.dataSituacao ? new Date(estab.dataSituacao) : null,
        cnaeFiscalPrincipal: estab.cnaeFiscalPrincipal,
        cnaesSecundarios: estab.cnaesSecundarios,
        logradouro: estab.logradouro,
        numero: estab.numero,
        complemento: estab.complemento,
        bairro: estab.bairro,
        cep: estab.cep,
        municipioCodigo: estab.municipioCodigo,
        municipioNome,
        uf: estab.uf,
        ddd1: estab.ddd1,
        telefone1: estab.telefone1,
        ddd2: estab.ddd2,
        telefone2: estab.telefone2,
        email: estab.email,
        dataInicioAtividade: estab.dataInicioAtividade ? new Date(estab.dataInicioAtividade) : null,
        porte: empresa?.porte ?? null,
        capitalSocial: empresa?.capitalSocial ?? null,
      },
    ];
  });

  console.log(`\nGravando ${rows.length} registros (${skipped} pulados sem razão social nem nome fantasia)...`);
  const result = await prisma.cnpjEstablishment.createMany({ data: rows, skipDuplicates: true });
  console.log(`Concluído: ${result.count} novos registros em cnpj_establishments.`);
}

function resolveCnaes(arg: string | undefined): string[] {
  if (!arg) {
    return [...new Set(Object.values(CNAE_BY_CATEGORY).flat())];
  }
  return arg.split(",").map((token) => {
    const trimmed = token.trim().toUpperCase();
    return CNAE_BY_CATEGORY[trimmed]?.[0] ?? trimmed;
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
