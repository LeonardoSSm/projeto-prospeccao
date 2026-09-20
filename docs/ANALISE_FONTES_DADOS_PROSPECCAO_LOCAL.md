# Análise de Fontes de Dados e Arquitetura para uma Plataforma de Prospecção Local

**Status:** proposta técnica  
**Atualização:** 20 de setembro de 2026  
**Objetivo:** definir como descobrir, consolidar, enriquecer e consultar empresas locais com baixo custo, controle sobre os dados e possibilidade de evolução comercial.

---

## 1. Resumo executivo

Para uma plataforma de prospecção local, o Google Places é útil, mas não deve ser a fonte principal nem a única dependência. Ele possui boa cobertura de estabelecimentos e dados comerciais atuais, porém opera com cobrança por uso, campos que alteram o SKU faturado e restrições sobre armazenamento e reutilização de conteúdo.

A arquitetura recomendada é criar uma API própria e montar uma base consolidada a partir de múltiplos provedores:

1. **Receita Federal:** base principal de empresas brasileiras, CNPJ, situação cadastral, CNAE, endereço, telefone, e-mail, porte, capital social e outros dados cadastrais.
2. **OpenStreetMap:** coordenadas, pontos de interesse, categorias geográficas e dados de localização.
3. **Sites públicos das próprias empresas:** enriquecimento de site, redes sociais, canais de contato e sinais de presença digital.
4. **Google Places:** enriquecimento opcional e seletivo para leads prioritários, principalmente nota, volume de avaliações, horários e presença no Google Maps.
5. **API própria:** camada unificada que normaliza, deduplica, pontua e entrega os dados ao frontend ou a outros serviços.

A decisão central é:

> Construir a inteligência e a base principal dentro da própria plataforma; usar provedores externos como fontes substituíveis.

---

## 2. O que é o Google Places

O Google Places faz parte do Google Maps Platform e fornece APIs para localizar lugares e obter informações sobre estabelecimentos. Entre os principais recursos estão:

- busca textual, como “clínicas odontológicas em Fortaleza”;
- busca por proximidade;
- detalhes de um estabelecimento;
- autocomplete de endereços e lugares;
- fotos e informações de funcionamento;
- telefone, site, nota e quantidade de avaliações, conforme os campos solicitados.

Exemplo conceitual:

```text
Consulta do usuário
      ↓
Google Places Text Search
      ↓
Place IDs e estabelecimentos
      ↓
Place Details
      ↓
Nome, endereço, telefone, site, nota e horários
```

### 2.1 Pontos fortes

- boa cobertura de empresas abertas ao público;
- dados normalmente mais próximos da experiência real do Google Maps;
- notas, avaliações e horários que não existem na base do CNPJ;
- integração simples por API REST;
- identificação estável pelo `placeId` dentro do ecossistema Google.

### 2.2 Limitações

- cobrança por SKU e volume;
- necessidade de ativar faturamento no Google Cloud;
- campos solicitados podem elevar a categoria de cobrança;
- cotas gratuitas e preços podem mudar;
- dependência de fornecedor;
- restrições contratuais sobre extração em massa, cache, armazenamento e uso do conteúdo;
- não substitui uma base empresarial oficial: um local no Maps pode estar duplicado, desatualizado ou não corresponder diretamente a um CNPJ.

---

## 3. Custos do Google Places

Na tabela oficial consultada em setembro de 2026, o Google cobra por eventos faturáveis e concede uma franquia mensal diferente para cada SKU.

| SKU relevante | Franquia mensal indicada | Preço inicial após a franquia, por 1.000 eventos |
|---|---:|---:|
| Place Details Essentials — IDs Only | Ilimitada | Sem cobrança indicada |
| Text Search Essentials — IDs Only | Ilimitada | Sem cobrança indicada |
| Place Details Essentials | 10.000 | US$ 5,00 |
| Autocomplete Requests | 10.000 | US$ 2,83 |
| Geocoding | 10.000 | US$ 5,00 |
| Nearby Search Pro | 5.000 | US$ 32,00 |
| Text Search Pro | 5.000 | US$ 32,00 |
| Place Details Pro | 5.000 | US$ 17,00 |

