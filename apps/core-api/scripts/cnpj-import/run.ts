import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { CNAE_BY_CATEGORY } from "../../src/discovery/providers/cnae-by-category";
import { parseArgs } from "./config";
import { collectEstabelecimentos } from "./import-estabelecimentos";
import { enrichWithEmpresas } from "./import-empresas";
import { resolveMunicipioCodigos } from "./municipios";

const prisma = new PrismaClient();

// Orquestra a importação completa para um ou mais municípios: resolve os
// códigos de município da Receita, filtra Estabelecimentos por
// município+CNAE em uma única varredura (passe 1), completa razão
// social/porte/capital via Empresas (passe 2) só para quem sobreviveu ao
// filtro, e grava tudo em cnpj_establishments em lote.
//
// Uso: pnpm run import:cnpj -- --municipio="Fortaleza,Caucaia,Sobral" --uf=CE --cnaes=DENTIST,LAWYER
// (--municipio aceita uma lista separada por vírgula, todos na mesma UF;
// --uf é obrigatório — resolve ambiguidade de municípios homônimos entre
// estados, já que a tabela da Receita não distingue UF pelo nome; --cnaes
// aceita categorias de nicho, mapeadas via CNAE_BY_CATEGORY, ou códigos CNAE
// diretos separados por vírgula; sem --cnaes, usa todos os nichos mapeados.)
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const municipioNomes = (args.municipio ?? "")
    .split(",")
    .map((nome) => nome.trim())
    .filter((nome) => nome.length > 0);
  const uf = args.uf?.trim().toUpperCase();
  if (municipioNomes.length === 0 || !uf) {
    throw new Error(
      'Use --municipio="Nome Do Município[,Outro Município,...]" --uf=UF (grafia oficial da Receita, uma UF por execução)',
    );
  }

  const cnaes = resolveCnaes(args.cnaes);
  console.log(`Resolvendo código de município para: ${municipioNomes.join(", ")} (UF=${uf})...`);
  const resolved = await resolveMunicipioCodigos(municipioNomes);
  const nomeByCodigo = new Map<string, string>();
  const municipioCodigos = new Set<string>();
  for (const { nome, codigos } of resolved) {
    if (codigos.length > 1) {
      console.log(`  ${nome}: ${codigos.length} códigos homônimos (${codigos.join(", ")}) — desambiguando por UF=${uf} na varredura`);
    }
    for (const codigo of codigos) {
      nomeByCodigo.set(codigo, nome);
      municipioCodigos.add(codigo);
    }
  }
  console.log(`CNAEs alvo: ${cnaes.join(", ")}`);

  console.log("\nPasse 1/2 — filtrando Estabelecimentos...");
  const estabelecimentos = await collectEstabelecimentos(municipioCodigos, uf, cnaes, (file, matched, scanned) => {
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
        municipioNome: nomeByCodigo.get(estab.municipioCodigo) ?? estab.municipioCodigo,
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
