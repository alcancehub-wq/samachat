# P02-R19-R03 — Desenho Técnico de Schema, Provider e Testes

MODE=DOCUMENTAL_ONLY  
RISK=R3  
IMPLEMENTATION=NOT_STARTED  
DATABASE_MUTATION=FALSE  
PRODUCTION_ACTIVATION=FALSE

## 1. Dependência normativa

Este desenho concretiza o contrato aprovado em:

`P02-R19-R02-CONTRATO-MAPPING-TIPADO.md`

Nenhuma decisão deste documento autoriza migration produtiva, segredo real,
caller, executor ou entrega remota.

## 2. Delta mínimo futuro

O menor delta coerente para implementar o mapping será composto por:

1. migration aditiva para `CrmIntegrationMappings`;
2. model Sequelize `CrmIntegrationMapping`;
3. registro explícito do model em `backend/src/database/index.ts`;
4. validator/provider no domínio `CrmIntegrationServices`;
5. interface de resolução de segredo, sem tecnologia concreta implícita;
6. testes unitários/determinísticos direcionados;
7. nenhuma alteração em WebhookSender;
8. nenhuma ativação automática.

## 3. Migration proposta

Path futuro:

`backend/src/database/migrations/20261005100000-create-crm-integration-mappings.ts`

Tabela:

`CrmIntegrationMappings`

Engine:

`InnoDB`

Charset:

`utf8mb4`

Collation:

`utf8mb4_bin`

### 3.1 Colunas

#### integrationId

- INTEGER;
- NOT NULL;
- PRIMARY KEY;
- FOREIGN KEY -> `Integrations.id`;
- relação 1:1 por construção;
- não representa `CrmM2mIdentity.integrationId`.

Política proposta de FK:

`ON UPDATE CASCADE`
`ON DELETE RESTRICT`

Motivo: um mapping técnico não deve desaparecer silenciosamente por deleção
administrativa da Integration.

O serviço futuro deverá produzir erro controlado antes da violação de FK.

#### m2mIntegrationId

- STRING(100);
- NOT NULL.

Alimenta:

`CrmM2mIdentity.integrationId`

Não é derivado de `Integrations.id`, nome, usuário ou conexão WhatsApp.

#### organizationId

- STRING(36);
- NOT NULL.

Alimenta:

`CrmM2mIdentity.organizationId`

Validação semântica obrigatória: UUID v4.

Nenhum UUID produtivo é provisionado neste pacote.

#### sourceInstanceId

- STRING(100);
- NOT NULL;
- UNIQUE.

Alimenta:

`CrmM2mIdentity.sourceInstanceId`

A unicidade evita colisão entre journals de instalações distintas.

#### endpoint

- STRING(2048);
- NOT NULL.

Validação no provider:

- HTTPS;
- sem username;
- sem password;
- sem fragment;
- não pode ser webhook.site;
- não pode ser lead-webhook legado;
- não pode ser rota genérica Webhook do SamaChat.

#### approvedEndpoint

- STRING(2048);
- NOT NULL.

Regra:

`endpoint === approvedEndpoint`

antes de qualquer configuração poder ser considerada válida.

#### keyId

- STRING(100);
- NOT NULL.

Contrato:

`^[A-Za-z0-9._:-]{1,100}$`

#### secretReference

- STRING(255);
- NOT NULL.

Contém somente referência opaca.

Nunca contém segredo M2M real.

#### m2mEnabled

- BOOLEAN;
- NOT NULL;
- DEFAULT FALSE.

Não herda `Integrations.isActive`.

#### mappingVersion

- INTEGER;
- NOT NULL;
- DEFAULT 1.

Validação:

inteiro seguro >= 1.

#### createdAt

- DATE;
- NOT NULL.

#### updatedAt

- DATE;
- NOT NULL.

## 4. Índices e constraints

Obrigatórios:

- PRIMARY KEY (`integrationId`);
- UNIQUE (`sourceInstanceId`);
- FK `integrationId -> Integrations.id`.

Não criar UNIQUE global em `organizationId`.

Não criar UNIQUE global em `m2mIntegrationId` neste momento, pois a identidade
efetiva é composta pelo contrato explícito entre organização, integração e
instância fonte.

Validações semânticas complexas permanecem no provider fail-closed, e não serão
delegadas a CHECKs dependentes de comportamento específico do servidor.

## 5. Rollback da migration

O `down` futuro NÃO poderá descartar silenciosamente mapping existente.

Contrato proposto:

- se `CrmIntegrationMappings` estiver vazia: drop permitido;
- se houver qualquer linha: lançar erro explícito de preservação;
- nenhuma deleção automática de configuração;
- nenhuma alteração em `Integrations`.

