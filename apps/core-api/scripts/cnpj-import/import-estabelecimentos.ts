import * as path from "node:path";
import { parse } from "csv-parse";
import { parseEstabelecimentoRow, type ParsedEstabelecimento } from "../../src/cnpj-import/layout";
import { DATA_DIR, ESTABELECIMENTOS_FILES } from "./config";
import { openSingleEntryStream } from "./zip-stream";

// Passe 1: varre todos os Estabelecimentos*.zip (Brasil inteiro, misturado —
// não vem particionado por UF) filtrando por município + CNAE, sem nunca
// carregar um arquivo inteiro em memória. Cada arquivo tem alguns GB
// descompactados; só o que passa no filtro fica em memória (algumas centenas
// a milhares de linhas para um piloto de uma cidade).
export async function collectEstabelecimentos(
  municipioCodigo: string,
  cnaes: string[],
  onProgress: (fileName: string, matched: number, scanned: number) => void,
): Promise<ParsedEstabelecimento[]> {
  const cnaeSet = new Set(cnaes);
  const matches: ParsedEstabelecimento[] = [];

  for (const fileName of ESTABELECIMENTOS_FILES) {
    const filePath = path.join(DATA_DIR, fileName);
    const zipStream = await openSingleEntryStream(filePath);
    const parser = zipStream.pipe(parse({ delimiter: ";", relax_quotes: true, encoding: "latin1" }));

    let scanned = 0;
    for await (const row of parser as AsyncIterable<string[]>) {
      scanned += 1;
      const parsed = parseEstabelecimentoRow(row);
      if (!parsed) continue;
      if (parsed.municipioCodigo !== municipioCodigo) continue;
      const matchesCnae =
        cnaeSet.has(parsed.cnaeFiscalPrincipal) || parsed.cnaesSecundarios.some((code) => cnaeSet.has(code));
      if (!matchesCnae) continue;
      if (parsed.situacaoCadastral !== "ATIVA") continue;

      matches.push(parsed);
    }
    onProgress(fileName, matches.length, scanned);
  }

  return matches;
}
