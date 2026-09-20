import * as path from "node:path";
import { parse } from "csv-parse/sync";
import { parseMunicipioRow } from "../../src/cnpj-import/layout";
import { DATA_DIR } from "./config";
import { openSingleEntryStream } from "./zip-stream";

// Municipios.zip é pequeno (~5.500 linhas) — dá pra carregar por inteiro em
// memória, ao contrário de Estabelecimentos/Empresas.
async function loadMunicipios(): Promise<Map<string, string[]>> {
  const stream = await openSingleEntryStream(path.join(DATA_DIR, "Municipios.zip"));
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  const content = Buffer.concat(chunks).toString("latin1");

  const rows: string[][] = parse(content, { delimiter: ";", relax_quotes: true });
  const byName = new Map<string, string[]>();
  for (const row of rows) {
    const parsed = parseMunicipioRow(row);
    if (!parsed) continue;
    const key = normalizeKey(parsed.nome);
    const codigos = byName.get(key) ?? [];
    codigos.push(parsed.codigo);
    byName.set(key, codigos);
  }
  return byName;
}

function normalizeKey(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

// A tabela da Receita não separa por UF (só CODIGO;NOME) — municípios
// homônimos de UFs diferentes existem de verdade (ex.: "IGUATU" aparece duas
// vezes, uma delas no Ceará). Por isso devolvemos TODOS os códigos candidatos
// por nome em vez de escolher um; quem chama filtra pelos que realmente têm
// estabelecimentos com a UF certa (campo presente em cada linha de
// Estabelecimentos, ao contrário de Municipios.zip) — ver
// `import-estabelecimentos.ts`.
//
// Carrega Municipios.zip uma única vez e resolve várias cidades de uma vez,
// pra permitir uma única varredura de Estabelecimentos cobrindo N municípios
// em vez de N varreduras (cada Estabelecimentos*.zip tem dezenas de milhões
// de linhas; reler tudo por cidade seria N vezes mais lento à toa).
export async function resolveMunicipioCodigos(
  nomes: string[],
): Promise<Array<{ nome: string; codigos: string[] }>> {
  const municipios = await loadMunicipios();
  return nomes.map((nome) => {
    const codigos = municipios.get(normalizeKey(nome));
    if (!codigos || codigos.length === 0) notFound(nome);
    return { nome, codigos: codigos! };
  });
}

function notFound(nomeMunicipio: string): never {
  throw new Error(
    `Município "${nomeMunicipio}" não encontrado em Municipios.zip. Confira a grafia oficial usada pela Receita.`,
  );
}