Os valores acima são referências atuais, não constantes de arquitetura. O sistema deve tratar preços e limites como configuração externa e revisável.

### 3.1 Como permanecer dentro da franquia gratuita

Não é suficiente criar apenas um alerta de orçamento. Alertas informam que houve consumo; não necessariamente impedem cobranças. O controle recomendado possui quatro camadas:

1. **Quota no Google Cloud:** definir cotas menores que a franquia do SKU.
2. **Limite interno no backend:** bloquear novas chamadas antes da quota externa.
3. **Margem de segurança:** usar, por exemplo, 9.000 chamadas em um SKU com 10.000 eventos gratuitos.
4. **Monitoramento por SKU:** contar separadamente cada tipo de operação.

Exemplo de política:

```yaml
googlePlaces:
  detailsEssentials:
    monthlyHardLimit: 9000
    dailySoftLimit: 290
  enabledFields:
    - id
    - displayName
    - formattedAddress
```

Exemplo de proteção na aplicação:

```java
if (usageService.reachedMonthlyLimit("PLACE_DETAILS_ESSENTIALS")) {
    throw new ProviderQuotaExceededException("Google Places monthly limit reached");
}
```

### 3.2 Uso de FieldMask

Na Places API nova, o sistema deve pedir somente os campos necessários. O conjunto de campos influencia o SKU aplicável. Portanto, uma chamada de descoberta não deve solicitar automaticamente informações avançadas.

Estratégia sugerida:

```text
Etapa 1 — descoberta
Busca somente IDs
      ↓
Salva candidatos ainda não enriquecidos
      ↓
Aplica filtros e score preliminar
      ↓
Etapa 2 — enriquecimento seletivo
Solicita detalhes apenas dos melhores candidatos
```

### 3.3 Segurança da chave

- restringir a chave às APIs realmente utilizadas;
- restringir por IP no backend ou por domínio/aplicação quando aplicável;
- nunca expor chave de backend no frontend;
- usar chaves diferentes por ambiente;
- monitorar consumo anormal;
- revogar e rotacionar credenciais comprometidas.

---

## 4. Alternativas ao Google Places

### 4.1 OpenStreetMap e Overpass API

O OpenStreetMap é uma base cartográfica colaborativa. A Overpass API é uma API de leitura otimizada para selecionar elementos do OSM por região, tipo, tag e proximidade.

Exemplo de consulta Overpass QL para restaurantes em uma área:

```overpass
[out:json][timeout:60];
area["name"="Fortaleza"]["boundary"="administrative"]->.searchArea;
(
  node["amenity"="restaurant"](area.searchArea);
  way["amenity"="restaurant"](area.searchArea);
  relation["amenity"="restaurant"](area.searchArea);
);
out center tags;
```

Dados que podem aparecer:

- nome;
- latitude e longitude;
- categoria OSM;
- endereço;
- telefone;
- site;
- horário de funcionamento;
- redes sociais, quando mapeadas.

#### Vantagens

- dados abertos;
- sem cobrança por evento quando a infraestrutura é própria;
- bom para geografia, coordenadas e pontos de interesse;
- possibilidade de baixar extratos regionais e processar localmente;
- Overpass API e diversos componentes podem ser auto-hospedados.

#### Limitações

- cobertura comercial desigual;
- telefone, e-mail e site nem sempre existem;
- tags podem variar entre contribuidores;
- endpoints públicos não devem ser tratados como infraestrutura garantida para carga comercial intensa;
- é necessário cumprir a licença ODbL e as regras de atribuição.

### 4.2 Dados abertos do CNPJ da Receita Federal

Para empresas brasileiras, essa deve ser a principal fonte de descoberta e segmentação. A base permite trabalhar, entre outros, com:

- CNPJ e indicador de matriz ou filial;
- razão social e nome fantasia;
- situação cadastral;
- data de abertura;
- CNAE principal e secundários;
- endereço;
- telefone e e-mail cadastrados;
- natureza jurídica;
- capital social;
- porte;
- opção pelo Simples Nacional e SIMEI/MEI.

