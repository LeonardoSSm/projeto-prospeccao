# PROSPECTOR — Blueprint Técnico do Sistema

> **Status:** Proposta arquitetural para implementação  
> **Versão do documento:** 2.1.0  
> **Sistema:** Plataforma de descoberta, análise e qualificação de empresas para venda de criação ou reestruturação de sites  
> **Última atualização:** 2026-09-20 — autenticação OIDC real via Keycloak (ADR-015), substituindo o header `X-Organization-Id` temporário; stack de backend/frontend migrada para NestJS + React (ADR-011 a ADR-014)  
> **Público-alvo:** Arquitetura, Backend, Frontend, Dados, DevOps, QA, Produto e Operação Comercial

Este documento é a fonte técnica de referência do sistema. Decisões que contrariem este blueprint devem ser registradas por meio de ADR (*Architecture Decision Record*) e refletidas em uma nova versão deste arquivo.

## 1. Visão Geral do Sistema (Overview)

### 1.1 Propósito

O **Prospector** automatiza a descoberta e a qualificação de empresas que possam contratar criação, reconstrução ou otimização de sites. O sistema pesquisa empresas por cidade, raio e segmento; consolida dados públicos; identifica se existe site; executa auditorias técnicas; calcula uma pontuação comercial; produz diagnóstico assistido por IA; e organiza o avanço do lead em um funil de CRM.

O produto deve reduzir o trabalho manual de pesquisa e concentrar a atuação humana nos leads com maior combinação de:

- necessidade digital demonstrável;
- atividade comercial verificável;
- capacidade aparente de conversão;
- informações de contato válidas;
- evidências técnicas que sustentem uma abordagem personalizada.

### 1.2 Objetivos de negócio

| Objetivo | Métrica inicial | Meta do MVP |
| --- | --- | --- |
| Automatizar descoberta | Empresas persistidas por execução | 100 por campanha piloto |
| Identificar oportunidade | Leads corretamente classificados como com/sem site | ≥ 95% na amostra validada |
| Reduzir pesquisa manual | Tempo médio de pesquisa por lead | < 2 minutos de trabalho humano |
| Priorizar leads | Leads considerados comercialmente relevantes no Top 10 | ≥ 7 de 10 após revisão humana |
| Produzir argumento de venda | Diagnósticos aprovados sem reescrita estrutural | ≥ 80% |
| Criar rastreabilidade | Leads com origem, auditoria, score e histórico | 100% |

As metas são hipóteses de validação e devem ser recalibradas após as primeiras três campanhas reais.

### 1.3 Escopo funcional

O sistema deve oferecer:

1. criação de campanhas de prospecção por região, categoria e filtros mínimos;
2. coleta de empresas em provedores autorizados, APIs oficiais e fontes públicas configuradas;
3. normalização e deduplicação dos registros encontrados;
4. enriquecimento de telefone, WhatsApp, endereço, redes sociais, avaliações e site;
5. classificação inicial: `NO_WEBSITE` (sem site), `SOCIAL_ONLY` (somente redes sociais), `HAS_WEBSITE` (com site), `SITE_UNREACHABLE` (site indisponível) ou `UNKNOWN` (indeterminado);
6. auditoria de sites com requisição HTTP, Playwright e Lighthouse;
7. armazenamento de screenshots e relatórios técnicos;
8. cálculo versionado de *lead score* e explicação dos fatores;
9. diagnóstico comercial produzido por IA a partir de evidências estruturadas;
10. geração de rascunho de proposta e mensagem de abordagem;
11. CRM com status, responsável, atividades, observações e próxima ação;
12. revisão e aprovação humana antes de qualquer contato externo;
13. filtros, ordenação e exportação de leads;
14. trilha de auditoria das operações relevantes.

### 1.4 Escopo do MVP

O MVP deve comprovar o fluxo abaixo para um segmento e uma cidade:

```text
Campanha → 100 empresas → deduplicação → detecção de site
→ auditoria dos sites existentes → score → diagnóstico
→ seleção dos 10 melhores leads
```

Incluído no MVP:

- um provedor de descoberta de empresas;
- importação manual por CSV como contingência;
- persistência em PostgreSQL;
- auditoria HTTP, Playwright e Lighthouse;
- score determinístico e versionado;
- geração de diagnóstico por IA;
- tela de lista e detalhe do lead;
- movimentação manual no funil;
- Docker Compose para ambiente local;
- observabilidade mínima e pipeline de CI.

### 1.5 Fora do escopo inicial

- envio totalmente autônomo e irrestrito de mensagens;
- discador telefônico;
- faturamento, contratos ou cobrança;
- construtor automático de sites;
- *web scraping* genérico de qualquer domínio sem adaptador específico;
- treinamento de modelo próprio;
- aplicativo móvel nativo;
- arquitetura de microsserviços completa;
- marketplace de leads;
- enriquecimento com dados pessoais não necessários ao processo comercial.

### 1.6 Premissas e restrições

- A descoberta usará prioritariamente APIs e integrações autorizadas. Cada conector deve respeitar contrato, cotas e termos da fonte.
- A auditoria só processará URLs públicas e deverá possuir limites de tempo, tamanho, redirecionamento e concorrência.
- Conteúdo gerado por IA é rascunho, nunca fonte primária. Toda afirmação comercial deve apontar para evidência persistida.
- Nenhuma mensagem externa será enviada no MVP sem ação explícita de aprovação.
- Todos os registros de negócio pertencem a uma organização, permitindo evolução futura para SaaS multi-tenant.
- O idioma inicial é `pt-BR`; textos e formatos devem ser internacionalizáveis.
- Datas são persistidas em UTC e apresentadas no fuso do usuário.
- Valores de score são comparáveis apenas quando calculados pela mesma versão da política.

### 1.7 Personas

| Persona | Responsabilidade | Necessidade principal | Permissões típicas |
| --- | --- | --- | --- |
| Administrador | Configura organização, usuários, conectores e regras | Governança e operação segura | Acesso total da organização |
| Analista de prospecção | Cria campanhas e revisa dados/auditorias | Encontrar oportunidades reais rapidamente | Campanhas, leads, auditorias e diagnósticos |
| Vendedor | Trabalha o funil e conduz contatos | Contexto comercial e próxima ação | CRM, propostas e contatos aprovados |
| Gestor comercial | Acompanha produtividade e conversão | Visibilidade do funil e qualidade dos leads | Leitura global e relatórios |
| Operador técnico | Investiga falhas de coleta/auditoria | Reprocessamento e evidências operacionais | Jobs, logs técnicos e reexecução |
| Auditor/Viewer | Consulta resultados e histórico | Rastreabilidade sem mutação | Somente leitura |

### 1.8 Casos de uso principais

| ID | Caso de uso | Ator principal | Resultado esperado |
| --- | --- | --- | --- |
| UC-01 | Criar campanha | Analista | Critérios persistidos e campanha pronta para execução |
| UC-02 | Executar descoberta | Analista/Sistema | Empresas importadas com origem rastreável |
| UC-03 | Deduplicar empresa | Sistema | Um lead canônico, preservando todas as fontes |
| UC-04 | Classificar presença digital | Sistema | Estado de site e redes sociais registrado |
| UC-05 | Auditar site | Sistema/Operador | Métricas, screenshot e achados técnicos persistidos |
| UC-06 | Calcular score | Sistema | Nota, faixa, versão e fatores explicáveis |
| UC-07 | Revisar lead | Analista | Dados corrigidos/confirmados e lead qualificado ou descartado |
| UC-08 | Gerar diagnóstico | Analista/Sistema | Diagnóstico baseado em evidências e com versão do prompt/modelo |
| UC-09 | Gerar proposta | Vendedor | Rascunho comercial personalizado e editável |
| UC-10 | Aprovar contato | Vendedor/Gestor | Mensagem marcada como autorizada para envio |
| UC-11 | Atualizar funil | Vendedor | Status, atividade e próxima ação registrados |
| UC-12 | Reprocessar falha | Operador | Novo job ligado à tentativa anterior, sem duplicar efeitos |

### 1.9 Fluxo de negócio principal

```mermaid
flowchart TD
    A["Definir campanha"] --> B["Descobrir empresas"]
    B --> C["Normalizar e deduplicar"]
    C --> D{"Possui site?"}
    D -- "Não" --> E["Calcular score"]
    D -- "Sim" --> F["Executar auditoria"]
    F --> E
    E --> G["Gerar diagnóstico"]
    G --> H["Revisar e trabalhar no CRM"]
```

### 1.10 Requisitos não funcionais

| Categoria | Requisito |
| --- | --- |
| Disponibilidade | 99,5% mensal para API e dashboard após entrada em produção |
| Desempenho | p95 < 400 ms para leituras comuns da API, excluindo tarefas assíncronas |
| Escalabilidade | Auditoria deve escalar por quantidade de workers sem alterar o núcleo |
| Consistência | Operações transacionais do CRM usam consistência forte no PostgreSQL |
| Resiliência | Jobs possuem retry com *backoff*, DLQ e idempotência |
| Segurança | TLS em trânsito, segredos fora do repositório e isolamento por organização |
| Auditabilidade | Alterações de status, score, diagnóstico, proposta e contato devem ser rastreáveis |
| Observabilidade | Logs correlacionados, métricas técnicas, métricas de negócio e traces distribuídos |
| Manutenibilidade | Limites modulares validados por testes de arquitetura |
| Recuperação | RPO ≤ 24 h no MVP e ≤ 1 h após estabilização; RTO ≤ 4 h |
| Acessibilidade | Dashboard visando WCAG 2.2 AA nos fluxos essenciais |

### 1.11 Critérios de sucesso do MVP

O MVP estará funcionalmente validado quando:

- importar 100 empresas sem criação de duplicatas óbvias;
- identificar corretamente a presença de site em pelo menos 95% de uma amostra revisada;
- concluir a auditoria de pelo menos 90% dos sites públicos e válidos;
- explicar 100% dos scores por fatores persistidos;
- produzir Top 10 com pelo menos sete leads considerados abordáveis por revisão humana;
- reconstruir a história de qualquer lead a partir de fontes, snapshots, jobs e atividades;
- impedir envio externo de mensagem não aprovada.

## 2. Arquitetura de Software & Decisões Tecnológicas

### 2.1 Padrão arquitetural

Será adotado um **Monólito Modular orientado a domínio**, acompanhado por workers especializados assíncronos. O backend em **NestJS (Node.js/TypeScript)** concentra regras transacionais e comerciais. O processamento de navegador fica em um worker Node.js/TypeScript independente por exigir Chromium, Playwright e Lighthouse — dependências com perfil de CPU/memória e ciclo de release diferentes do núcleo transacional, ainda que ambos compartilhem a mesma linguagem e o mesmo monorepo.

Essa escolha evita a complexidade prematura de microsserviços, preserva transações simples no núcleo e permite escalar separadamente o componente de maior consumo de CPU e memória. Compartilhar TypeScript entre API, worker e frontend simplifica ferramentas, tipos e revisão de código, mas não elimina a necessidade de isolar o processo que hospeda o Chromium: falhas de navegador, vazamento de memória e picos de CPU do Lighthouse não podem comprometer a disponibilidade da API.

Princípios:

- módulos com fronteiras explícitas e dependências unidirecionais;
- arquitetura hexagonal em cada módulo relevante;
- domínio independente de HTTP, persistência, mensageria e provedores externos;
- comunicação interna síncrona por interfaces de aplicação;
- comunicação com workers por eventos/comandos assíncronos;
- PostgreSQL como fonte de verdade;
- Outbox transacional para publicação confiável;
- APIs externas encapsuladas por adaptadores;
- operações demoradas representadas por jobs consultáveis.

### 2.2 Módulos do domínio