Código de erro proposto:

`CRM_MAPPING_ROLLBACK_REQUIRES_DATA_PRESERVATION`

## 6. Model Sequelize proposto

Path:

`backend/src/models/CrmIntegrationMapping.ts`

Campos:

- integrationId;
- m2mIntegrationId;
- organizationId;
- sourceInstanceId;
- endpoint;
- approvedEndpoint;
- keyId;
- secretReference;
- m2mEnabled;
- mappingVersion;
- createdAt;
- updatedAt.

Associação:

`BelongsTo(() => Integration)`

Não adicionar `HasOne` em `Integration.ts` no primeiro delta, salvo necessidade
demonstrada pelos testes.

Objetivo: minimizar alteração do domínio legado.

## 7. Registro de model

Arquivo futuro alterado:

`backend/src/database/index.ts`

A única responsabilidade deste delta nesse arquivo será:

- importar `CrmIntegrationMapping`;
- adicioná-lo ao array `models`.

Nenhum bootstrap de executor ou chamada remota será inserido.

## 8. Tipo seguro do provider

Path futuro:

`backend/src/services/CrmIntegrationServices/CrmIntegrationMappingService.ts`

Tipo conceitual:

`CrmIntegrationMappingSnapshot`

Campos:

- localIntegrationId: number;
- identity:
  - integrationId: string;
  - organizationId: string;
  - sourceInstanceId: string;
- endpoint: string;
- approvedEndpoint: string;
- keyId: string;
- secretReference: string;
- enabled: boolean;
- mappingVersion: number.

Não contém:

- Integration.apiKey;
- Webhook.secret;
- Webhook.headers;
- segredo M2M real.

## 9. Funções propostas

### ValidateCrmIntegrationMapping

Entrada:

mapping persistido.

Responsabilidades:

- validar IDs;
- validar UUID v4;
- validar comprimentos;
- validar endpoint HTTPS;
- rejeitar userinfo/hash;
- exigir equality endpoint/approvedEndpoint;
- validar keyId;
- validar secretReference não vazia;
- validar mappingVersion;
- manter `enabled` explícito.

Erro fail-closed proposto:

`CRM_MAPPING_INVALID`

### LoadCrmIntegrationMapping

Entrada:

`integrationId: number`

Resultado:

- `null` se mapping não existe;
- snapshot tipado se existe e é válido;
- erro fail-closed se existe mas é inválido.

Não resolve segredo.

Não acessa rede.

Não dispara webhook.

Não muda banco.

### BuildCrmM2mIdentityFromMapping

Entrada:

snapshot validado.

Saída:

exatamente:

- integrationId;
- organizationId;
- sourceInstanceId.

Nenhuma inferência adicional.

## 10. Secret resolver

Path/interface futura proposta:

`backend/src/services/CrmIntegrationServices/CrmM2mSecretResolver.ts`

Contrato:

`resolve(secretReference: string): Promise<Uint8Array>`

Neste P19 não existe implementação concreta obrigatória.

Razão:

nenhum secret-reference provider/vault homologado foi encontrado na base atual.

É proibido criar fallback para:

- Integration.apiKey;
- Webhook.secret;
- process.env genérico não mapeado;
- body HTTP;
- frontend;
- banco de contatos.

Falha de resolução => fail closed.

## 11. Construção de configuração

Um helper futuro poderá receber:

- snapshot validado;
- resolver explicitamente injetado;
- transport explicitamente injetado;
- policy explicitamente injetada.

Somente depois poderá produzir:

`DeliveryCoordinatorConfiguration`

O provider não chamará `CrmDeliveryCoordinator.runOnce`.

Construir configuração != executar entrega.

## 12. Comportamento default OFF

Cenários obrigatórios:

- Integration existe, mapping não existe => P02 indisponível;
- mapping existe, `m2mEnabled=false` => P02 desabilitado;
- Integration.isActive=true sozinho => P02 continua desabilitado;
- Webhook ativo sozinho => P02 continua desabilitado;
- secretReference presente sozinho => P02 continua desabilitado;
- endpoint válido sozinho => P02 continua desabilitado.

## 13. Relação com IntegrationServices

Nenhum CRUD existente de Integration será alterado neste primeiro delta.

Em particular:

`CreateIntegrationService`
não cria mapping automaticamente.

`UpdateIntegrationService`
não cria, ativa ou altera mapping automaticamente.

`DeleteIntegrationService`
deverá ser confrontado antes de qualquer mapping real ser provisionado para
produzir comportamento controlado diante da FK RESTRICT.