Exemplo de consulta do produto:

```text
Município = Fortaleza
CNAE = atividade odontológica
Situação cadastral = ativa
Possui site = não identificado
```

Resultado esperado:

```json
{
  "cnpj": "00000000000100",
  "legalName": "EMPRESA EXEMPLO LTDA",
  "tradeName": "CLINICA EXEMPLO",
  "status": "ACTIVE",
  "primaryCnae": "8630504",
  "phone": "+55 85 ...",
  "email": "contato@exemplo.com.br",
  "city": "Fortaleza",
  "state": "CE"
}
```

#### Vantagens

- fonte oficial e ampla;
- permite segmentação por CNAE, município, porte e situação;
- boa base para identificar empresas, inclusive as que não aparecem bem no Maps;
- adequada para importação em lote e construção de índice próprio.

#### Limitações

- arquivos volumosos e importação inicial pesada;
- dados cadastrais podem estar desatualizados;
- telefone e e-mail podem estar ausentes ou não servir para prospecção;
- não contém avaliações, popularidade, horário real ou qualidade da presença digital;
- é preciso desenhar atualização incremental ou reimportação periódica.

### 4.3 Nominatim

Nominatim é um geocodificador baseado em dados do OpenStreetMap. Ele converte endereços em coordenadas e faz geocodificação reversa.

O endpoint público da OSM não é apropriado para coleta sistemática de empresas. A política pública estabelece limite máximo absoluto de uma requisição por segundo, exige identificação da aplicação, recomenda cache e proíbe consultas sistemáticas como baixar todos os POIs de uma região. Para volume ou revenda de geocodificação, deve-se usar uma instância própria ou outro provedor.

Uso adequado:

- geocodificar pontualmente endereços de leads;
- reverse geocoding moderado;
- protótipo com baixo tráfego;
- produção com instância própria ou provedor contratado.

### 4.4 Photon

Photon é um geocodificador open source construído sobre OpenStreetMap e OpenSearch. Oferece:

- pesquisa enquanto digita;
- busca multilíngue;
- tolerância a erros;
- filtro por tag OSM;
- filtro por bounding box;
- geocodificação reversa;
- importação e atualização de dados OSM.

É uma opção interessante para autocomplete e busca geográfica auto-hospedada. O servidor de demonstração não oferece garantia de disponibilidade e pode limitar uso intenso. Para produção, o caminho é uma instância própria.

### 4.5 Pelias

Pelias é um geocodificador modular open source que usa Elasticsearch e aceita várias fontes. Além de OSM, pode importar GeoNames, Who's on First, OpenAddresses, CSV próprio e outras bases.

É adequado quando a plataforma precisa:

- combinar várias fontes geográficas;
- manter índices próprios;
- importar dados empresariais internos;
- oferecer autocomplete, busca e reverse geocoding em escala.

Em contrapartida, é uma solução mais complexa de operar do que Photon ou uma integração simples com Nominatim.

### 4.6 Crawlers e sites das próprias empresas

Depois de identificar o domínio oficial, um crawler controlado pode extrair sinais públicos como:

- telefone e WhatsApp informados no site;
- e-mails de contato;
- redes sociais;
- catálogo de serviços;
- existência de formulário de contato;
- tecnologias utilizadas;
- qualidade técnica básica do site;
- presença ou ausência de SSL, responsividade e metadados.

Esse processo deve respeitar `robots.txt`, limites de requisição, termos do site e uma política de retenção. O crawler deve ser uma etapa de enriquecimento, não o mecanismo primário de descoberta.

### 4.7 Outros provedores comerciais

Também é possível criar adaptadores para provedores comerciais de busca, geocodificação ou inteligência empresarial. Eles podem acelerar o lançamento, mas devem ser tratados como módulos substituíveis. Critérios de seleção:

- cobertura no Brasil;
- custo por mil resultados;
- permissão de armazenamento;
- qualidade de telefone e e-mail;
- frequência de atualização;
- suporte a CNPJ;
- limites de uso e SLA;
- facilidade para apagar ou corrigir dados.