| Módulo | Responsabilidade | Entidades principais |
| --- | --- | --- |
| Identity & Access | Organizações, usuários, memberships e permissões | Organization, User, Membership |
| Campaigns | Critérios e execuções de descoberta | Campaign, CampaignRun |
| Discovery | Conectores, fontes, importação e normalização | LeadSource, RawSourceRecord |
| Leads | Lead canônico, contatos, presença digital e deduplicação | Lead, LeadContact, LeadPresence |
| Auditing | Solicitação, execução e resultado da auditoria | WebsiteSnapshot, WebsiteAudit, AuditFinding |
| Scoring | Políticas, cálculo e explicação da pontuação | ScorePolicy, LeadScore, ScoreFactor |
| Intelligence | Diagnóstico e proposta assistidos por IA | AIAnalysis, Proposal, PromptTemplate |
| CRM | Funil, responsável, atividades e próxima ação | PipelineStage, CRMActivity |
| Outreach | Rascunho, aprovação, envio e opt-out | OutreachMessage, ContactSuppression |
| Operations | Jobs, idempotência, auditoria e eventos de integração | Job, OutboxEvent, AuditLog |

### 2.3 Diagrama conceitual de arquitetura

```mermaid
flowchart TD
    UI["Dashboard Web\nReact (Vite)"] --> API["Core API\nNestJS"]
    N8N["n8n\nOrquestração operacional"] --> API
    API --> PG[("PostgreSQL")]
    API --> REDIS[("Redis")]
    API --> MQ["RabbitMQ"]
    MQ --> WORKER["Audit Worker\nNode.js + Playwright"]
    WORKER --> OBJ[("S3/MinIO")]
    WORKER --> API
    API --> EXT["Places, e-mail e LLM\nvia adaptadores"]
    API --> OBS["OpenTelemetry\nLogs, métricas e traces"]
    WORKER --> OBS
```

### 2.4 Componentes e responsabilidades

#### Core API

- expõe a API REST;
- aplica autenticação, autorização e isolamento por organização;
- gerencia campanhas, leads, CRM, score e conteúdo gerado;
- persiste transações e publica eventos por Outbox;
- agenda auditorias sem executar navegador no processo HTTP;
- valida callbacks/resultados do worker;
- fornece dados para o dashboard.

#### Audit Worker

- consome comandos `website.audit.requested`;
- valida URL, DNS, IP de destino e política contra SSRF;
- executa sondagem HTTP e navegação isolada;
- roda Lighthouse em contexto controlado;
- captura screenshot e metadados permitidos;
- grava artefatos em armazenamento de objetos;
- publica resultado ou falha técnica;
- não decide score nem altera CRM.

#### n8n

- agenda campanhas e integra fluxos de baixa criticidade;
- chama APIs oficiais do Prospector em vez de escrever diretamente no banco;
- pode importar resultados de provedores ou iniciar jobs;
- não contém regra de negócio canônica;
- workflows devem ser exportados e versionados no repositório.

#### Dashboard Web

- lista campanhas e leads;
- apresenta score explicável, auditorias e evidências;
- permite revisão humana, correções e ações de CRM;
- gera rascunhos e solicita aprovação;
- nunca acessa banco, RabbitMQ ou provedores diretamente.

### 2.5 Stack tecnológica

As versões abaixo são baselines do projeto, não uma obrigação de atualização automática para toda nova versão disponível.

| Camada | Tecnologia | Baseline | Justificativa |
| --- | --- | --- | --- |
| Runtime backend/worker | Node.js | 22 LTS | LTS, ecossistema maduro, mesma linguagem do worker e do frontend |
| Framework backend | NestJS | 10.x | Módulos, DI, guards/interceptors, validação e microservices (AMQP) integrados |
| Gerenciador de pacotes | pnpm (workspaces) | versão definida em `packageManager` | Monorepo único para api, worker e web; instalação reprodutível e cache eficiente |
| API | NestJS (Express/Fastify) + `@nestjs/swagger` | OpenAPI 3.1 | Contrato padronizado e geração de clientes/documentação |
| Validação | `class-validator` + `class-transformer` | integrado ao Nest | DTOs tipados com validação declarativa nas bordas da API |
| Persistência | Prisma ORM | versão travada no lockfile | Cliente tipado, migrações versionadas e bom suporte a JSONB/Postgres |
| Migração | Prisma Migrate | gerenciado pelo projeto | Migrações SQL auditáveis, forward-only e executáveis no pipeline |
| Banco | PostgreSQL | 16+ | ACID, JSONB, índices avançados e extensões maduras |
| Cache/coordenação | Redis | 7+ | cache curto, rate limiting e locks com TTL; não é fonte de verdade |
| Mensageria | RabbitMQ | 4.x | filas de trabalho, retries, DLQ e operação adequada ao volume inicial; integrado via `@nestjs/microservices` |
| Worker | Node.js + TypeScript | Node 22 LTS | Integração nativa com Playwright/Lighthouse |
| Browser | Playwright + Chromium | versão travada no lockfile | Automação consistente e imagem de container controlada |
| Auditoria | Lighthouse | versão travada no lockfile | Métricas objetivas de performance, SEO, acessibilidade e boas práticas |
| Frontend | React + TypeScript (Vite) | versão LTS/suportada fixada no lockfile | SPA produtiva, build rápido e ecossistema consolidado, sem SSR no MVP |
| Roteamento | React Router | versão travada | Navegação client-side na ausência de roteamento por arquivo do Next.js |
| UI | Tailwind CSS + shadcn/ui | versão travada | Componentes acessíveis e personalizáveis sem forte dependência visual |
| Estado remoto | TanStack Query | versão travada | Cache, invalidação e estados de requisição no cliente |
| Orquestração | n8n | versão fixada por imagem | Integrações rápidas sem deslocar regras canônicas do backend |
| Objetos | MinIO local / S3 em produção | API S3 | Screenshots e relatórios fora do banco relacional |
| Identidade | Provedor OIDC + Passport (`passport-jwt`) | configurável | Evita implementar armazenamento de senha e MFA no produto |
| Observabilidade | OpenTelemetry (SDK Node) | protocolo OTLP | Instrumentação independente do fornecedor |
| Métricas | Prometheus + Grafana | imagens fixadas | Padrão operacional e bom suporte ao ecossistema |
| Logs | Loki ou backend OTLP | configurável | Consulta centralizada de logs JSON |
| Traces | Tempo ou backend OTLP | configurável | Correlação entre API, broker e worker |
| Containers | Docker + Compose | Docker Engine 27+ | Paridade local/CI/produção; api, worker e web também rodam containerizados em desenvolvimento |

### 2.6 Decisões arquiteturais registradas

| ADR | Decisão | Estado | Consequência principal |
| --- | --- | --- | --- |
| ADR-001 | Monólito modular no núcleo | Aceita | Menor custo operacional e extração futura por módulo |
| ADR-002 | Worker de navegador separado | Aceita | Isola Chromium e permite escala independente |
| ADR-003 | PostgreSQL como fonte de verdade | Aceita | Consistência transacional e modelo relacional auditável |
| ADR-004 | RabbitMQ para jobs pesados | Aceita | Processamento assíncrono com retry/DLQ |
| ADR-005 | Outbox transacional | Aceita | Evita dual write entre banco e broker |
| ADR-006 | REST + OpenAPI 3.1 | Aceita | Contratos simples para dashboard, n8n e integrações |
| ADR-007 | OIDC externo | Aceita | Reduz superfície de autenticação do produto |
| ADR-008 | Score determinístico antes da IA | Aceita | Priorização reproduzível e explicável |
| ADR-009 | IA por adaptador e saída estruturada | Aceita | Troca de modelo/provedor sem contaminar domínio |
| ADR-010 | Aprovação humana para envio | Aceita | Controle operacional e rastreabilidade no MVP |
| ADR-011 | NestJS como framework do backend | Aceita | Monólito modular em TypeScript, DI nativa e integração AMQP sem trocar de linguagem em relação ao worker |
| ADR-012 | React (SPA via Vite) sem SSR no frontend | Aceita | Build e deploy mais simples; API já resolve dados server-side, dispensando SSR no MVP |
| ADR-013 | Prisma como ORM e ferramenta de migração | Aceita | Cliente tipado e migrações versionadas coerentes com um stack 100% TypeScript |
| ADR-014 | Ambiente de desenvolvimento inteiramente em containers | Aceita | `docker compose up` sobe api, worker, web e infraestrutura juntos; onboarding não depende de toolchain local |
| ADR-015 | OIDC via SPA (Authorization Code + PKCE) com Bearer JWT direto na API, sem BFF | Aceita | Elimina o `X-Organization-Id` temporário; API stateless valida o token via JWKS e deriva `organizationId` da Membership do usuário. Troca a mitigação extra de um BFF por simplicidade — aceitável para o MVP, revisitável se a superfície de XSS do dashboard crescer. Keycloak roda em Docker só para desenvolvimento local; produção aponta as mesmas variáveis para qualquer IdP OIDC |
| ADR-016 | Receita Federal (CNPJ) como fonte primária de descoberta, antes de Google Places | Aceita | Dado aberto e gratuito, sem chave de API nem cobrança por evento (`docs/ANALISE_FONTES_DADOS_PROSPECCAO_LOCAL.md`). Implementado como mais um `PlacesProvider` (`ReceitaFederalPlacesProvider`) atrás da mesma interface do mock — Campaigns/Discovery/Leads não sabem a diferença. Importação é um script offline (`apps/core-api/scripts/cnpj-import/`), nunca uma chamada ao vivo: os arquivos da Receita são dumps mensais (~6-7GB, Brasil inteiro por arquivo), não uma API de busca. Validado com dado real: Fortaleza importada (52.503 estabelecimentos, 10 nichos), primeira campanha real trouxe 30 dentistas de verdade |

Novos ADRs devem usar `docs/adr/NNNN-titulo.md`, contendo contexto, decisão, alternativas, consequências e status.

### 2.7 Fluxos síncronos e assíncronos

Síncronos:

- login e autorização;
- CRUD de campanhas;
- consulta e edição de leads;
- atualização de estágio do CRM;
- filtros e relatórios leves;
- aprovação de proposta/mensagem.

Assíncronos:

- descoberta em provedor externo;
- importação em lote;
- auditoria com browser;
- recálculo em massa de scores;
- geração por IA;
- exportações volumosas;
- envio de mensagens aprovado;
- expiração e limpeza de artefatos.

### 2.8 Eventos de domínio e integração

| Evento (`eventType`) | Produtor | Consumidor típico |
| --- | --- | --- |
| `campaign.run.requested` | Campaigns | Discovery |
| `lead.discovered` | Discovery | Leads/Deduplication |
| `lead.canonicalized` | Leads | Auditing/Scoring |
| `website.audit.requested` | Auditing | Audit Worker |
| `website.audit.completed` | Audit Worker | Auditing/Scoring |
| `website.audit.failed` | Audit Worker | Operations |
| `lead.score.requested` | Leads/Auditing | Scoring |
| `lead.score.calculated` | Scoring | Intelligence/CRM |
| `ai.analysis.requested` | Intelligence | AI Adapter Worker |
| `proposal.approved` | Intelligence | Outreach |
| `outreach.send.requested` | Outreach | Channel Adapter |

