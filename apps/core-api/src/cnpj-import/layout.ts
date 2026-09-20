// Layout dos arquivos abertos de CNPJ da Receita Federal (docs/ANALISE_FONTES_DADOS_PROSPECCAO_LOCAL.md
// seção 4.2). Formato estável há anos, `;`-separado, sem cabeçalho, ISO-8859-1
// (Latin-1), um arquivo ESTABELECIMENTOS por "lote" contendo o Brasil inteiro
// misturado — nada disto vem particionado por UF.
//
// Validado contra o dump real de 2026-09 (import completo de Fortaleza,
// 52.503 estabelecimentos, 100% de casamento de razão social via Empresas) —
// os índices abaixo batem com a documentação pública ("Metadados_dados_
// abertos_cnpj.pdf" da própria Receita). Se um mês futuro vier com uma coluna
// a mais/a menos, é aqui que ajusta.

export const SITUACAO_CADASTRAL_LABEL: Record<string, string> = {
  "01": "NULA",
  "02": "ATIVA",
  "03": "SUSPENSA",
  "04": "INAPTA",
  "08": "BAIXADA",
};

export const PORTE_LABEL: Record<string, string> = {
  "00": "NAO_INFORMADO",
  "01": "MICRO",
  "03": "PEQUENO",
  "05": "DEMAIS",
};

export interface ParsedEstabelecimento {
  cnpj: string;
  matrizFilial: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: string;
  dataSituacao: string | null;
  cnaeFiscalPrincipal: string;
  cnaesSecundarios: string[];
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  municipioCodigo: string;
  uf: string;
  ddd1: string | null;
  telefone1: string | null;
  ddd2: string | null;
  telefone2: string | null;
  email: string | null;
  dataInicioAtividade: string | null;
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/^"|"$/g, "");
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function toIsoDate(yyyymmdd: string | null): string | null {
  if (!yyyymmdd || yyyymmdd.length !== 8 || yyyymmdd === "00000000") return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

// Colunas do arquivo ESTABELECIMENTOS, na ordem oficial (0-indexed):
// 0 CNPJ_BASICO, 1 CNPJ_ORDEM, 2 CNPJ_DV, 3 IDENTIFICADOR_MATRIZ_FILIAL,
// 4 NOME_FANTASIA, 5 SITUACAO_CADASTRAL, 6 DATA_SITUACAO_CADASTRAL,
// 7 MOTIVO_SITUACAO_CADASTRAL, 8 NOME_CIDADE_EXTERIOR, 9 PAIS,
// 10 DATA_INICIO_ATIVIDADE, 11 CNAE_FISCAL_PRINCIPAL, 12 CNAE_FISCAL_SECUNDARIA,
// 13 TIPO_LOGRADOURO, 14 LOGRADOURO, 15 NUMERO, 16 COMPLEMENTO, 17 BAIRRO,
// 18 CEP, 19 UF, 20 MUNICIPIO, 21 DDD_1, 22 TELEFONE_1, 23 DDD_2,
// 24 TELEFONE_2, 25 DDD_FAX, 26 TELEFONE_FAX, 27 CORREIO_ELETRONICO,
// 28 SITUACAO_ESPECIAL, 29 DATA_SITUACAO_ESPECIAL
//
// Observação: a razão social não está neste arquivo (vive em EMPRESAS,
// indexado por CNPJ_BASICO) — quem chama este parser decide se quer
// complementar com import-empresas.ts ou usar o nome fantasia como fallback.
export function parseEstabelecimentoRow(row: string[]): ParsedEstabelecimento | null {
  if (row.length < 30) return null;

  const cnpjBasico = row[0]?.trim();
  const cnpjOrdem = row[1]?.trim();
  const cnpjDv = row[2]?.trim();
  const cnaeFiscalPrincipal = clean(row[11]);
  const municipioCodigo = clean(row[20]);
  if (!cnpjBasico || !cnpjOrdem || !cnpjDv || !cnaeFiscalPrincipal || !municipioCodigo) {
    return null;
  }

  const cnaesSecundarios = (clean(row[12]) ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0);

  return {
    cnpj: `${cnpjBasico}${cnpjOrdem}${cnpjDv}`,
    matrizFilial: clean(row[3]) === "1" ? "MATRIZ" : "FILIAL",
    razaoSocial: null,
    nomeFantasia: clean(row[4]),
    situacaoCadastral: SITUACAO_CADASTRAL_LABEL[clean(row[5]) ?? ""] ?? "DESCONHECIDA",
    dataSituacao: toIsoDate(clean(row[6])),
    cnaeFiscalPrincipal,
    cnaesSecundarios,
    logradouro: [clean(row[13]), clean(row[14])].filter(Boolean).join(" ") || null,
    numero: clean(row[15]),
    complemento: clean(row[16]),
    bairro: clean(row[17]),
    cep: clean(row[18]),
    municipioCodigo,
    uf: clean(row[19]) ?? "",
    ddd1: clean(row[21]),
    telefone1: clean(row[22]),
    ddd2: clean(row[23]),
    telefone2: clean(row[24]),
    email: clean(row[27])?.toLowerCase() ?? null,
    dataInicioAtividade: toIsoDate(clean(row[10])),
  };
}

export interface ParsedEmpresa {
  cnpjBasico: string;
  razaoSocial: string;
  porte: string | null;
  capitalSocial: string | null;
}

// Colunas do arquivo EMPRESAS: 0 CNPJ_BASICO, 1 RAZAO_SOCIAL,
// 2 NATUREZA_JURIDICA, 3 QUALIFICACAO_RESPONSAVEL, 4 CAPITAL_SOCIAL
// (decimal com vírgula), 5 PORTE_EMPRESA, 6 ENTE_FEDERATIVO_RESPONSAVEL.
export function parseEmpresaRow(row: string[]): ParsedEmpresa | null {
  const cnpjBasico = row[0]?.trim();
  const razaoSocial = clean(row[1]);
  if (!cnpjBasico || !razaoSocial) return null;

  const capitalRaw = clean(row[4]);
  return {
    cnpjBasico,
    razaoSocial,
    porte: PORTE_LABEL[clean(row[5]) ?? ""] ?? null,
    capitalSocial: capitalRaw ? capitalRaw.replace(",", ".") : null,
  };
}

// Arquivo MUNICIPIOS: só CODIGO;NOME (código interno da Receita, não IBGE).
export function parseMunicipioRow(row: string[]): { codigo: string; nome: string } | null {
  const codigo = row[0]?.trim();
  const nome = clean(row[1]);
  if (!codigo || !nome) return null;
  return { codigo, nome };
}