---

## 5. Comparação das opções

| Fonte | Melhor uso | Telefone/e-mail | Geolocalização | Avaliações | Custo variável | Pode ser auto-hospedada |
|---|---|---|---|---|---|---|
| Receita Federal | Base empresarial e segmentação | Sim, cobertura variável | Endereço, sem garantia de coordenada | Não | Não por consulta | Base importada localmente |
| OpenStreetMap/Overpass | POIs e dados geográficos | Às vezes | Sim | Não | Não em infraestrutura própria | Sim |
| Nominatim | Geocodificação | Não é o foco | Sim | Não | Não em instância própria | Sim |
| Photon | Busca/autocomplete geográfico | Não é o foco | Sim | Não | Não em instância própria | Sim |
| Pelias | Geocoder multibase avançado | Depende das fontes | Sim | Não | Não em instância própria | Sim |
| Sites das empresas | Enriquecimento digital | Frequentemente | Às vezes | Não | Infraestrutura própria | Sim |
| Google Places | Dados comerciais e sinais do Maps | Frequentemente | Sim | Sim | Sim | Não |

Nenhuma fonte isolada resolve todo o problema. A qualidade vem da combinação, da rastreabilidade da origem e da deduplicação.

---

## 6. Arquitetura recomendada

```text
Receita Federal ───────┐
                      │
OpenStreetMap ─────────┼──> Ingestão ──> Normalização ──> Deduplicação
                      │                                      │
Sites públicos ────────┤                                      ↓
                      │                                PostgreSQL/PostGIS
Google Places ─────────┘                                      │
                                                             ↓
                                                     Score de oportunidade
                                                             │
                                                             ↓
                                                        API Spring Boot
                                                             │
                                      ┌──────────────────────┼─────────────────┐
                                      ↓                      ↓                 ↓
                                  Frontend               Relatórios       Automações
```

### 6.1 Componentes

#### API principal

- Java 21 ou superior;
- Spring Boot;
- Spring Security;
- Spring Data JPA ou acesso otimizado para consultas em lote;
- OpenAPI/Swagger;
- autenticação JWT ou OIDC.

#### Banco

- PostgreSQL como banco principal;
- PostGIS para coordenadas, raio, polígonos e proximidade;
- índices `GIN`, `GiST` e índices compostos para filtros frequentes;
- tabelas de histórico para preservar origem e data de atualização.

#### Busca

Começar com PostgreSQL e busca textual. Adicionar OpenSearch apenas quando volume, autocomplete ou relevância justificarem a complexidade.

#### Fila e jobs

- RabbitMQ, Kafka ou fila gerenciada para enriquecimentos;
- Spring Batch para importação da Receita;
- agendador para atualizações e reprocessamentos;
- jobs idempotentes e retomáveis.

#### Cache e rate limiting

- Redis para cache, locks, quotas e rate limits;
- contadores mensais por provedor e SKU;
- circuit breaker para indisponibilidade externa.

---

## 7. Modelo de dados sugerido

### 7.1 Entidade consolidada

```sql
CREATE TABLE company (
    id                  UUID PRIMARY KEY,
    cnpj                VARCHAR(14),
    legal_name          TEXT,
    trade_name          TEXT,
    registration_status VARCHAR(30),
    primary_cnae        VARCHAR(10),
    opening_date        DATE,
    company_size        VARCHAR(30),
    capital_social      NUMERIC(18,2),
    phone               TEXT,
    email               TEXT,
    website             TEXT,
    street              TEXT,
    street_number       TEXT,
    district            TEXT,
    postal_code         VARCHAR(8),
    city                TEXT,
    state               CHAR(2),
    location            GEOGRAPHY(POINT, 4326),
    opportunity_score   NUMERIC(5,2),
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL
);
```

### 7.2 Identificadores externos

```sql
CREATE TABLE company_external_identity (
    id              UUID PRIMARY KEY,
    company_id      UUID NOT NULL REFERENCES company(id),
    provider        VARCHAR(40) NOT NULL,
    external_id     TEXT NOT NULL,
    confidence      NUMERIC(5,4),
    last_verified_at TIMESTAMPTZ,
    UNIQUE(provider, external_id)
);
```

