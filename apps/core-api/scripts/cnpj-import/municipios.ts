import * as path from "node:path";
import { parse } from "csv-parse/sync";
import { parseMunicipioRow } from "../../src/cnpj-import/layout";
import { DATA_DIR } from "./config";
import { openSingleEntryStream } from "./zip-stream";

// Municipios.zip é pequeno (~5.500 linhas) — dá pra carregar por inteiro em
// memória, ao contrário de Estabelecimentos/Empresas.
async function loadMunicipios(): Promise<Map<string, string>> {
  const stream = await openSingleEntryStream(path.join(DATA_DIR, "Municipios.zip"));
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  const content = Buffer.concat(chunks).toString("latin1");

  const rows: string[][] = parse(content, { delimiter: ";", relax_quotes: true });
  const byNameUf = new Map<string, string>();
  for (const row of rows) {
    const parsed = parseMunicipioRow(row);
    if (parsed) byNameUf.set(normalizeKey(parsed.nome), parsed.codigo);
  }
  return byNameUf;
}

function normalizeKey(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

// A tabela da Receita não separa por UF explicitamente no nome — municípios
// homônimos de UFs diferentes existem, mas são raros para os nichos deste
// piloto; se aparecer ambiguidade real, resolver manualmente é preferível a
// adivinhar.
export async function resolveMunicipioCodigo(nomeMunicipio: string): Promise<string> {
  const municipios = await loadMunicipios();
  const codigo = municipios.get(normalizeKey(nomeMunicipio));
  if (!codigo) {
    throw new Error(
      `Município "${nomeMunicipio}" não encontrado em Municipios.zip. Confira a grafia oficial usada pela Receita.`,
    );
  }
  return codigo;
}
