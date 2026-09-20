import * as path from "node:path";

// Fica fora do repositório de propósito (ver .gitignore) — os arquivos somam
// dezenas de GB e são baixados sob demanda por quem for rodar a importação.
export const DATA_DIR = path.resolve(__dirname, "../../.data/cnpj");

// A Receita publica os dados por mês de referência, em pastas que rotacionam
// (snapshots antigos saem do ar). Confirme o mês vigente em
// https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/ antes
// de rodar — o default aqui é só um ponto de partida razoável.
export function baseUrl(mes: string): string {
  return `https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/${mes}`;
}

export const ESTABELECIMENTOS_FILES = Array.from({ length: 10 }, (_, i) => `Estabelecimentos${i}.zip`);
export const EMPRESAS_FILES = Array.from({ length: 10 }, (_, i) => `Empresas${i}.zip`);
export const REFERENCE_FILES = ["Municipios.zip", "Cnaes.zip"];

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args[match[1]] = match[2];
  }
  return args;
}