Exemplos de `provider`: `RFB_CNPJ`, `GOOGLE_PLACES`, `OPENSTREETMAP`.

### 7.3 Proveniência por campo

Não basta manter somente o valor final. O sistema deve saber de onde cada informação veio.

```sql
CREATE TABLE company_attribute_source (
    id            UUID PRIMARY KEY,
    company_id    UUID NOT NULL REFERENCES company(id),
    attribute     VARCHAR(60) NOT NULL,
    value_hash    VARCHAR(64) NOT NULL,
    provider      VARCHAR(40) NOT NULL,
    collected_at  TIMESTAMPTZ NOT NULL,
    confidence    NUMERIC(5,4)
);
```

Isso permite responder:

- qual fonte forneceu o telefone;
- quando o endereço foi verificado;
- por que dois provedores divergem;
- qual valor deve ter prioridade.

### 7.4 Controle de consumo

```sql
CREATE TABLE provider_usage (
    provider       VARCHAR(40) NOT NULL,
    sku            VARCHAR(80) NOT NULL,
    period         CHAR(7) NOT NULL,
    request_count  BIGINT NOT NULL DEFAULT 0,
    hard_limit     BIGINT,
    updated_at     TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (provider, sku, period)
);
```

---

## 8. Deduplicação e vinculação de empresas

O mesmo negócio pode aparecer como CNPJ, nó do OSM, local do Google e domínio web. A plataforma precisa executar *entity resolution*.

### 8.1 Sinais fortes

- CNPJ idêntico;
- telefone normalizado idêntico;
- domínio idêntico;
- e-mail corporativo idêntico;
- `placeId` já associado.

### 8.2 Sinais probabilísticos

- similaridade entre razão social, nome fantasia e nome público;
- distância geográfica;
- endereço normalizado;
- categoria/CNAE compatível;
- DDD e município;
- links cruzados entre site e rede social.

### 8.3 Política recomendada

- correspondência forte: unificação automática;
- correspondência intermediária: fila de revisão;
- correspondência fraca: manter registros separados;
- nunca sobrescrever silenciosamente o dado original;
- registrar score e versão do algoritmo de correspondência.

---

## 9. Score de oportunidade

O score deve representar adequação comercial, não apenas completude cadastral.

Exemplo inicial:

| Critério | Peso sugerido |
|---|---:|
| Empresa ativa | +15 |
| CNAE-alvo | +20 |
| Sem site identificado | +20 |
| Site desatualizado ou tecnicamente fraco | +15 |
| Telefone válido | +10 |
| E-mail válido | +10 |
| Perfil no Google com poucas avaliações | +5 |
| Aberta recentemente | +5 |
| Dados conflitantes ou baixa confiança | −10 |

Exemplo:

```text
Clínica ativa                 +15
CNAE desejado                 +20
Sem site                      +20
Telefone válido               +10
Poucas avaliações              +5
----------------------------------
Score final                    70
```

Os pesos devem ser configuráveis por campanha e avaliados contra conversões reais.

---

## 10. Design da API própria

### 10.1 Consulta de empresas

```http
GET /api/v1/companies?city=fortaleza&state=CE&cnae=8630504&hasWebsite=false&page=0&size=50
```

### 10.2 Consulta geográfica

```http
GET /api/v1/companies/nearby?latitude=-3.7319&longitude=-38.5267&radiusKm=10
```

### 10.3 Detalhes e proveniência

```http
GET /api/v1/companies/{id}
GET /api/v1/companies/{id}/sources
```

### 10.4 Enriquecimento sob demanda

```http
POST /api/v1/companies/{id}/enrichments
Content-Type: application/json

{
  "providers": ["WEBSITE", "GOOGLE_PLACES"],
  "priority": "NORMAL"
}
```

### 10.5 Campanhas

```http
POST /api/v1/campaigns
GET  /api/v1/campaigns/{id}/leads
POST /api/v1/campaigns/{id}/recalculate-scores
```

