import * as path from "node:path";

// Fica fora do repositório de propósito (ver .gitignore) — cada mês soma uns
// 7GB e é baixado sob demanda por quem for rodar a importação.
export const DATA_DIR = path.resolve(__dirname, "../../.data/cnpj");

// A Receita migrou o portal para um Nextcloud próprio ("SERPRO+") — não é
// mais um índice HTTP estático. O compartilhamento público abaixo
// (https://arquivos.receitafederal.gov.br/index.php/s/gn672Ad4CF8N6TK) expõe
// os arquivos via WebDAV, que aceita GET direto sem autenticação. Confirme o
// mês vigente navegando em Dados > Cadastros > CNPJ antes de rodar — pastas
// antigas saem do ar, e o token do compartilhamento pode mudar se a Receita
// recriar o link.
const SHARE_TOKEN = "gn672Ad4CF8N6TK";

export function baseUrl(mes: string): string {
  return `https://arquivos.receitafederal.gov.br/public.php/dav/files/${SHARE_TOKEN}/Dados/Cadastros/CNPJ/${mes}`;
}

export const ESTABELECIMENTOS_FILES = Array.from({ length: 10 }, (_, i) => `Estabelecimentos${i}.zip`);
export const EMPRESAS_FILES = Array.from({ length: 10 }, (_, i) => `Empresas${i}.zip`);
// O pacote atual não publica uma tabela de referência de CNAE separada — os
// códigos usados por cnae-by-category.ts vêm direto da documentação oficial,
// não de um arquivo baixado.
export const REFERENCE_FILES = ["Municipios.zip"];

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args[match[1]] = match[2];
  }
  return args;
}
