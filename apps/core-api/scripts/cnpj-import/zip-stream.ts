import type { Readable } from "node:stream";
import unzipper from "unzipper";

// Cada arquivo da Receita (Estabelecimentos0.zip, Empresas0.zip, Municipios.zip...)
// contém um único arquivo dentro, com nome interno "esquisito" (ex.:
// "K3241.K03200Y0.D50111.ESTABELE") — por isso pegamos sempre a primeira
// entrada, sem depender do nome. `unzipper.Open.file` só lê o central
// directory do zip (rápido, não descompacta nada ainda); `.stream()` do
// arquivo devolve os bytes já descompactados em streaming, sem carregar o
// arquivo inteiro (multi-GB) em memória.
export async function openSingleEntryStream(zipPath: string): Promise<Readable> {
  const directory = await unzipper.Open.file(zipPath);
  if (directory.files.length === 0) {
    throw new Error(`Arquivo zip vazio ou inválido: ${zipPath}`);
  }
  return directory.files[0].stream();
}