### 10.6 Contrato de resposta

```json
{
  "id": "0f68792a-6cd4-4aef-a81e-70c2504b911f",
  "cnpj": "00000000000100",
  "legalName": "EMPRESA EXEMPLO LTDA",
  "tradeName": "CLINICA EXEMPLO",
  "contact": {
    "phone": "+5585000000000",
    "email": "contato@exemplo.com.br",
    "website": null
  },
  "address": {
    "city": "Fortaleza",
    "state": "CE",
    "latitude": -3.7319,
    "longitude": -38.5267
  },
  "opportunityScore": 70,
  "sources": ["RFB_CNPJ", "OPENSTREETMAP"],
  "lastUpdatedAt": "2026-09-20T12:00:00Z"
}
```

---

## 11. Pipeline recomendado

### 11.1 Descoberta

1. importar os dados do CNPJ;
2. filtrar estabelecimentos ativos;
3. mapear CNAEs para segmentos comerciais;
4. carregar POIs relevantes do OSM;
5. gerar candidatos e identidades externas.

### 11.2 Normalização

- remover máscara do CNPJ e CEP;
- normalizar telefones para E.164;
- limpar e validar e-mails;
- canonicalizar domínios;
- padronizar município e UF por códigos oficiais;
- normalizar endereço;
- converter coordenadas para SRID 4326.

### 11.3 Deduplicação

- regras determinísticas primeiro;
- similaridade probabilística depois;
- revisão para casos ambíguos;
- persistência das evidências.

### 11.4 Enriquecimento

1. tentar localizar domínio oficial;
2. analisar site;
3. consultar OSM/geocoder;
4. calcular score preliminar;
5. usar Google Places somente para candidatos com maior prioridade;
6. recalcular score final.

### 11.5 Entrega

- busca e filtros;
- mapas e clusters;
- listas de leads;
- exportação autorizada;
- dashboards de cobertura e conversão;
- integração com CRM, e-mail e outras automações.

---

## 12. Estratégia de implementação

### Fase 1 — MVP sem Google Places

- importar uma região ou um conjunto de municípios da Receita Federal;
- criar filtros por cidade, situação e CNAE;
- implementar busca no PostgreSQL;
- criar score básico;
- expor API REST;
- importar pontos do OSM de forma controlada.

**Objetivo:** validar se os leads da base oficial têm valor antes de contratar enriquecimento.

### Fase 2 — Geolocalização e deduplicação

- habilitar PostGIS;
- geocodificar endereços;
- associar registros do CNPJ a POIs;
- implementar proveniência;
- criar revisão de correspondências ambíguas.

### Fase 3 — Presença digital

- crawler com fila e rate limit;
- detecção de site, redes e canais de contato;
- análise técnica simples;
- score por presença digital.

### Fase 4 — Google Places opcional

- criar interface `PlacesProvider`;
- implementar adaptador Google;
- solicitar IDs e campos mínimos;
- enriquecer somente leads prioritários;
- aplicar quota interna e externa;
- medir ganho real de qualidade.

### Fase 5 — Escala e comercialização

- OpenSearch se necessário;
- importações incrementais;
- isolamento por cliente/tenant;
- auditoria e métricas;
- planos e limites de consumo;
- provedores alternativos plugáveis.

---

## 13. Interfaces para evitar dependência de fornecedor

```java
public interface CompanyDiscoveryProvider {
    List<CompanyCandidate> discover(DiscoveryQuery query);
}

public interface CompanyEnrichmentProvider {
    EnrichmentResult enrich(Company company, EnrichmentRequest request);
}

public interface GeocodingProvider {
    Optional<GeoPoint> geocode(Address address);
    Optional<Address> reverseGeocode(GeoPoint point);
}
```

Implementações possíveis:

```text
CompanyDiscoveryProvider
├── ReceitaFederalDiscoveryProvider
├── OpenStreetMapDiscoveryProvider
└── GooglePlacesDiscoveryProvider

GeocodingProvider
├── PhotonGeocodingProvider
├── NominatimGeocodingProvider
├── PeliasGeocodingProvider
└── GoogleGeocodingProvider
```

