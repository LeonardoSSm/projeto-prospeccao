import * as path from "node:path";
import { parse } from "csv-parse";
import { parseEmpresaRow, type ParsedEmpresa } from "../../src/cnpj-import/layout";
import { DATA_DIR, EMPRESAS_FILES } from "./config";
import { openSingleEntryStream } from "./zip-stream";

// Passe 2: razão social, porte e capital social vivem em EMPRESAS (indexado
// por CNPJ_BASICO), não em ESTABELECIMENTOS. Só nos interessam os
// CNPJ_BASICO que sobreviveram ao filtro do passe 1 — por isso recebemos o
// conjunto já pronto em vez de reprocessar tudo sem filtro.
export async function enrichWithEmpresas(
  cnpjBasicosNeeded: Set<string>,
  onProgress: (fileName: string, found: number) => void,
): Promise<Map<string, ParsedEmpresa>> {
  const byCnpjBasico = new Map<string, ParsedEmpresa>();

  for (const fileName of EMPRESAS_FILES) {
    if (byCnpjBasico.size >= cnpjBasicosNeeded.size) break; // já achou todo mundo

    const filePath = path.join(DATA_DIR, fileName);
    const zipStream = await openSingleEntryStream(filePath);
    const parser = zipStream.pipe(parse({ delimiter: ";", relax_quotes: true, encoding: "latin1" }));

    for await (const row of parser as AsyncIterable<string[]>) {
      const parsed = parseEmpresaRow(row);
      if (!parsed || !cnpjBasicosNeeded.has(parsed.cnpjBasico)) continue;
      byCnpjBasico.set(parsed.cnpjBasico, parsed);
    }
    onProgress(fileName, byCnpjBasico.size);
  }

  return byCnpjBasico;
}
