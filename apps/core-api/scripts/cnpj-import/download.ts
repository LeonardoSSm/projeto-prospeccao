import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { baseUrl, DATA_DIR, EMPRESAS_FILES, ESTABELECIMENTOS_FILES, parseArgs, REFERENCE_FILES } from "./config";

// Baixa os arquivos públicos de CNPJ da Receita Federal para uso local pelo
// import-estabelecimentos/run.ts. Não requer autenticação — é dado aberto.
//
// Uso:
//   pnpm run import:cnpj:download -- --mes=2026-09
//   pnpm run import:cnpj:download -- --mes=2026-09 --apenas=referencia   (só Municipios/Cnaes, rápido)
//   pnpm run import:cnpj:download -- --mes=2026-09 --apenas=estabelecimentos
async function downloadFile(url: string, destination: string): Promise<void> {
  if (fs.existsSync(destination)) {
    console.log(`já existe, pulando: ${path.basename(destination)}`);
    return;
  }

  console.log(`baixando ${url} ...`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  }

  const tempPath = `${destination}.part`;
  await pipeline(Readable.fromWeb(response.body as never), fs.createWriteStream(tempPath));
  fs.renameSync(tempPath, destination);
  console.log(`ok: ${path.basename(destination)}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mes = args.mes;
  if (!mes) {
    throw new Error(
      "Use --mes=AAAA-MM (confira o mês vigente em https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/)",
    );
  }
  const escopo = args.apenas ?? "tudo";

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const url = baseUrl(mes);

  let files: string[] = [];
  if (escopo === "referencia") files = REFERENCE_FILES;
  else if (escopo === "estabelecimentos") files = [...REFERENCE_FILES, ...ESTABELECIMENTOS_FILES];
  else files = [...REFERENCE_FILES, ...ESTABELECIMENTOS_FILES, ...EMPRESAS_FILES];

  for (const file of files) {
    await downloadFile(`${url}/${file}`, path.join(DATA_DIR, file));
  }

  console.log(`Concluído. Arquivos em ${DATA_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