Todo evento possui `eventId`, `eventType`, `eventVersion`, `occurredAt`, `organizationId`, `correlationId`, `causationId` e `payload`. A versão fica **exclusivamente** no campo `eventVersion` (inteiro incremental); `eventType` nunca carrega sufixo de versão no nome, evitando a duplicidade entre nome e campo. Nome de fila/routing key no broker é uma decisão de infraestrutura separada e pode incluir um sufixo de versão próprio (ver [4.14](#414-contrato-de-mensagem-amqp)) sem que isso implique nova versão semântica do evento. Consumidores mantêm uma *inbox* ou chave idempotente para impedir efeitos duplicados.

### 2.9 Estratégia de evolução

Um módulo só deve ser extraído para serviço independente quando houver pelo menos um dos critérios:

- escala ou perfil de recurso incompatível com o núcleo;
- ciclo de implantação realmente independente;
- requisito de isolamento de falha;
- equipe proprietária distinta;
- fronteira de dados estável e mensurável.

O primeiro candidato natural é `Auditing`; `Discovery` pode ser o segundo. CRM e Scoring devem permanecer no monólito enquanto compartilharem transações e equipe.

## 3. Modelagem de Dados & Banco de Dados

### 3.1 Convenções gerais

- Chaves primárias: UUIDv7 gerado pela aplicação.
- Nomes: `snake_case`, tabelas no plural e timestamps com sufixo `_at`.
- Datas: `timestamptz` em UTC.
- Valores monetários futuros: `numeric(19,4)` + código ISO da moeda.
- Campos flexíveis de fornecedor: `jsonb`, sem substituir colunas consultadas frequentemente.
- Concorrência otimista: coluna `version bigint` nas entidades editáveis.
- Exclusão lógica apenas onde houver justificativa de negócio; caso contrário, status explícito ou exclusão física auditada.
- Todas as tabelas multi-tenant possuem `organization_id` e seus índices começam por essa coluna.
- E-mail, domínio, telefone e URL possuem versões normalizadas para busca/deduplicação.
- Dados brutos de fornecedor são imutáveis e possuem política de retenção.

### 3.2 Diagrama de Entidade-Relacionamento

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ MEMBERSHIPS : contains
    USERS ||--o{ MEMBERSHIPS : joins
    ORGANIZATIONS ||--o{ CAMPAIGNS : owns
    CAMPAIGNS ||--o{ CAMPAIGN_RUNS : executes
    CAMPAIGN_RUNS ||--o{ LEAD_SOURCES : discovers
    ORGANIZATIONS ||--o{ LEADS : owns
    LEADS ||--o{ LEAD_SOURCES : aggregates
    LEADS ||--o{ LEAD_CONTACTS : has
    LEADS ||--o{ WEBSITE_SNAPSHOTS : observes
    WEBSITE_SNAPSHOTS ||--o{ WEBSITE_AUDITS : evaluates
    WEBSITE_AUDITS ||--o{ AUDIT_FINDINGS : contains
    LEADS ||--o{ LEAD_SCORES : receives
    LEAD_SCORES ||--o{ SCORE_FACTORS : explains
    SCORE_POLICIES ||--o{ LEAD_SCORES : "versiona (por policy_version)"
    LEADS ||--o{ AI_ANALYSES : receives
    PROMPT_TEMPLATES ||--o{ AI_ANALYSES : "versiona (por prompt_version)"
    LEADS ||--o{ PROPOSALS : receives
    LEADS ||--o{ CRM_ACTIVITIES : records
    LEADS ||--o{ OUTREACH_MESSAGES : receives
    ORGANIZATIONS ||--o{ CONTACT_SUPPRESSIONS : maintains
    ORGANIZATIONS ||--o{ JOBS : runs
    ORGANIZATIONS ||--o{ AUDIT_LOGS : records

    ORGANIZATIONS {
        uuid id PK
        varchar name
        varchar slug UK
        varchar status
        timestamptz created_at
    }
    USERS {
        uuid id PK
        varchar oidc_subject UK
        varchar email
        varchar display_name
        timestamptz created_at
    }
    MEMBERSHIPS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar role
        varchar status
    }
    CAMPAIGNS {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar category
        jsonb geographic_filter
        jsonb discovery_filters
        varchar status
    }
    CAMPAIGN_RUNS {
        uuid id PK
        uuid campaign_id FK
        varchar status
        integer discovered_count
        integer accepted_count
        timestamptz started_at
    }
    LEADS {
        uuid id PK
        uuid organization_id FK
        varchar legal_name
        varchar trade_name
        varchar category
        varchar city
        varchar website_status
        varchar crm_stage
        integer current_score
        uuid assigned_user_id FK
    }
    LEAD_SOURCES {
        uuid id PK
        uuid lead_id FK
        uuid campaign_run_id FK
        varchar provider
        varchar external_id
        jsonb raw_payload
        timestamptz collected_at
    }
    LEAD_CONTACTS {
        uuid id PK
        uuid lead_id FK
        varchar type
        varchar value
        varchar normalized_value
        boolean primary_contact
        varchar verification_status
    }
    WEBSITE_SNAPSHOTS {
        uuid id PK
        uuid lead_id FK
        varchar requested_url
        varchar final_url
        integer http_status
        varchar content_hash
        timestamptz captured_at
    }
    WEBSITE_AUDITS {
        uuid id PK
        uuid website_snapshot_id FK
        varchar status
        varchar engine_version
        integer performance_score
        integer accessibility_score
        integer seo_score
        integer best_practices_score
        jsonb technical_metrics
        jsonb features_detected
        varchar report_object_key
        varchar screenshot_object_key
        timestamptz created_at
    }
    AUDIT_FINDINGS {
        uuid id PK
        uuid website_audit_id FK
        varchar code
        varchar severity
        varchar category
        jsonb evidence
    }
    SCORE_POLICIES {
        uuid id PK
        varchar version UK
        text description
        jsonb factors_config
        timestamptz effective_from
        timestamptz effective_to
        varchar status
    }
    LEAD_SCORES {
        uuid id PK
        uuid lead_id FK
        varchar policy_version
        integer raw_score
        integer total_score
        varchar band
        timestamptz calculated_at
    }
    SCORE_FACTORS {
        uuid id PK
        uuid lead_score_id FK
        varchar factor_code
        integer points
        jsonb evidence
    }
    PROMPT_TEMPLATES {
        uuid id PK
        varchar kind
        varchar version UK
        text content
        varchar status
        timestamptz created_at
    }
    AI_ANALYSES {
        uuid id PK
        uuid organization_id FK
        uuid lead_id FK
        varchar kind
        varchar status
        varchar model_name
        varchar prompt_version
        jsonb input_snapshot
        jsonb output
        varchar review_status
        integer tokens_used
        integer latency_ms
        float estimated_cost_usd
        timestamptz created_at
    }
    PROPOSALS {
        uuid id PK
        uuid lead_id FK
        integer revision
        varchar status
        text content
        uuid approved_by FK
        timestamptz approved_at
        timestamptz created_at
    }
    CRM_ACTIVITIES {
        uuid id PK
        uuid lead_id FK
        varchar activity_type
        text summary
        timestamptz occurred_at
        timestamptz next_action_at
    }
    OUTREACH_MESSAGES {
        uuid id PK
        uuid organization_id FK
        uuid lead_id FK
        varchar channel
        varchar status
        text content
        varchar recipient_value
        uuid approved_by FK
        varchar rejected_reason
        varchar failure_reason
        timestamptz sent_at
        timestamptz created_at
        timestamptz updated_at
    }
    CONTACT_SUPPRESSIONS {
        uuid id PK
        uuid organization_id FK
        varchar channel
        varchar normalized_value_hash
        varchar reason
        timestamptz created_at
    }
    JOBS {
        uuid id PK
        uuid organization_id FK
        varchar type
        varchar status
        varchar idempotency_key
        integer attempt_count
        jsonb payload
    }
    AUDIT_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid actor_user_id FK
        varchar action
        varchar resource_type
        uuid resource_id
        jsonb changes
        timestamptz occurred_at
    }
```

### 3.3 Tabelas principais

#### `organizations`, `users` e `memberships`

Definem o tenant e o acesso. `users.oidc_subject` referencia o `sub` do provedor de identidade. Um usuário pode participar de mais de uma organização com papel diferente.

Índices e restrições:

- `organizations(slug)` único;
- `users(oidc_subject)` único;
- `users(lower(email))` para suporte operacional, sem usar e-mail como identidade imutável;
- `memberships(organization_id, user_id)` único;
- `memberships(organization_id, role, status)` para autorização e administração.

#### `campaigns` e `campaign_runs`

`campaigns` armazena a intenção reutilizável; `campaign_runs` representa cada execução e congela uma cópia dos filtros usados naquele momento. Alterar uma campanha não modifica a semântica de execuções anteriores.

Campos críticos adicionais:

- `provider_config_id` ou lista de provedores habilitados;
- `filters_snapshot jsonb` em `campaign_runs`;
- contadores de descobertos, aceitos, duplicados, falhos e auditados;
- `requested_by`, `started_at`, `finished_at` e `failure_reason`.

Índices:

- `campaigns(organization_id, status, updated_at desc)`;
- `campaign_runs(campaign_id, created_at desc)`;
- índice parcial em `campaign_runs(status)` para estados `QUEUED` e `RUNNING`.

#### `leads`

É o registro canônico da empresa. Não deve conter diretamente todo dado recebido de fornecedores. Dados de origem permanecem em `lead_sources`.

Campos recomendados:

- nomes legal e comercial;
- categoria canônica e categorias originais;
- endereço estruturado, coordenadas e *geohash*;
- domínio e URL canônica;
- situação do site;
- rating e quantidade de reviews mais recentes;
- estágio de CRM, responsável e próxima ação;
- score atual apenas como projeção de leitura rápida;
- `data_quality_status` e `reviewed_at`;
- `version` para concorrência otimista.

Índices:

```sql
CREATE INDEX idx_leads_org_stage_score
    ON leads (organization_id, crm_stage, current_score DESC, updated_at DESC);

CREATE INDEX idx_leads_org_city_category
    ON leads (organization_id, city_normalized, category);

CREATE UNIQUE INDEX uq_leads_org_domain
    ON leads (organization_id, normalized_domain)
    WHERE normalized_domain IS NOT NULL AND merged_into_id IS NULL;

CREATE INDEX idx_leads_next_action
    ON leads (organization_id, next_action_at)
    WHERE next_action_at IS NOT NULL AND crm_stage NOT IN ('WON', 'LOST');
```

#### `lead_sources`

Preserva origem e dado bruto. A unicidade `(organization_id, provider, external_id)` impede importar a mesma entidade externa duas vezes. Quando uma fonte reaparece, atualiza-se `last_seen_at` e cria-se nova versão do payload apenas se houver mudança relevante.

O payload bruto deve ter retenção menor que o lead canônico. Nunca deve ser usado diretamente pela interface sem filtragem.

#### `lead_contacts`

Armazena `PHONE`, `WHATSAPP`, `EMAIL`, `INSTAGRAM`, `FACEBOOK` e outros canais. `normalized_value` segue regras por tipo. Campos `source_id`, `confidence`, `verification_status` e `last_verified_at` permitem rastrear qualidade.

Restrição recomendada:

```sql
CREATE UNIQUE INDEX uq_lead_contact_value
    ON lead_contacts (lead_id, type, normalized_value)
    WHERE deleted_at IS NULL;
```

#### `website_snapshots`, `website_audits` e `audit_findings`

Um snapshot congela o estado observável de uma URL em uma data. Uma auditoria referencia exatamente um snapshot e uma versão do engine. Isso permite comparar mudanças sem sobrescrever história.

Métricas consultadas com frequência permanecem em colunas; o relatório Lighthouse completo fica em objeto comprimido e é referenciado por `report_object_key`. `technical_metrics` contém valores menores como LCP, CLS, INP, TTFB, tamanho transferido e número de requisições.

Índices:

- `website_snapshots(lead_id, captured_at desc)`;
- `website_audits(website_snapshot_id, created_at desc)`;
- `website_audits(status, created_at)` parcial para pendentes;
- `audit_findings(website_audit_id, severity, category)`;
- `audit_findings(code)` para análises agregadas.

#### `score_policies`, `lead_scores` e `score_factors`

`score_policies` guarda versão, vigência e configuração imutável. `lead_scores` é apêndice histórico. `score_factors` explica cada parcela do total. `lead_scores.policy_version` referencia `score_policies.version` por rótulo semântico, não por FK física — uma política já vigente nunca é editada, apenas sucedida por uma nova versão.

Exemplo de política inicial:

| Fator | Condição | Pontos |
| --- | --- | ---: |
| `NO_WEBSITE` | Nenhum site identificado | +40 |
| `SOCIAL_ONLY` | Presença digital restrita a rede social | +20 |
| `RATING_HIGH` | Rating ≥ 4,5 e reviews suficientes | +10 |
| `REVIEWS_HIGH` | Reviews ≥ 100 | +10 |
| `PERFORMANCE_LOW` | Lighthouse Performance < 50 | +15 |
| `SEO_LOW` | Lighthouse SEO < 60 | +10 |
| `NO_WHATSAPP_CTA` | Nenhum CTA de WhatsApp detectado | +10 |
| `NOT_MOBILE_FRIENDLY` | Critério mobile reprovado | +20 |
| `NO_HTTPS` | Navegação final sem HTTPS válido | +20 |
| `SITE_UNREACHABLE` | Falha persistente atribuída ao site | +25 |
| `LOW_COMMERCIAL_SIGNAL` | Poucos sinais de atividade | −15 |
| `DO_NOT_CONTACT` | Bloqueio de contato | Score comercial exibido, mas lead inelegível |

Faixas iniciais: `LOW` 0–30, `REVIEW` 31–50, `INTERESTING` 51–70 e `PRIORITY` 71–100. O total deve ser limitado a 0–100 para apresentação, mantendo `raw_score` para análise.

#### `prompt_templates`, `ai_analyses` e `proposals`

`prompt_templates` guarda o texto e o esquema de saída de cada versão de prompt por `kind` (ex.: `COMMERCIAL_DIAGNOSIS`), com `version` imutável após publicação — a mesma disciplina de versionamento aplicada a `score_policies`. Cada geração em `ai_analyses` preserva:

- snapshot de entrada redigido;
- versão do prompt (`prompt_version`, referenciando `prompt_templates.version` por rótulo, sem FK física) e esquema de saída;
- fornecedor e modelo lógico;
- parâmetros relevantes;
- uso de tokens, latência e custo estimado;
- resultado estruturado;
- status de revisão e autor da decisão.

Propostas são revisionadas. Uma aprovação sempre aponta para uma revisão específica. Editar uma proposta aprovada cria nova revisão e invalida a aprovação anterior.

#### `crm_activities`, `outreach_messages` e `contact_suppressions`

`crm_activities` é um log de interações e decisões. O estágio atual fica projetado em `leads`, mas toda mudança gera atividade e `audit_log`.

`outreach_messages` usa a máquina de estados:

```text
DRAFT → PENDING_APPROVAL → APPROVED → QUEUED → SENT
   └──────────────→ REJECTED        └──────→ FAILED
```

Não é permitido transicionar diretamente de `DRAFT` para `SENT`. Antes de sair de `APPROVED` para `QUEUED`, o canal e o valor normalizado do destinatário são checados contra `contact_suppressions`; um contato suprimido força a mensagem para `REJECTED`.

`contact_suppressions` armazena apenas `channel` e `normalized_value_hash` (hash do valor normalizado do contato, nunca o valor em claro) por organização, evitando reter dado pessoal desnecessário enquanto ainda impede reimportação e novo contato após opt-out (ver [5.7](#57-lgpdgdpr-e-minimização)).

#### `jobs`, `outbox_events` e `audit_logs`

- `jobs`: estado visível de tarefas assíncronas, tentativas, erro sanitizado e progresso;
- `outbox_events`: eventos gravados na mesma transação da mudança de domínio;
- `audit_logs`: quem fez o quê, quando e sobre qual recurso.

`outbox_events` deve ter índices em `(status, available_at)` e particionamento/limpeza por data após crescimento. `idempotency_key` é única dentro de organização e tipo de job.

### 3.4 Deduplicação e identidade do lead

A deduplicação combina sinais fortes e fracos:

1. correspondência exata por ID do provedor;
2. domínio normalizado;
3. telefone normalizado;
4. identificador fiscal, quando legítimo e disponível;
5. nome normalizado + endereço/geolocalização;
6. similaridade probabilística, sempre sujeita a revisão quando abaixo do limiar alto.

Resultados:

- `MATCH`: vincula nova fonte ao lead existente;
- `NEW`: cria lead;
- `POSSIBLE_MATCH`: cria pendência de revisão;
- `MERGED`: redireciona lead duplicado para `merged_into_id` e preserva histórico.

Merges devem ser transacionais, auditados e reversíveis por operação administrativa específica. Referências são movidas para o lead canônico sem apagar a entidade anterior.

### 3.5 Migração e versionamento

Será utilizado **Prisma Migrate** com migrações SQL *forward-only* geradas a partir de `schema.prisma` e versionadas no repositório:

```text
apps/core-api/prisma/
├── schema.prisma
└── migrations/
    ├── 20260101000000_create_identity_tables/
    ├── 20260102000000_create_campaigns_and_leads/
    ├── 20260103000000_create_audit_tables/
    ├── 20260104000000_create_scoring_tables/
    └── 20260105000000_create_crm_and_outreach/
```

Regras:

- nunca editar migração versionada já aplicada fora do ambiente local;
- cada PR com mudança de entidade inclui migração correspondente (`prisma migrate dev`);
- a aplicação não roda `prisma migrate deploy` no boot; produção executa a migração em job/init container separado antes do rollout;
- alterações destrutivas seguem *expand/contract*;
- índices pesados em produção usam `CREATE INDEX CONCURRENTLY`, editando manualmente o SQL gerado pela migração (fora de transação, já que Prisma aplica cada migração em uma transação por padrão);
- migrações são testadas partindo de banco vazio e de snapshot da versão anterior;
- rollback de aplicação não depende de rollback automático de schema;
- backups e restauração são testados periodicamente.

Exemplo *expand/contract*:

1. adicionar coluna nova anulável;
2. publicar aplicação que escreve nas duas representações;
3. executar backfill idempotente em lotes;
4. publicar leitura da coluna nova;
5. validar métricas e integridade;
6. remover coluna antiga em release posterior.

### 3.6 Backup, retenção e ciclo de vida

| Dado | Retenção inicial | Observação |
| --- | --- | --- |
| Lead e CRM | Enquanto houver finalidade comercial ou obrigação aplicável | Sujeito a anonimização/exclusão |
| Payload bruto de fonte | 90 dias | Configurável; reduzir dados não utilizados |
| Screenshots | 180 dias | Preservar apenas quando necessários como evidência |
| Relatórios Lighthouse | 180 dias | Métricas consolidadas podem permanecer |
| Logs de aplicação | 30 dias | Sem payloads sensíveis completos |
| Audit logs | 1 ano | Acesso restrito e integridade protegida |
| Eventos processados | 30–90 dias | Conforme necessidade de reprocessamento |
| Backups | 30 dias no MVP | Cópias criptografadas e testes de restauração |

## 4. Especificação da API & Contratos (se aplicável)

### 4.1 Padrão da API

A API externa será **RESTful**, JSON sobre HTTPS, descrita em OpenAPI 3.1. Comunicação interna de jobs ocorrerá por AMQP. Não haverá GraphQL no MVP.

Base path:

```text
/api/v1
```

Convenções:

- substantivos no plural: `/leads`, `/campaigns`, `/jobs`;
- ações de domínio que não são CRUD usam sub-recursos ou verbos explícitos: `/campaigns/{id}/runs`, `/leads/{id}/audit-requests`;
- IDs como UUID em string;
- timestamps ISO 8601 UTC;
- enums em `UPPER_SNAKE_CASE`;
- campos JSON em `camelCase`;
- valores ausentes não são equivalentes a `null` em PATCH;
- `PATCH` usa JSON Merge Patch (`application/merge-patch+json`) nos recursos simples;
- coleções usam paginação por cursor;
- filtros são repetíveis ou separados por vírgula conforme OpenAPI;
- ordenação: `sort=-currentScore,tradeName`;
- respostas de criação incluem `Location` quando um recurso é criado;
- tarefas longas retornam `202 Accepted` com um recurso `job` consultável.

### 4.2 Headers padronizados

| Header | Uso |
| --- | --- |
| `Authorization: Bearer <token>` | Autenticação OIDC/JWT |
| `X-Correlation-ID` | Correlação ponta a ponta; gerado pelo servidor quando ausente |
| `Idempotency-Key` | Obrigatório em comandos que podem ser repetidos |
| `If-Match` | Atualização otimista com ETag/version |
| `Accept-Language` | Idioma preferido da resposta textual |
| `Retry-After` | Resposta 429/503 quando aplicável |

### 4.3 Códigos HTTP

| Código | Aplicação |
| ---: | --- |
| 200 | Consulta ou comando síncrono concluído |
| 201 | Recurso criado |
| 202 | Job aceito para processamento |
| 204 | Atualização/exclusão sem corpo |
| 400 | JSON inválido ou parâmetro malformado |
| 401 | Token ausente, inválido ou expirado |
| 403 | Identidade válida sem permissão |
| 404 | Recurso inexistente no tenant atual |
| 409 | Conflito de estado, duplicidade ou idempotência incompatível |
| 412 | `If-Match` divergente |
| 422 | Entrada sintaticamente válida, mas viola regra de negócio |
| 429 | Limite de requisições/cota excedido |
| 500 | Falha inesperada sem exposição de detalhe interno |
| 502 | Falha inválida de provedor externo |
| 503 | Dependência indisponível ou degradação temporária |

### 4.4 Tratamento padrão de erros

Erros seguem **Problem Details for HTTP APIs** (`application/problem+json`, RFC 9457, evolução do RFC 7807).

```json
{
  "type": "https://api.prospector.local/problems/validation-error",
  "title": "A requisição possui campos inválidos",
  "status": 422,
  "detail": "Corrija os campos indicados e tente novamente.",
  "instance": "/api/v1/campaigns",
  "errorCode": "CAMPAIGN_VALIDATION_FAILED",
  "correlationId": "01K5H7P3W6TQ5R9Y6KJ4M1N8AB",
  "violations": [
    {
      "field": "minimumRating",
      "code": "OUT_OF_RANGE",
      "message": "Deve estar entre 0 e 5"
    }
  ]
}
```

Stack traces, tokens, SQL, chaves de fornecedor e payload bruto nunca aparecem na resposta.

### 4.5 Recursos e endpoints críticos

| Método | Rota | Descrição | Papel mínimo |
| --- | --- | --- | --- |
| POST | `/campaigns` | Cria campanha | `ANALYST` |
| GET | `/campaigns` | Lista campanhas | `VIEWER` |
| POST | `/campaigns/{id}/runs` | Inicia execução | `ANALYST` |
| GET | `/campaign-runs/{id}` | Consulta execução e contadores | `VIEWER` |
| POST | `/imports/leads` | Importa arquivo previamente enviado | `ANALYST` |
| GET | `/leads` | Filtra e pagina leads | `VIEWER` |
| GET | `/leads/{id}` | Obtém visão detalhada | `VIEWER` |
| PATCH | `/leads/{id}` | Corrige dados canônicos | `ANALYST` |
| PATCH | `/leads/{id}/crm` | Atualiza estágio/responsável/próxima ação | `SALES` |
| POST | `/leads/{id}/audit-requests` | Solicita auditoria | `ANALYST` |
| GET | `/leads/{id}/audits` | Lista auditorias | `VIEWER` |
| POST | `/leads/{id}/score-calculations` | Recalcula score | `ANALYST` |
| POST | `/leads/{id}/ai-analyses` | Solicita diagnóstico | `ANALYST` |
| POST | `/leads/{id}/proposals` | Gera rascunho | `SALES` |
| POST | `/proposals/{id}/approval` | Aprova/rejeita revisão | `SALES`/`MANAGER` |
| POST | `/outreach-messages` | Cria mensagem | `SALES` |
| POST | `/outreach-messages/{id}/approval` | Aprova/rejeita mensagem | `MANAGER` ou política configurada |
| POST | `/outreach-messages/{id}/send-requests` | Solicita envio aprovado | `SALES` |
| GET | `/jobs/{id}` | Consulta tarefa assíncrona | `VIEWER` |

### 4.6 Criar campanha

**Requisição**

```http
POST /api/v1/campaigns HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: 8e54cc8d-11f1-4f8a-a716-001
```

```json
{
  "name": "Dentistas em Fortaleza — Piloto",
  "category": "DENTIST",
  "geography": {
    "countryCode": "BR",
    "stateCode": "CE",
    "city": "Fortaleza",
    "radiusKm": 20
  },
  "filters": {
    "minimumRating": 4.2,
    "minimumReviewCount": 20,
    "websitePresence": ["ANY"],
    "maximumResults": 100
  },
  "providers": ["GOOGLE_PLACES"]
}
```

**Resposta**

```json
{
  "id": "0199a87a-2b10-7b47-9c4d-70f0ee59a012",
  "name": "Dentistas em Fortaleza — Piloto",
  "status": "DRAFT",
  "category": "DENTIST",
  "geography": {
    "countryCode": "BR",
    "stateCode": "CE",
    "city": "Fortaleza",
    "radiusKm": 20
  },
  "filters": {
    "minimumRating": 4.2,
    "minimumReviewCount": 20,
    "websitePresence": ["ANY"],
    "maximumResults": 100
  },
  "createdAt": "2026-09-19T21:30:00Z",
  "version": 1
}
```

### 4.7 Iniciar execução da campanha

```http
POST /api/v1/campaigns/0199a87a-2b10-7b47-9c4d-70f0ee59a012/runs HTTP/1.1
Idempotency-Key: campaign-run-0199a87a-20260919-01
```

Resposta `202 Accepted`:

```json
{
  "run": {
    "id": "0199a883-5ca4-77e5-9860-093f112f30ab",
    "campaignId": "0199a87a-2b10-7b47-9c4d-70f0ee59a012",
    "status": "QUEUED",
    "counters": {
      "discovered": 0,
      "accepted": 0,
      "duplicates": 0,
      "failed": 0
    }
  },
  "job": {
    "id": "0199a883-74f7-7b58-95e0-60593a48bb2f",
    "type": "CAMPAIGN_DISCOVERY",
    "status": "QUEUED",
    "links": {
      "self": "/api/v1/jobs/0199a883-74f7-7b58-95e0-60593a48bb2f"
    }
  }
}
```

### 4.8 Listar leads

```http
GET /api/v1/leads?city=Fortaleza&scoreBand=PRIORITY,INTERESTING&websiteStatus=HAS_WEBSITE,SITE_UNREACHABLE&sort=-currentScore&limit=25
```

```json
{
  "items": [
    {
      "id": "0199a91a-b178-7af9-a972-99c1d1eaaf10",
      "tradeName": "Clínica Odontológica Exemplo",
      "category": "DENTIST",
      "city": "Fortaleza",
      "rating": 4.8,
      "reviewCount": 237,
      "website": "https://www.clinicaexemplo.com.br",
      "websiteStatus": "HAS_WEBSITE",
      "currentScore": 55,
      "scoreBand": "INTERESTING",
      "crmStage": "NEW",
      "nextActionAt": null,
      "updatedAt": "2026-09-19T21:52:10Z"
    }
  ],
  "page": {
    "nextCursor": "eyJzY29yZSI6NTUsImlkIjoiMDE5OWE5MWEuLi4ifQ",
    "hasMore": true,
    "limit": 25
  }
}
```

Este lead ilustra o cenário mais comum de oportunidade: site existente, mas com performance/SEO ruins e sem CTA de conversão — o resultado da auditoria e do score explicável para o mesmo `id` aparece nas seções [4.9](#49-solicitar-auditoria-de-site) a [4.11](#411-score-explicável).

### 4.9 Solicitar auditoria de site

```http
POST /api/v1/leads/0199a91a-b178-7af9-a972-99c1d1eaaf10/audit-requests HTTP/1.1
Idempotency-Key: audit-0199a91a-20260919-01
Content-Type: application/json
```

```json
{
  "url": "https://www.clinicaexemplo.com.br",
  "profile": "MOBILE",
  "force": false
}
```

```json
{
  "auditRequestId": "0199a95b-e2d3-76a0-bf5e-40a76c2ea222",
  "status": "QUEUED",
  "jobId": "0199a95b-f04b-75e2-bf8b-a86df6be16bc"
}
```

### 4.10 Resultado resumido da auditoria

```json
{
  "id": "0199aa1b-5f26-71a8-a5d7-13b576699e15",
  "status": "COMPLETED",
  "requestedUrl": "https://www.clinicaexemplo.com.br",
  "finalUrl": "https://clinicaexemplo.com.br/",
  "capturedAt": "2026-09-19T21:50:14Z",
  "http": {
    "status": 200,
    "https": true,
    "redirectCount": 1
  },
  "lighthouse": {
    "performance": 31,
    "accessibility": 78,
    "bestPractices": 64,
    "seo": 58,
    "metrics": {
      "lcpMs": 4820,
      "cls": 0.19,
      "tbtMs": 910
    }
  },
  "features": {
    "mobileFriendly": true,
    "hasWhatsAppCta": false,
    "hasContactForm": false,
    "hasTitle": true,
    "hasMetaDescription": false
  },
  "findings": [
    {
      "code": "LOW_MOBILE_PERFORMANCE",
      "severity": "HIGH",
      "category": "PERFORMANCE",
      "summary": "Performance mobile abaixo do limite de 50"
    }
  ]
}
```

### 4.11 Score explicável

```json
{
  "leadId": "0199a91a-b178-7af9-a972-99c1d1eaaf10",
  "policyVersion": "2026-09-v1",
  "rawScore": 55,
  "totalScore": 55,
  "band": "INTERESTING",
  "eligibleForOutreach": true,
  "factors": [
    {
      "code": "RATING_HIGH",
      "points": 10,
      "evidence": {"rating": 4.8, "reviewCount": 237}
    },
    {
      "code": "REVIEWS_HIGH",
      "points": 10,
      "evidence": {"reviewCount": 237}
    },
    {
      "code": "PERFORMANCE_LOW",
      "points": 15,
      "evidence": {"auditId": "0199aa1b-5f26-71a8-a5d7-13b576699e15", "value": 31}
    },
    {
      "code": "SEO_LOW",
      "points": 10,
      "evidence": {"value": 58}
    },
    {
      "code": "NO_WHATSAPP_CTA",
      "points": 10,
      "evidence": {"detected": false}
    }
  ],
  "calculatedAt": "2026-09-19T21:51:02Z"
}
```

### 4.12 Solicitar diagnóstico por IA

```json
{
  "kind": "COMMERCIAL_DIAGNOSIS",
  "language": "pt-BR",
  "tone": "DIRECT_AND_PROFESSIONAL",
  "evidenceScope": "LATEST_VERIFIED_ONLY"
}
```

Resposta `202 Accepted`:

```json
{
  "analysisId": "0199aa71-a0d4-71b6-8bde-35310910508c",
  "status": "QUEUED",
  "jobId": "0199aa71-a638-7bc1-8ff1-f5ec4bbec4c5"
}
```

Saída estruturada final:

```json
{
  "id": "0199aa71-a0d4-71b6-8bde-35310910508c",
  "status": "COMPLETED",
  "reviewStatus": "PENDING_REVIEW",
  "diagnosis": {
    "summary": "A empresa demonstra forte reputação local, mas o site possui baixa performance mobile e poucos caminhos diretos de conversão.",
    "strengths": [
      {"text": "Nota 4,8 em 237 avaliações", "evidencePath": "lead.reviewSummary"}
    ],
    "problems": [
      {"text": "Performance mobile 31/100", "evidencePath": "audit.lighthouse.performance"},
      {"text": "Nenhum CTA de WhatsApp detectado", "evidencePath": "audit.features.hasWhatsAppCta"}
    ],
    "opportunities": [
      "Otimizar carregamento mobile",
      "Adicionar conversão direta por WhatsApp",
      "Reestruturar metadados para SEO local"
    ],
    "recommendedOffer": "REDESIGN_CONVERSION"
  },
  "generation": {
    "promptVersion": "commercial-diagnosis-v3",
    "modelAlias": "analysis-standard",
    "generatedAt": "2026-09-19T21:52:40Z"
  }
}
```

### 4.13 Atualizar CRM com concorrência otimista

```http
PATCH /api/v1/leads/0199a91a-b178-7af9-a972-99c1d1eaaf10/crm HTTP/1.1
Content-Type: application/merge-patch+json
If-Match: "7"
```

```json
{
  "stage": "QUALIFIED",
  "assignedUserId": "0199a100-7241-7ace-b6f7-76270052e429",
  "nextActionAt": "2026-09-21T13:00:00Z",
  "note": "Revisar abordagem com foco em conversão mobile."
}
```

### 4.14 Contrato de mensagem AMQP

Envelope:

```json
{
  "eventId": "0199ab19-4cec-7635-820b-2e7bb108374e",
  "eventType": "website.audit.requested",
  "eventVersion": 1,
  "occurredAt": "2026-09-19T22:01:00Z",
  "organizationId": "0199a001-e4de-7973-a386-e43a1f88b811",
  "correlationId": "01K5H9Y07CGFQ0Q4MW6BR2X94W",
  "causationId": "0199a95b-e2d3-76a0-bf5e-40a76c2ea222",
  "payload": {
    "auditRequestId": "0199a95b-e2d3-76a0-bf5e-40a76c2ea222",
    "leadId": "0199a91a-b178-7af9-a972-99c1d1eaaf10",
    "url": "https://www.clinicaexemplo.com.br",
    "profile": "MOBILE",
    "timeoutSeconds": 90
  }
}
```

Filas:

```text
prospector.audit.requested.v1
prospector.audit.retry.v1
prospector.audit.dlq.v1
prospector.audit.completed.v1
prospector.audit.completed.dlq.v1
prospector.integration-events.v1
```

`audit.requested` vai do core-api para o audit-worker; `audit.completed` faz o caminho inverso (`website.audit.completed`/`website.audit.failed`), carregando scores, métricas, achados e as chaves dos artefatos no S3/MinIO. Cada uma tem sua própria fila porque o consumidor é um serviço específico em cada direção, não um observador genérico — diferente de `prospector.integration-events.v1`, que é o barramento genérico onde outros eventos de domínio (ex.: `campaign.run.requested`) são publicados para quem quiser observar.

### 4.15 Compatibilidade e versionamento

- versão major no path apenas para mudança incompatível;
- adição de campo opcional é compatível;
- consumidores devem ignorar campos desconhecidos;
- remoção/renomeação exige depreciação, telemetria de uso e nova versão;
- eventos incluem versão própria e não reutilizam nome para semântica incompatível;
- OpenAPI passa por verificação automática de *breaking changes* no CI;
- contratos do worker usam JSON Schema versionado.

## 5. Segurança, Autenticação e Autorização

### 5.1 Modelo de ameaças resumido

Superfícies principais:

- dashboard e API pública autenticada;
- URLs fornecidas para auditoria, com risco de SSRF;
- navegador automatizado processando conteúdo não confiável;
- conectores externos e webhooks;
- prompts e respostas de IA;
- arquivos CSV e artefatos de auditoria;
- broker, Redis, banco e armazenamento de objetos;
- ações comerciais e dados de contato.

Ameaças prioritárias: acesso cruzado entre organizações, SSRF, execução maliciosa no browser, vazamento de segredos, *prompt injection*, duplicação de comandos, abuso de cotas, envio não aprovado e exposição de dados em logs.

### 5.2 Autenticação

- OpenID Connect sobre OAuth 2.0 Authorization Code + PKCE para usuários, conduzido pela própria SPA React (`oidc-client-ts`/`react-oidc-context`) — sem BFF: o dashboard troca o código por token diretamente com o IdP e guarda o resultado em `sessionStorage` (gerenciado pela biblioteca), anexando `Authorization: Bearer <access_token>` em toda chamada à API. Essa escolha troca a mitigação extra de um cookie `httpOnly` (que exigiria um BFF dedicado, hoje inexistente) por simplicidade operacional; o risco de exfiltração via XSS é aceito nesta fase e mitigado pela CSP e sanitização de saída do frontend.
- Tokens de acesso JWT de curta duração, assinados assimetricamente (`RS256`).
- NestJS valida `iss`, `aud`, `exp` e a assinatura via JWKS num `JwtAuthGuard` global (`src/auth/`), sem sessão no servidor — cada requisição é validada de forma independente (`jsonwebtoken` + `jwks-rsa`, cache de chaves).
- `OIDC_ISSUER_URI` (o que o navegador vê e que aparece em `iss`) e `OIDC_JWKS_URI` (endpoint que a própria API usa para buscar as chaves de assinatura) são configurados separadamente porque, em Docker, o navegador e a API alcançam o IdP por hostnames diferentes (host publicado vs. rede interna do compose) — ver `.env.example`.
- `organizationId` nunca vem do cliente: o guard resolve o usuário pelo `sub` do token (com fallback por e-mail no primeiro login, cobrindo os usuários semeados por `prisma/seed.ts`) e deriva a organização da `Membership` ativa correspondente.
- Ambiente local usa Keycloak em Docker (`deploy/keycloak/prospector-realm.json`) com os seis usuários de desenvolvimento já provisionados; produção aponta as mesmas variáveis para qualquer IdP OIDC padrão (Auth0, Okta, Azure AD etc.).
- A tela de login usa um tema Keycloak próprio (`deploy/keycloak/themes/prospector/`) que estende `keycloak.v2` só por CSS — mesma identidade visual do dashboard (fundo com grid/glow, gradiente cyan→violeta, tipografia Space Grotesk/Inter/JetBrains Mono), sem tocar nos templates/fluxos de autenticação do Keycloak.
- Contas de serviço usam Client Credentials com escopos mínimos ou identidade de workload em nuvem.
- Webhooks usam assinatura HMAC, timestamp e proteção contra replay.
- MFA é delegado ao provedor de identidade e obrigatório para papéis administrativos em produção.

### 5.3 Autorização RBAC e ABAC

Papéis:

| Papel | Capacidades |
| --- | --- |
| `ADMIN` | Usuários, integrações, políticas, todos os dados da organização |
| `MANAGER` | Relatórios, aprovações, atribuição e visão global do funil |
| `ANALYST` | Campanhas, revisão de leads, auditoria, score e diagnóstico |
| `SALES` | CRM, propostas, mensagens e contatos permitidos |
| `OPERATOR` | Jobs, retries, DLQ e diagnóstico operacional sem conteúdo comercial desnecessário |
| `VIEWER` | Leitura sem mutação |

Além do papel, políticas ABAC avaliam:

- `organization_id` do token/contexto;
- propriedade ou atribuição do lead;
- estágio do recurso;
- status de aprovação;
- escopo do token de serviço;
- classificação do dado;
- presença em lista de supressão;
- horário ou regra adicional somente quando configurado.

Regras invariantes:

- um usuário jamais informa `organization_id` arbitrário para acessar dados;
- toda consulta aplica o tenant do contexto autenticado;
- recursos de outro tenant respondem 404, não 403;
- envio exige mensagem aprovada e sem alteração posterior;
- alteração de score policy e integrações exige `ADMIN`;
- acesso operacional a payload bruto é restrito e auditado.

### 5.4 Proteção contra SSRF e isolamento do navegador

O Audit Worker deve:

1. aceitar apenas `http` e `https`;
2. resolver DNS antes de navegar e a cada redirecionamento;
3. bloquear loopback, link-local, redes privadas, metadados de nuvem, IPv6 local e ranges reservados;
4. limitar a quantidade de redirecionamentos;
5. impor timeout, tamanho máximo de resposta e orçamento total de download;
6. bloquear esquemas `file:`, `data:`, `ftp:`, `chrome:` e semelhantes;
7. executar Chromium sem credenciais, cookies persistentes ou acesso ao host;
8. usar container sem privilégios, filesystem somente leitura e diretório temporário descartável;
9. restringir egress conforme infraestrutura disponível;
10. limitar CPU, memória, processos e concorrência;
11. remover metadados sensíveis dos artefatos;
12. não executar downloads nem extensões.

### 5.5 IA e prompt injection

- O conteúdo do site é dado não confiável, nunca instrução de sistema.
- O modelo recebe somente campos selecionados e evidências delimitadas.
- Ferramentas do modelo ficam desabilitadas para diagnóstico textual.
- Saída é validada por JSON Schema.
- Recomendações só podem citar evidências presentes no snapshot de entrada.
- URLs, HTML completo, scripts e comentários invisíveis não são enviados por padrão.
- O sistema registra versão de prompt/modelo e permite reproduzir o contexto.
- Conteúdo gerado não altera score, permissões ou status sem comando de domínio validado.
- PII e segredos são redigidos antes da chamada ao provedor.

### 5.6 Criptografia e segredos

Em trânsito:

- TLS 1.2+ externamente, preferencialmente TLS 1.3;
- TLS entre serviços em produção quando suportado pela plataforma;
- validação de certificado e hostname sempre habilitada.

Em repouso:

- volumes, banco, backups e objetos criptografados pelo provedor;
- campos excepcionalmente sensíveis podem usar criptografia de aplicação por envelope;
- chaves ficam em KMS/secret manager, nunca no repositório ou imagem.

Segredos:

- desenvolvimento: arquivo `.env.local` ignorado pelo Git;
- CI/CD: cofre do provedor e credenciais de curta duração via OIDC;
- produção: secret manager e rotação;
- logs exibem somente identificador da credencial, nunca valor;
- scanner de segredos bloqueia commits e pipeline.

### 5.7 LGPD/GDPR e minimização

Embora o foco seja dado empresarial público, contatos podem constituir dados pessoais. O sistema deve oferecer:

- inventário de campos e finalidade;
- base legal definida pela operação, com registro de avaliação quando aplicável;
- minimização: coletar apenas o necessário para prospecção e auditoria;
- origem e data de coleta rastreáveis;
- correção, exportação, anonimização e exclusão por organização/contato;
- lista de supressão para impedir novo contato após oposição/opt-out;
- retenção configurável e jobs de expurgo;
- contratos e região de processamento dos fornecedores avaliados;
- controle de acesso e registro de consulta a dados mais sensíveis;
- políticas para transferência internacional quando houver;
- resposta a incidentes e registro de violações.

A supressão deve usar representação minimizada, como hash normalizado do canal, para impedir reimportação e novo contato sem reter conteúdo desnecessário.

### 5.8 Segurança da API

- validação de entrada por allowlist e limites de tamanho;
- rate limit por usuário, organização, IP e operação cara;
- CORS restrito a origens conhecidas;
- CSRF protegido quando houver autenticação por cookie;
- headers de segurança no dashboard: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` e `frame-ancestors`;
- consultas parametrizadas;
- upload validado por tipo, extensão, assinatura e tamanho;
- CSV tratado contra fórmulas perigosas em exportação;
- paginação com limite máximo;
- ETag/versão para evitar sobrescrita concorrente;
- `Idempotency-Key` para comandos repetíveis;
- mensagens externas sanitizadas para o canal alvo.

### 5.9 Auditoria de segurança

Eventos obrigatórios:

- login administrativo e falhas relevantes;
- criação/remoção de membro;
- mudança de papel;
- alteração de integração ou segredo referenciado;
- exportação de dados;
- merge de leads;
- mudança manual de score/status;
- aprovação/rejeição de proposta e mensagem;
- envio e falha de envio;
- acesso a payload bruto;
- operação de exclusão/anonimização.

Logs de auditoria são append-only no nível da aplicação. Alterações diretas no banco ficam restritas a contas operacionais separadas.

## 6. Guia de Configuração e Execução do Ambiente (Getting Started)

### 6.1 Pré-requisitos

| Ferramenta | Versão mínima/baseline | Obrigatória para rodar o sistema |
| --- | --- | --- |
| Git | 2.45+ | Sim |
| Docker Engine | 27+ | Sim |
| Docker Compose | 2.29+ | Sim |
| Make | opcional, recomendado para atalhos | Não |
| Node.js | 22 LTS | Apenas para IDE/lint fora de container |
| Corepack/pnpm | versão definida em `packageManager` | Apenas para IDE/lint fora de container |

Toda a stack — PostgreSQL, Redis, RabbitMQ, MinIO, n8n, observabilidade, **core-api (NestJS), audit-worker e web (React)** — roda em containers via Docker Compose, inclusive em desenvolvimento. Node.js/pnpm locais só são necessários para autocomplete, lint e depuração na IDE; nenhum comando de build ou execução do produto depende de toolchain instalada na máquina do desenvolvedor.

### 6.2 Estrutura recomendada do repositório

```text
prospector/
├── apps/
│   ├── core-api/                 # NestJS (API + regras de domínio)
│   ├── audit-worker/             # Node.js/TypeScript (Playwright/Lighthouse)
│   └── web/                      # React + Vite (SPA)
├── automation/
│   └── n8n/                      # workflows exportados
├── contracts/
│   ├── openapi/
│   ├── events/
│   └── schemas/
├── deploy/
│   ├── compose/
│   ├── docker/
│   └── observability/
├── docs/
│   └── adr/
├── scripts/
├── .env.example
├── compose.yaml
├── compose.override.yaml         # hot-reload local (bind mounts)
├── pnpm-workspace.yaml
├── Makefile
└── DOCUMENTATION.md
```

`core-api`, `audit-worker` e `web` compartilham um único monorepo pnpm (mesma linguagem, mesmo lockfile), mas cada um tem sua própria imagem Docker e ciclo de deploy — a divisão em módulos/serviços é sobre limites de execução e escala, não sobre a linguagem.

### 6.3 Variáveis de ambiente

O `.env.example` documenta nomes, nunca segredos reais.

| Variável | Serviço | Obrigatória | Exemplo local |
| --- | --- | --- | --- |
| `NODE_ENV` | API/worker/web | Sim | `development` |
| `PORT` | API | Não (default `8080`) | `8080` |
| `CORS_ALLOWED_ORIGINS` | API | Sim | `http://localhost:3000` |
| `DATABASE_URL` | API | Sim | `postgresql://prospector:senha@postgres:5432/prospector` |
| `REDIS_URL` | API | Sim | `redis://redis:6379` |
| `RABBITMQ_URL` | API/worker | Sim | `amqp://prospector:...@rabbitmq:5672` |
| `OIDC_ISSUER_URI` | API/web | Sim | issuer do IdP visto pelo navegador, ex.: `http://localhost:8081/realms/prospector` |
| `OIDC_JWKS_URI` | API | Sim | endpoint de chaves que a API usa internamente, ex.: `http://keycloak:8080/realms/prospector/protocol/openid-connect/certs` |
| `OIDC_AUDIENCE` | API | Sim | `prospector-api` |
| `VITE_OIDC_AUTHORITY` | web | Sim | igual a `OIDC_ISSUER_URI` |
| `VITE_OIDC_CLIENT_ID` | web | Sim | `prospector-web` |
| `S3_ENDPOINT` | API/worker | Sim | `http://minio:9000` |
| `S3_BUCKET` | API/worker | Sim | `prospector-artifacts` |
| `S3_ACCESS_KEY` | API/worker | Sim | valor local |
| `S3_SECRET_KEY` | API/worker | Sim | valor local |
| `LLM_PROVIDER` | API | Não | `mock` |
| `LLM_API_KEY` | API | Quando provedor real | segredo |
| `PLACES_PROVIDER` | API/n8n | Não | `mock`, ou `receita_federal` (dado real, sem custo — seção 1.10) |
| `PLACES_API_KEY` | API/n8n | Quando provedor real | segredo (não usado por `receita_federal`) |
| `AUDIT_MAX_CONCURRENCY` | worker | Sim | `2` |
| `AUDIT_TIMEOUT_MS` | worker | Sim | `90000` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | todos | Não | `http://otel-collector:4318` |
| `VITE_API_BASE_URL` | web | Sim | `http://localhost:8080/api/v1` |

`DATABASE_URL` é lido diretamente pelo Prisma (`schema.prisma`); credenciais não ficam em variáveis separadas. Dentro da rede Docker os serviços se resolvem pelo nome do serviço no `compose.yaml` (`postgres`, `redis`, `rabbitmq`, `minio`), não por `localhost`.

### 6.4 Configuração local

```bash
git clone <repository-url> prospector
cd prospector
cp .env.example .env.local
```

Edite apenas os valores locais exigidos. Com Docker Engine e Compose instalados, um único comando sobe **toda** a stack — infraestrutura, API, worker e web:

```bash
docker compose --env-file .env.local up -d --build
```

Isso inclui: PostgreSQL, Redis, RabbitMQ, MinIO, n8n, OTel Collector/Grafana, o `core-api` (NestJS), o `audit-worker` (Node + Playwright) e o `web` (React). O job de migração (`prisma migrate deploy`) roda como um serviço `init` do Compose antes da API subir, e não requer nenhuma ferramenta instalada localmente além do Docker.

Para desenvolvimento com hot-reload, `compose.override.yaml` monta o código-fonte como volume e troca o `command` de cada serviço pelo modo watch (`nest start --watch`, `pnpm dev` no worker, `vite --host 0.0.0.0` no web); ele é aplicado automaticamente pelo Compose quando presente, sem exigir Node instalado no host:

```bash
docker compose --env-file .env.local watch
```

Só é necessário instalar Node.js/pnpm localmente para quem quer rodar lint/typecheck/testes diretamente na IDE fora do container — nunca para operar o produto.

Depois da stack subir pela primeira vez, rode o seed (idempotente, seção 6.5) — sem isso não existe organização de desenvolvimento e toda escrita falha por violação de FK:

```bash
docker compose exec core-api sh -c "cd apps/core-api && corepack pnpm run prisma:seed"
```

Ou, se tiver `make` instalado (opcional, seção 6.1): `make seed`.

Endpoints locais esperados:

| Serviço | URL |
| --- | --- |
| Dashboard (React) | `http://localhost:3000` |
| Core API (NestJS) | `http://localhost:8080` |
| OpenAPI/Swagger UI | `http://localhost:8080/docs` |
| Health check | `http://localhost:8080/health` |
| RabbitMQ Management | `http://localhost:15672` |
| MinIO Console | `http://localhost:9001` |
| n8n | `http://localhost:5678` |
| Grafana | `http://localhost:3001` |
| Keycloak (IdP local) | `http://localhost:8081` |

### 6.5 Dados de desenvolvimento

O projeto deve fornecer:

- um tenant local;
- usuários para cada papel;
- score policy inicial;
- campanha piloto;
- leads fictícios com estados variados;
- servidor mock para descoberta e LLM;
- site fixture rápido, lento, sem HTTPS simulado e indisponível;
- buckets e filas provisionados automaticamente.

Seeds são determinísticos, idempotentes e nunca executados no perfil de produção.

Login local: o realm `prospector` (`deploy/keycloak/prospector-realm.json`, importado automaticamente pelo Keycloak) já contém um usuário por papel, com e-mail igual ao semeado por `prisma/seed.ts` (ex.: `dev-admin@prospector.dev`) e senha `devpassword123` para todos. No primeiro login de cada um, a API casa o usuário pelo e-mail e grava o `sub` real do Keycloak — depois disso a busca já é direta.

Descoberta com dado real (ver ADR-016): por padrão `PLACES_PROVIDER=mock` gera empresas fictícias, sem custo e sem passo extra. Já rodamos isto de ponta a ponta para Fortaleza (52.503 estabelecimentos reais importados, campanha de teste trouxe 30 dentistas de verdade). Para importar outra cidade:

```bash
# 1. Baixa os arquivos abertos da Receita (confira o mês vigente navegando
#    em https://arquivos.receitafederal.gov.br/ -> Dados > Cadastros > CNPJ;
#    o portal é um Nextcloud, o download real é via WebDAV — ver
#    scripts/cnpj-import/config.ts)
docker compose exec core-api pnpm run import:cnpj:download -- --mes=2026-09

# 2. Filtra por município + nichos já cadastrados na aba Nichos e importa
docker compose exec core-api pnpm run import:cnpj -- --municipio="Fortaleza"

# 3. Troca o provider e reinicia
#    PLACES_PROVIDER=receita_federal no .env.local, depois:
docker compose restart core-api
```

O passo 1 baixa uns 6-7GB por mês (arquivos não vêm particionados por UF — cada um cobre o Brasil inteiro); o passo 2 processa tudo em streaming, sem carregar arquivo inteiro em memória, e só grava em `cnpj_establishments` o que casar com o município e os CNAEs mapeados em `src/discovery/providers/cnae-by-category.ts` (por CNAE principal **ou** secundário — um estabelecimento cuja atividade principal é outra, mas lista um dos CNAEs alvo como secundária, também entra).

### 6.6 Comandos de build e testes

Todos os comandos rodam dentro dos containers (`docker compose exec <serviço> ...`), sem exigir toolchain local. Os mesmos scripts também funcionam fora do container para quem tiver Node/pnpm instalado.

Core API (NestJS):

```bash
docker compose exec core-api pnpm lint
docker compose exec core-api pnpm typecheck
docker compose exec core-api pnpm test
docker compose exec core-api pnpm test:integration
docker compose exec core-api pnpm prisma migrate dev
```

Worker:

```bash
docker compose exec audit-worker pnpm lint
docker compose exec audit-worker pnpm typecheck
docker compose exec audit-worker pnpm test
docker compose exec audit-worker pnpm test:integration
```

Web:

```bash
docker compose exec web pnpm lint
docker compose exec web pnpm typecheck
docker compose exec web pnpm test
docker compose exec web pnpm test:e2e
docker compose exec web pnpm build
```

Contrato e stack completa:

```bash
make contract-test
make compose-test
make verify
```

### 6.7 Verificação rápida do ambiente

```bash
curl -fsS http://localhost:8080/health
curl -fsS http://localhost:3000
docker compose ps
```

Critérios:

- PostgreSQL, Redis, RabbitMQ e MinIO saudáveis;
- migrações Prisma aplicadas;
- API retorna `ok` no health check;
- worker conectado ao broker;
- dashboard obtém sessão local;
- campanha mock conclui e cria leads;
- auditoria fixture salva resultado e screenshot.

### 6.8 Troubleshooting inicial

| Sintoma | Verificação | Ação típica |
| --- | --- | --- |
| API não inicia | `docker compose logs core-api` e status do serviço de migração | Corrigir conexão ou migração pendente (`prisma migrate status`) |
| Worker não consome | RabbitMQ UI, fila e credenciais | Validar exchange, routing key e vhost |
| Chromium falha | Dependências/imagem do worker | Recriar imagem oficial e reinstalar browser travado |
| Screenshot ausente | Bucket, política e endpoint S3 | Reprovisionar bucket local e validar credenciais |
| 401 no dashboard | issuer, audience e relógio | Conferir `OIDC_ISSUER_URI`/`OIDC_JWKS_URI`/`OIDC_AUDIENCE`, sincronização de hora e se o Keycloak já terminou de subir (`docker compose logs keycloak`) |
| 403 `AUTH_USER_NOT_PROVISIONED`/`AUTH_NO_ACTIVE_MEMBERSHIP` após login | E-mail do usuário no Keycloak não bate com nenhum `users.email` semeado | Usar um dos e-mails de `prisma/seed.ts` (seção 6.5) ou criar a Membership manualmente |
| Auditoria presa | métricas de job, timeout e DLQ | Cancelar/reprocessar com nova tentativa idempotente |
| Score inesperado | versão e fatores persistidos | Comparar evidências com a política daquela versão |
| Hot-reload não funciona | `compose.override.yaml` aplicado e volumes montados | Rodar `docker compose watch` em vez de `up -d` |
| Dependência nova (`pnpm add`) não aparece no container | Volume anônimo de `node_modules` reaproveitado entre recriações | `docker compose up -d --build -V` (renova volumes anônimos; `make up` já faz isso) |
| Mudança de código não aparece no container em modo dev | Docker Desktop no Windows nem sempre propaga eventos de arquivo de um bind mount para o watcher dentro do container | `docker compose restart <serviço>` força reler o código do zero, sem depender do watch |

## 7. Estratégia de Testes e Qualidade de Código

### 7.1 Pirâmide de testes

Distribuição alvo por quantidade:

| Nível | Proporção aproximada | Objetivo |
| --- | ---: | --- |
| Unitário | 60–70% | Regras de domínio rápidas e determinísticas |
| Integração/Componente | 20–30% | Banco, broker, adapters, HTTP e serialização reais |
| Contrato | 5–10% | Compatibilidade entre API, frontend, n8n e worker |
| E2E | 5–10% | Fluxos críticos completos, poucos e estáveis |

Percentuais são guia, não meta isolada. Cobertura sem asserção de comportamento não conta como qualidade.

### 7.2 Testes unitários

Core API e worker (Jest, default do NestJS/Nest CLI):

- Jest como test runner e assertion library;
- mocks/stubs apenas em portas externas (providers injetados via DI do Nest), nunca no domínio;
- testes parametrizados (`it.each`) para score e transições de estado;
- relógio injetável (nunca `Date.now()`/`new Date()` direto no domínio) para datas determinísticas;
- geradores de fixture/builder sem dados compartilhados mutáveis entre testes.

Casos obrigatórios:

- score em todos os limites;
- invariantes de aprovação;
- transições de CRM e outreach;
- deduplicação determinística;
- normalização de domínio/telefone;
- autorização por papel e organização;
- idempotência de comandos;
- redaction de dados antes de IA/logs.

Web:

- Vitest;
- Testing Library para comportamento de componentes;
- testes puros de parsers e detectores;
- fixtures HTML controladas para detecção de WhatsApp, formulários, metatags e responsividade.

### 7.3 Testes de integração

- Testcontainers (binding Node) para PostgreSQL, RabbitMQ, Redis e MinIO;
- migrações Prisma reais executadas antes dos testes;
- `nestjs-testing` (`Test.createTestingModule`) + supertest para testes de módulo/HTTP end-to-end da API;
- WireMock/MockServer ou `msw` para Places, OIDC, LLM e canais externos;
- containers reais do Chromium para auditoria;
- rollback por teste ou banco efêmero por suíte;
- testes de concorrência para claim de jobs, outbox e updates com versão;
- testes de retry, poison message e DLQ;
- teste de indisponibilidade transitória dos provedores.

Não substituir PostgreSQL por SQLite ou por mocks do Prisma Client: diferenças de JSONB, índices, SQL e locking invalidariam parte do comportamento.

### 7.4 Testes de contrato

- OpenAPI é fonte do contrato HTTP publicado;
- validação de request/response contra schema no CI;
- geração de cliente TypeScript ou tipos a partir do OpenAPI;
- JSON Schema para cada evento;
- teste de compatibilidade retroativa em eventos;
- Pact pode ser adotado quando houver múltiplos consumidores independentes;
- exemplos deste documento devem existir como fixtures executáveis quando possível.

### 7.5 Testes End-to-End

Playwright testa no mínimo:

1. login e troca de organização;
2. criação e execução de campanha mock;
3. visualização dos leads descobertos;
4. solicitação e conclusão de auditoria;
5. score e fatores exibidos;
6. geração e revisão de diagnóstico;
7. avanço no CRM;
8. criação, aprovação e envio simulado de mensagem;
9. bloqueio de envio sem aprovação;
10. isolamento entre organizações.

Os E2E usam dados isolados por execução, seletores semânticos e evidências de falha (trace, vídeo/screenshot apenas quando necessário).

### 7.6 Testes de segurança

- matriz de autorização por endpoint;
- tentativa de acesso cross-tenant;
- URLs SSRF: localhost, IP privado, redirect para privado, DNS rebinding simulado e IPv6 local;
- upload de CSV malformado e fórmula;
- injeção SQL/XSS em campos textuais;
- replay de webhook e idempotency key;
- prompt injection em conteúdo de site;
- exposição de segredo/PII em logs;
- SAST, SCA, container scan e secret scan no pipeline;
- DAST controlado em staging.

### 7.7 Testes de desempenho e resiliência

Ferramenta sugerida: k6.

Cenários:

- consulta paginada de 100 mil leads;
- 50 usuários filtrando dashboard simultaneamente;
- ingestão de 10 mil registros com duplicatas;
- pico de 500 auditorias enfileiradas;
- reinício do worker durante processamento;
- indisponibilidade de RabbitMQ/Redis/LLM;
- crescimento de outbox e limpeza;
- recuperação após DLQ.

Critérios iniciais:

- p95 da listagem < 400 ms com filtros indexados;
- taxa de erro da API < 1% em carga nominal;
- nenhuma perda de job confirmado;
- reprocessamento não cria auditoria/contato duplicado;
- backpressure impede colapso do banco e do provedor.

### 7.8 Qualidade e análise estática

TypeScript (API, worker e web, mesmo toolset em todo o monorepo):

- ESLint com regras estritas (`@typescript-eslint`, regras específicas de Nest e de React/hooks conforme o app);
- Prettier;
- `tsc --noEmit` com `strict: true`;
- `dependency-cruiser` (ou `eslint-plugin-boundaries`) para validar fronteiras entre módulos do domínio, cumprindo o mesmo papel que ArchUnit cumpre em stacks Java;
- Istanbul/`c8` (cobertura nativa do Jest/Vitest) para cobertura;
- `pnpm audit` / OSV-Scanner ou Snyk para dependências vulneráveis;
- testes de dependências e licenças;
- lockfile obrigatório (`pnpm-lock.yaml`) e instalação imutável (`--frozen-lockfile`).

Infraestrutura:

- Hadolint para Dockerfiles;
- actionlint para GitHub Actions;
- Trivy/Grype para imagens e filesystem;
- scanner de segredos;
- validação de Compose e manifests.

### 7.9 Quality gates

Um PR não pode ser integrado se:

- build ou testes falharem;
- houver vulnerabilidade crítica/alta explorável sem exceção documentada;
- OpenAPI/evento introduzir quebra não aprovada;
- cobertura de código novo ficar abaixo de 80% sem justificativa;
- cobertura global de domínio cair abaixo do limite configurado;
- migração falhar em banco vazio ou upgrade;
- `dependency-cruiser` detectar violação de fronteira entre módulos;
- lint/typecheck falhar;
- imagem contiver segredo ou rodar como root sem exceção;
- revisão obrigatória não for concluída.

### 7.10 Definition of Done

Uma história está concluída quando:

- critérios de aceitação foram atendidos;
- testes apropriados foram adicionados;
- contratos e migrações foram atualizados;
- métricas/logs necessários foram incluídos;
- risco de segurança e privacidade foi avaliado;
- documentação/ADR foi atualizada quando necessário;
- feature funciona em ambiente de staging;
- rollback ou desativação por flag foi considerado;
- não existem erros conhecidos sem rastreamento.

## 8. Pipeline de CI/CD e Deploy

### 8.1 Estratégia de branches

Adotar **Trunk-Based Development**:

- `main` sempre implantável;
- branches curtas no formato `feat/`, `fix/`, `chore/`;
- PR obrigatório;
- pelo menos uma revisão para código comum e duas para segurança/migração crítica;
- integração diária, evitando branches longas;
- feature flags para funcionalidades incompletas;
- releases marcadas por tag semântica;
- hotfix parte de `main` e retorna ao fluxo normal.

Commits devem ser pequenos e podem seguir Conventional Commits para changelog e versionamento.

### 8.2 Pipeline de Pull Request

```mermaid
flowchart TD
    A["Checkout e cache"] --> B["Lint, format e typecheck"]
    B --> C["Testes unitários"]
    C --> D["Integração e contratos"]
    D --> E["Scans de segurança"]
    E --> F["Build de imagens"]
    F --> G["Preview/Staging efêmero"]
    G --> H["E2E e aprovação"]
```

Etapas detalhadas:

1. validação de metadados do PR e arquivos alterados;
2. restauração de caches por hash de lockfile;
3. compilação, lint, format check e typecheck;
4. testes unitários em paralelo por aplicação;
5. Testcontainers e testes de integração;
6. verificação de migrações e compatibilidade do OpenAPI/eventos;
7. SAST, SCA, secret scan, IaC scan e SBOM;
8. build de imagens multi-stage e sem root;
9. assinatura e attestation das imagens quando disponível;
10. ambiente de preview ou staging compartilhado;
11. smoke/E2E;
12. quality gate e revisão humana.

### 8.3 Pipeline da branch principal

Após merge:

1. repetir verificações essenciais em contexto confiável;
2. construir artefatos uma única vez;
3. publicar imagens imutáveis por digest e tag de commit;
4. gerar SBOM e assinar artefatos;
5. implantar automaticamente em staging;
6. executar migrations job;
7. executar smoke tests e E2E crítico;
8. aguardar aprovação para produção, enquanto o produto estiver em fase inicial;
9. promover exatamente os mesmos digests para produção;
10. verificar saúde, métricas e logs;
11. registrar release e executar rollback automático se gates falharem.

### 8.4 Estratégia de deploy

Componentes são empacotados em imagens separadas:

- `prospector-core-api`;
- `prospector-audit-worker`;
- `prospector-web`;
- `prospector-n8n` apenas se houver customização controlada.

Estratégia por componente:

| Componente | Estratégia | Observação |
| --- | --- | --- |
| API | Blue/Green ou Rolling com readiness | Compatibilidade com schema N e N−1 durante rollout |
| Web | Build estático (Vite) imutável, servido via Nginx/CDN, com rollback de versão | Sem processo de servidor a manter; cache invalidado por hash de asset |
| Worker | Rolling com graceful shutdown | Para de consumir, conclui/abandona com segurança e confirma mensagem |
| n8n | Rolling controlado | Workflows versionados e credenciais externas |
| Migração | Job único antes da aplicação | Lock e timeout explícitos |

Readiness da API só fica positiva após conexões essenciais e migrations compatíveis. Liveness não deve depender de provedor externo. O worker implementa encerramento gracioso e não confirma mensagem antes da persistência/publicação do resultado.

### 8.5 Ambientes

| Ambiente | Finalidade | Dados |
| --- | --- | --- |
| Local | Desenvolvimento individual | Fixtures sintéticas |
| CI | Testes efêmeros | Dados gerados por teste |
| Staging | Validação integrada e homologação | Sintéticos ou anonimizados |
| Produção | Operação real | Acesso restrito e backup |

Não copiar banco de produção integralmente para ambientes inferiores. Se uma amostra for necessária, usar pipeline de anonimização verificado.

### 8.6 Configuração e feature flags

- configuração por ambiente, sem rebuild da imagem;
- segredos por referência ao secret manager;
- feature flags para novo score, novo provedor, novo prompt e envio por canal;
- flags possuem proprietário, motivo, data de expiração e valor padrão seguro;
- alterações de flag críticas são auditadas;
- política de score e prompt usam versões de domínio, não apenas flags.

### 8.7 Rollback e recuperação

Aplicação:

- rollback para digest anterior;
- feature flag para desativar caminho novo;
- compatibilidade de schema preservada por *expand/contract*.

Jobs:

- pausar consumidores;
- preservar mensagens não confirmadas;
- mover poison messages para DLQ;
- reprocessar por operação idempotente e auditada.

Banco:

- backups automáticos e PITR quando disponível;
- runbook de restauração;
- restauração testada fora de produção;
- migração destrutiva separada por releases.

### 8.8 Logs estruturados

Formato JSON com campos mínimos:

```json
{
  "timestamp": "2026-09-19T22:10:11.492Z",
  "level": "INFO",
  "service": "core-api",
  "environment": "production",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "correlationId": "01K5HAXQ9P1FGXT9G5XXH1X6A4",
  "organizationId": "0199a001-e4de-7973-a386-e43a1f88b811",
  "event": "lead.score.calculated",
  "leadId": "0199a91a-b178-7af9-a972-99c1d1eaaf10",
  "policyVersion": "2026-09-v1",
  "durationMs": 18
}
```

Não registrar:

- access/refresh tokens;
- senhas, chaves ou cookies;
- HTML completo;
- payload bruto de fornecedor;
- conteúdo integral de proposta/mensagem;
- telefone/e-mail completos sem necessidade operacional.

### 8.9 Métricas

Técnicas:

- taxa, latência e erro HTTP por rota normalizada;
- conexões e queries lentas do banco;
- hit rate e erros do Redis;
- profundidade, idade e consumo das filas;
- duração, sucesso, retry e DLQ por job;
- CPU/memória/restarts do worker;
- duração e falhas por fase da auditoria;
- latência e erro de provedores;
- uso, latência e custo de IA.

Negócio:

- empresas descobertas por campanha/provedor;
- taxa de duplicação;
- percentual com site/sem site;
- auditorias concluídas;
- distribuição de score/faixa;
- taxa de revisão/aprovação de diagnóstico;
- leads por estágio;
- tempo entre descoberta, qualificação e contato;
- conversão por segmento, cidade, score e tipo de oferta;
- opt-outs e falhas de contato.

Métricas não devem usar `leadId`, URL ou `organizationId` como label de alta cardinalidade. Esses valores pertencem a logs/traces.

### 8.10 Tracing

OpenTelemetry propaga contexto em:

- browser/web → API;
- API → PostgreSQL/Redis/provedor;
- API → Outbox → RabbitMQ;
- RabbitMQ → worker;
- worker → armazenamento de objetos/callback;
- API → provedor de IA.

Mensagens carregam W3C Trace Context. O trace deve permitir responder: qual campanha gerou o lead, qual comando solicitou a auditoria, qual tentativa falhou e qual score consumiu o resultado.

### 8.11 Dashboards operacionais

Dashboard mínimo de produção:

1. **Visão geral:** tráfego, erro, latência e disponibilidade;
2. **Jobs:** fila, idade, retries, DLQ e throughput;
3. **Auditoria:** duração por etapa, falhas por categoria e consumo de recursos;
4. **Provedores:** cota, latência, erro e custo;
5. **Banco:** conexões, locks, query lenta e armazenamento;
6. **Negócio:** descoberta, qualificação, score e avanço no funil.

### 8.12 Alertas e SLOs

| Sinal | Condição inicial | Severidade |
| --- | --- | --- |
| API indisponível | erro de disponibilidade por 5 min | Crítica |
| Erro HTTP | 5xx > 5% por 10 min | Alta |
| Latência | p95 > 400 ms por 15 min (violação do SLO) | Média |
| Latência (degradação severa) | p95 > 1 s por 15 min | Alta |
| Fila envelhecida | mensagem mais antiga > 10 min | Alta |
| DLQ | qualquer crescimento sustentado | Alta |
| Auditoria | sucesso < 85% por 30 min, descontando URL inválida | Média |
| Banco | pool > 85% ou lock prolongado | Alta |
| Disco/objetos | projeção de esgotamento < 7 dias | Alta |
| Provedor | cota > 80% ou 429 crescente | Média |
| Custo IA | desvio > limite diário configurado | Média |

SLO inicial da API: 99,5% de disponibilidade mensal e 95% das leituras comuns abaixo de 400 ms. Jobs possuem SLO separado: 95% das auditorias iniciadas em até 5 minutos sob carga nominal.

### 8.13 Runbooks obrigatórios

Manter em `docs/runbooks/`:

- API com taxa alta de 5xx;
- banco indisponível ou saturado;
- fila crescendo;
- mensagens na DLQ;
- worker com vazamento de memória/Chromium preso;
- provedor Places/LLM indisponível;
- rotação de credencial comprometida;
- rollback de release;
- restauração de banco;
- exclusão/anonimização de titular;
- incidente de envio indevido;
- auditoria bloqueada por política SSRF.

### 8.14 Roadmap técnico sugerido

| Fase | Entregas |
| --- | --- |
| 0 — Fundação | Repositório, Compose (api/worker/web em container), CI, identidade, PostgreSQL, Prisma Migrate, observabilidade básica |
| 1 — Descoberta | Campanhas, um conector, importação CSV, normalização, deduplicação e lista de leads |
| 2 — Auditoria | Worker, RabbitMQ, Playwright, Lighthouse, MinIO/S3, findings e retries |
| 3 — Qualificação | Score versionado, Top 10, revisão humana e métricas de qualidade |
| 4 — Inteligência | Diagnóstico estruturado, evidências, revisão e proposta |
| 5 — CRM | Funil, atribuição, atividades, próxima ação e relatórios |
| 6 — Outreach | Aprovação, integração de canal, supressão e rastreabilidade |
| 7 — Escala | Novos conectores, otimização, multi-tenant comercial e extração de serviços apenas se justificada |

O primeiro release utilizável termina na Fase 3. As fases 4–6 só devem avançar após a validação de que a descoberta e o score produzem leads comercialmente úteis.
