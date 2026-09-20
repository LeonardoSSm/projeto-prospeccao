// Tradução interna category (label estável usado por Niche/Campaign, ex.:
// "DENTIST") -> CNAE oficial (o que a Receita Federal realmente indexa). Fica
// aqui, dentro do provider, e não no Niche/Campaign, porque é um detalhe de
// COMO esta fonte específica resolve uma categoria — o mock resolve a mesma
// categoria de um jeito completamente diferente (gerando nomes fictícios), e
// nenhum dos dois deveria vazar essa lógica para fora do próprio adaptador.
//
// Validar contra Cnaes.zip (tabela oficial da Receita) antes de confiar cegamente
// nestes códigos em produção — são os mais usuais para cada atividade, mas a
// fonte oficial é a palavra final.
export const CNAE_BY_CATEGORY: Record<string, string[]> = {
  DENTIST: ["8630504"],
  LAWYER: ["6911701"],
  RESTAURANT: ["5611201"],
  GYM: ["9313100"],
  BEAUTY_SALON: ["9602501"],
  AESTHETIC_CLINIC: ["9602502"],
  PET_SHOP: ["4789005"],
  ACCOUNTING: ["6920601"],
  REAL_ESTATE: ["6821801"],
  AUTO_REPAIR: ["4520001"],
};
