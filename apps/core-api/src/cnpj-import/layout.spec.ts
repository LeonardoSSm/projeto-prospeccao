import { parseEmpresaRow, parseEstabelecimentoRow, parseMunicipioRow } from "./layout";

// Linha sintética no formato oficial (30 colunas) — um "Dentista Exemplo Ltda"
// filial ativa em Fortaleza/CE, CNAE 8630504, com CNAE secundário e telefone.
const SAMPLE_ROW = [
  "00000000", // 0 CNPJ_BASICO
  "0001", // 1 CNPJ_ORDEM
  "00", // 2 CNPJ_DV
  "1", // 3 IDENTIFICADOR_MATRIZ_FILIAL (matriz)
  "CLINICA EXEMPLO", // 4 NOME_FANTASIA
  "02", // 5 SITUACAO_CADASTRAL (ativa)
  "20200115", // 6 DATA_SITUACAO_CADASTRAL
  "00", // 7 MOTIVO_SITUACAO_CADASTRAL
  "", // 8 NOME_CIDADE_EXTERIOR
  "", // 9 PAIS
  "20180301", // 10 DATA_INICIO_ATIVIDADE
  "8630504", // 11 CNAE_FISCAL_PRINCIPAL
  "8690999,4772500", // 12 CNAE_FISCAL_SECUNDARIA
  "RUA", // 13 TIPO_LOGRADOURO
  "DOS EXEMPLOS", // 14 LOGRADOURO
  "123", // 15 NUMERO
  "SALA 4", // 16 COMPLEMENTO
  "CENTRO", // 17 BAIRRO
  "60000000", // 18 CEP
  "CE", // 19 UF
  "1389", // 20 MUNICIPIO (código Receita p/ Fortaleza, ilustrativo)
  "85", // 21 DDD_1
  "999998888", // 22 TELEFONE_1
  "", // 23 DDD_2
  "", // 24 TELEFONE_2
  "", // 25 DDD_FAX
  "", // 26 TELEFONE_FAX
  "CONTATO@EXEMPLO.COM.BR", // 27 CORREIO_ELETRONICO
  "", // 28 SITUACAO_ESPECIAL
  "", // 29 DATA_SITUACAO_ESPECIAL
];

describe("parseEstabelecimentoRow", () => {
  it("monta o CNPJ completo e decodifica os campos principais", () => {
    const result = parseEstabelecimentoRow(SAMPLE_ROW);

    expect(result).toMatchObject({
      cnpj: "00000000000100",
      matrizFilial: "MATRIZ",
      nomeFantasia: "CLINICA EXEMPLO",
      situacaoCadastral: "ATIVA",
      dataSituacao: "2020-01-15",
      cnaeFiscalPrincipal: "8630504",
      cnaesSecundarios: ["8690999", "4772500"],
      logradouro: "RUA DOS EXEMPLOS",
      numero: "123",
      bairro: "CENTRO",
      cep: "60000000",
      municipioCodigo: "1389",
      uf: "CE",
      ddd1: "85",
      telefone1: "999998888",
      email: "contato@exemplo.com.br",
      dataInicioAtividade: "2018-03-01",
    });
  });

  it("identifica filial quando o indicador não é 1", () => {
    const row = [...SAMPLE_ROW];
    row[3] = "2";
    expect(parseEstabelecimentoRow(row)?.matrizFilial).toBe("FILIAL");
  });

  it("retorna null quando faltam colunas essenciais", () => {
    expect(parseEstabelecimentoRow(["00000000"])).toBeNull();
  });

  it("retorna null quando o CNAE principal está vazio", () => {
    const row = [...SAMPLE_ROW];
    row[11] = "";
    expect(parseEstabelecimentoRow(row)).toBeNull();
  });

  it("trata situação cadastral desconhecida sem quebrar", () => {
    const row = [...SAMPLE_ROW];
    row[5] = "99";
    expect(parseEstabelecimentoRow(row)?.situacaoCadastral).toBe("DESCONHECIDA");
  });
});

describe("parseEmpresaRow", () => {
  it("converte capital social com vírgula para ponto decimal", () => {
    const result = parseEmpresaRow(["00000000", "EMPRESA EXEMPLO LTDA", "2062", "49", "15000,50", "03", ""]);
    expect(result).toEqual({
      cnpjBasico: "00000000",
      razaoSocial: "EMPRESA EXEMPLO LTDA",
      porte: "PEQUENO",
      capitalSocial: "15000.50",
    });
  });

  it("retorna null sem razão social", () => {
    expect(parseEmpresaRow(["00000000", ""])).toBeNull();
  });
});

describe("parseMunicipioRow", () => {
  it("faz o parse de código e nome", () => {
    expect(parseMunicipioRow(["1389", "FORTALEZA"])).toEqual({ codigo: "1389", nome: "FORTALEZA" });
  });

  it("retorna null com nome vazio", () => {
    expect(parseMunicipioRow(["1389", ""])).toBeNull();
  });
});
