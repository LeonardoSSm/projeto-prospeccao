import * as path from "node:path";
import { parse } from "csv-parse";
import { parseEstabelecimentoRow, type ParsedEstabelecimento } from "../../src/cnpj-import/layout";
import { DATA_DIR, ESTABELECIMENTOS_FILES } from "./config";
import { openSingleEntryStream } from "./zip-stream";

// Passe 1: varre todos os Estabelecimentos*.zip (Brasil inteiro, misturado —
// não vem particionado por UF) filtrando por município + CNAE, sem nunca
// carregar um arquivo inteiro em memória. Cada arquivo tem alguns GB
// descompactados; só o que passa no filtro fica em memória (algumas centenas
// a milhares de linhas por cidade).
//
// Aceita várias cidades de uma vez (`municipioCodigos`) pra permitir cobrir
// N municípios em uma única varredura dos ~73M linhas totais, em vez de N
// varreduras completas — relevante porque cada arquivo já é lido do disco
// inteiro independente de quantas cidades filtramos nele.
//
// `uf` é obrigatório e filtra adicionalmente por estado: o código de
// município da Receita não é único nacionalmente por nome (Municipios.zip só
// tem CODIGO;NOME, sem UF), então `municipioCodigos` pode conter candidatos
// de UFs diferentes para nomes homônimos (ex.: "IGUATU" existe no Ceará e em
// outro estado, com códigos distintos) — o campo UF de cada linha de
// Estabelecimentos é que resolve a ambiguidade de verdade.
export async function collectEstabelecimentos(
  municipioCodigos: Set<string>,
  uf: string,
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
      if (!municipioCodigos.has(parsed.municipioCodigo)) continue;
      if (parsed.uf !== uf) continue;
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