Essa separação permite desligar um provedor, trocar preços ou alterar políticas sem reescrever o domínio.

---

## 14. Operação e observabilidade

Métricas mínimas:

- requisições por provedor e SKU;
- custo estimado do mês;
- quota restante;
- taxa de sucesso e latência;
- leads descobertos por fonte;
- taxa de deduplicação;
- cobertura de telefone, e-mail, site e coordenadas;
- ganho de cobertura após cada enriquecimento;
- custo por lead útil;
- taxa de conversão por origem.

Alertas:

- 70%, 85% e 95% da quota;
- aumento anormal de chamadas;
- custo estimado acima do orçamento;
- queda de cobertura de um provedor;
- importação atrasada;
- aumento de erros ou bloqueios.

---

## 15. Riscos e decisões

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados cadastrais desatualizados | Contato inválido | validar por outras fontes e registrar data |
| Cobertura incompleta do OSM | Empresas sem coordenada | geocodificação e múltiplos provedores |
| Custo inesperado no Google | Cobrança | quotas, bloqueio interno e campos mínimos |
| Dependência de endpoint público | Instabilidade ou bloqueio | cache, extratos e infraestrutura própria |
| Duplicação de empresas | Lead repetido | entity resolution e identidade externa |
| Importação pesada do CNPJ | Alto tempo e armazenamento | processamento em lote e recorte regional inicial |
| Regras de uso incompatíveis | Restrição de armazenamento | proveniência e política específica por provedor |
| Crawler bloqueado | Cobertura reduzida | limites, identificação e fontes alternativas |

---

## 16. Recomendação final

A melhor arquitetura para esta plataforma é híbrida:

```text
Receita Federal = identidade empresarial e segmentação
OpenStreetMap    = contexto geográfico e POIs
Site da empresa = presença digital e contatos públicos
Google Places   = enriquecimento premium e seletivo
API própria     = domínio, normalização, score e produto
```

O Google Places agrega valor, mas não deve controlar a existência do produto. O MVP pode começar com Receita Federal, PostgreSQL/PostGIS e OSM. O Google deve entrar somente quando houver uma pergunta mensurável, por exemplo:

> A inclusão de nota, avaliações e dados atualizados do Maps aumenta suficientemente a qualidade ou conversão dos leads para justificar o custo?

Se a resposta for positiva, o enriquecimento deve ser limitado aos melhores candidatos. Se for negativa, a plataforma continua funcional com a base própria.

---

## 17. Fontes oficiais e projetos citados

- [Google Maps Platform — tabela de preços](https://developers.google.com/maps/billing-and-pricing/pricing?hl=pt-br)
- [Google Places API — uso e faturamento](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing?hl=pt-br)
- [Google Maps Platform — práticas de segurança de APIs](https://developers.google.com/maps/api-security-best-practices)
- [Receita Federal — Repositório de Dados Abertos](https://www.gov.br/receitafederal/dados)
- [Receita Federal — leiaute da base CNPJ](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/convenios-e-transferencias/compartilhamento-de-bases-de-dados-2013-decreto-no-8-789-2016/leiaute-das-bases/dados-da-base-cnpj)
- [OpenStreetMap Wiki — Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OSM Foundation — política de uso do Nominatim público](https://operations.osmfoundation.org/policies/nominatim/)
- [Photon — repositório oficial](https://github.com/komoot/photon)
- [Pelias — repositório oficial](https://github.com/pelias/pelias)

---

## 18. Próxima decisão sugerida

Antes de escrever a integração com qualquer provedor pago, implementar uma prova de conceito com:

1. um município;
2. dois ou três CNAEs;
3. empresas ativas;
4. PostgreSQL/PostGIS;
5. importação da Receita;
6. associação básica com OSM;
7. endpoint de pesquisa;
8. score inicial;
9. relatório de cobertura de telefone, e-mail, site e coordenadas.

Essa prova de conceito mostrará, com dados reais, quais lacunas justificam Google Places, crawler, Photon, Pelias ou outro provedor.