Isso será gate separado antes de provisionamento real.

## 14. Plano de testes

### T01 — mapping inexistente

`LoadCrmIntegrationMapping(id)` retorna `null`.

Zero rede.

### T02 — mapping válido disabled

Snapshot válido com:

`enabled=false`.

Nenhuma entrega.

### T03 — Integration.isActive não autoriza P02

Integration ativa sem mapping ou com mapping disabled permanece sem entrega.

### T04 — apiKey legado ignorado

Presença/alteração de `Integration.apiKey` não modifica identidade, segredo ou
enabled P02.

### T05 — Webhook legado ignorado

Webhook ativo, URL, secret e headers não entram no mapping.

### T06 — organizationId inválido

UUID ausente/não-v4 => `CRM_MAPPING_INVALID`.

### T07 — sourceInstanceId inválido

Vazio ou >100 => rejeição.

### T08 — m2mIntegrationId inválido

Vazio ou >100 => rejeição.

### T09 — endpoint HTTP

`http:` => rejeição.

### T10 — endpoint com credenciais

username/password => rejeição.

### T11 — endpoint com fragment

fragment/hash => rejeição.

### T12 — endpoint não pinado

`endpoint !== approvedEndpoint` => rejeição.

### T13 — endpoint legado

webhook.site ou rota lead-webhook conhecida => rejeição.

### T14 — keyId inválido

fora de `^[A-Za-z0-9._:-]{1,100}$` => rejeição.

### T15 — secretReference vazio

=> rejeição.

### T16 — mappingVersion

0, negativo, fracionário ou unsafe => rejeição.

### T17 — identity exata

`BuildCrmM2mIdentityFromMapping` produz somente os três campos do contrato.

### T18 — nenhuma resolução de segredo no loader

Loader nunca retorna segredo real nem invoca resolver.

### T19 — resolver fail closed

resolver ausente/falha => configuração de entrega não é produzida.

### T20 — segredo curto

quando futuramente resolvido, <32 bytes permanece rejeitado pelo contrato
existente do coordenador.

### T21 — migration default

`m2mEnabled` default FALSE.

### T22 — migration unicidade

segunda linha com mesmo `sourceInstanceId` deve falhar.

### T23 — FK

mapping sem Integration correspondente deve falhar.

### T24 — rollback com dados

down com mapping existente deve falhar com preservação.

### T25 — regressão Integration

Create/Update de Integration continuam sem criar mapping ou ativar M2M.

## 15. Estratégia de execução dos testes

NÃO executar:

`npm test`

Motivo:

os scripts `pretest` e `posttest` do backend executam migration/seed e
`db:migrate:undo:all`.

Quando houver implementação autorizada, usar somente execução Jest direcionada,
por exemplo:

`npx jest --runInBand <specs P19>`

e typecheck/build isolado sob gate próprio.

Nenhum teste deve usar banco produtivo.

## 16. Arquivos futuros esperados

Possíveis arquivos de implementação:

- backend/src/database/migrations/20261005100000-create-crm-integration-mappings.ts
- backend/src/models/CrmIntegrationMapping.ts
- backend/src/database/index.ts
- backend/src/services/CrmIntegrationServices/CrmIntegrationMappingService.ts
- backend/src/services/CrmIntegrationServices/CrmM2mSecretResolver.ts
- backend/src/services/CrmIntegrationServices/__tests__/CrmIntegrationMappingService.spec.ts

A lista é contrato de desenho, não autorização para criar todos os arquivos de
uma vez.

## 17. Sequência de implementação futura

R04A:
migration + model + registro, somente local.

R04B:
validator/loader puro.

R04C:
interface de secret resolver, sem secret real.

R04D:
testes direcionados.

R04E:
typecheck + Jest direcionado + diff gate.

Nenhuma etapa inclui aplicação de migration em produção.

## 18. Gates antes de provisionamento

Antes de inserir qualquer mapping real:

- CRM gateway M2M deve existir;
- CRM schema/RPC/receipts devem existir;
- organizationId precisa ser explicitamente aprovado;
- secret custody precisa ser definida;
- endpoint precisa estar homologado;
- SamaChat journal/H01 precisam seguir o pacote próprio;
- caller e executor continuam desligados.

## 19. Estado esperado

`P19_R03=PASS_DOCUMENTAL_LOCAL`

Próximo passo permitido:

`P19-R04A = implementação local isolada de migration/model somente`

Ainda proibido:

- aplicar migration;
- provisionar mapping real;
- armazenar secret;
- conectar CRM;
- ativar caller;
- executar coordenador;
- commit;
- push;
- deploy.
