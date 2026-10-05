# P02-R19-R02 — Contrato de Mapping Tipado SamaChat → CRM

MODE=DOCUMENTAL_ONLY  
RISK=R3  
IMPLEMENTATION=NOT_STARTED  
DATABASE_MUTATION=FALSE  
PRODUCTION_ACTIVATION=FALSE

## 1. Objetivo

Definir o contrato tipado que associa uma Integration administrativa do SamaChat
à identidade/configuração técnica do motor P02 M2M.

Este pacote NÃO implementa migration, model, provider, secret resolver, caller,
executor, endpoint remoto, H01 ou ativação produtiva.

## 2. Princípio de separação

A entidade legada `Integration` permanece administrativa e compatível com o
produto existente.

Os seguintes campos legados NÃO são identidade nem autorização P02:

- Integration.apiKey
- Integration.isActive
- Integration.type
- Webhook.secret
- Webhook.url
- Webhook.headers
- Webhook.isActive

`Integration.isActive = true` NÃO significa `M2M enabled`.

O `apiKey` legado NÃO pode ser reutilizado como segredo M2M.

O webhook legado NÃO pode ser reutilizado como transporte P02.

## 3. Modelo proposto

Criar futuramente, por migration aditiva própria, uma entidade dedicada:

`CrmIntegrationMappings`

Relação:

`Integrations.id 1 ---- 0..1 CrmIntegrationMappings.integrationId`

Nenhuma alteração destrutiva em `Integrations`.

## 4. Campos do mapping

### integrationId

Tipo alvo: INTEGER.

Foreign key para `Integrations.id`.

Também deve ser UNIQUE, garantindo no máximo um mapping P02 por Integration
administrativa.

Este é o ID LOCAL administrativo e NÃO é o mesmo valor de
`CrmM2mIdentity.integrationId`.

### m2mIntegrationId

Tipo conceitual: string não vazia, máximo 100 caracteres.

Alimenta:

`CrmM2mIdentity.integrationId`

Deve possuir identidade técnica estável e explícita.

Não pode ser derivado de nome da integração, usuário, conexão WhatsApp,
pipeline ou secret.

### organizationId

Tipo conceitual: UUID v4.

Alimenta:

`CrmM2mIdentity.organizationId`

Deve corresponder a uma organização CRM explicitamente aprovada.

Nenhuma organização pode ser selecionada automaticamente por:

- nome;
- quantidade de contatos;
- quantidade de negócios;
- posição na tabela;
- "default";
- integração legada existente.

R18 identificou uma candidata operacional, porém P19 não a provisiona sem
aprovação explícita.

### sourceInstanceId

Tipo conceitual: string não vazia, máximo 100 caracteres.

Alimenta:

`CrmM2mIdentity.sourceInstanceId`

Deve identificar de forma estável o escopo fonte utilizado pelo journal.

Não pode ser derivado automaticamente de hostname efêmero de container,
WhatsApp connection id, usuário SDR ou Integration.id.

Como o journal P02 possui identidade/revisão scoped por sourceInstanceId,
o valor precisa impedir colisão entre mappings independentes.

### endpoint

URL HTTPS explícita do gateway P02 aprovado.

Não pode conter username, password ou fragment.

Não pode apontar para:

- webhook.site;
- lead-webhook legado;
- webhook genérico;
- endpoint comercial SDR.

### approvedEndpoint

Pin lógico do endpoint homologado.

Na configuração efetiva de entrega:

`endpoint === approvedEndpoint`

é obrigatório.

Mudança de destino exige reconciliação/provisionamento explícito; nunca fallback
automático.

### keyId

Identificador público da chave M2M.

Contrato existente:

`^[A-Za-z0-9._:-]{1,100}$`

Não contém o segredo.

### secretReference

Referência opaca server-side para o segredo M2M.

O valor real do segredo NÃO deve ser persistido na tabela de mapping,
response HTTP, frontend, log ou release note.

O resolver futuro deverá produzir `Uint8Array`/Buffer de pelo menos 32 bytes
somente no backend autorizado.

É proibido resolver o segredo a partir de:

- Integration.apiKey;
- Webhook.secret;
- Webhook.headers;
- variável fornecida pelo frontend;
- corpo de request;
- dado de contato.

### m2mEnabled

Boolean.

DEFAULT obrigatório: FALSE.

É um gate próprio do P02.

Não herda `Integration.isActive`.

Criar/editar/ativar uma Integration administrativa não liga este campo.

P19 não autoriza alterar este valor para TRUE em produção.

### mappingVersion

Inteiro positivo.

Começa em 1.

Qualquer alteração futura de identidade/destino/security reference deverá
incrementar a versão de forma controlada.

Não substitui `sourceRevision` dos contatos.

### createdAt / updatedAt

Timestamps técnicos do mapping.

Não autorizam captura nem entrega.

## 5. Constraints propostas

Obrigatórias no desenho:

1. PK própria ou PK/FK sobre integrationId.
2. UNIQUE(integrationId).
3. UNIQUE(sourceInstanceId).
4. m2mIntegrationId obrigatório e <= 100.
5. organizationId obrigatório e UUID v4 válido.
6. sourceInstanceId obrigatório e <= 100.
7. endpoint obrigatório e HTTPS.
8. approvedEndpoint obrigatório e exatamente igual ao destino aprovado.
9. keyId obrigatório e dentro do contrato existente.
10. secretReference obrigatório quando o mapping for provisionado.
11. m2mEnabled DEFAULT FALSE.
12. mappingVersion >= 1.

Nenhuma constraint deve criar negócio, contato CRM, pipeline, oportunidade,
handoff ou efeito comercial.

## 6. Ownership de software

### IntegrationServices

Responsável por:

- CRUD administrativo legado;
- localizar referência local `Integration.id`;
- consultar existência do mapping quando explicitamente solicitado;
- nunca resolver segredo;
- nunca disparar entrega M2M por simples CRUD de Integration.

### CrmIntegrationServices

Responsável por:

- validar mapping tipado;
- montar `CrmM2mIdentity`;
- resolver `secretReference` por provider server-side autorizado;
- montar `DeliveryCoordinatorConfiguration`;
- validar endpoint/keyId/policy;
- manter default disabled;
- jamais reutilizar WebhookSender legado.

## 7. Provider proposto

Contrato futuro conceitual:

`LoadCrmIntegrationMapping(integrationId)`

Saída segura:

- localIntegrationId
- m2mIntegrationId
- organizationId
- sourceInstanceId
- endpoint
- approvedEndpoint
- keyId
- secretReference
- m2mEnabled
- mappingVersion

Não retorna segredo real.

## 8. Secret resolver proposto

Contrato futuro conceitual:

`ResolveCrmM2mSecret(secretReference)`

Regras:

- backend only;
- nenhum valor em log;
- nenhum valor em JSON de API;
- nenhum valor persistido no mapping;
- mínimo de 32 bytes validado;
- erro fail-closed;
- rotação posterior deve preservar keyId/referência/versionamento de forma
  explícita.

P19-R02 não escolhe tecnologia de vault sem evidência operacional aprovada.

## 9. Gates independentes

Para existir entrega produtiva, todos os gates abaixo continuam independentes:

1. Integration administrativa existente.
2. Mapping P02 existente.
3. Mapping semanticamente válido.
4. Secret reference resolvível.
5. Endpoint homologado.
6. Schema/journal SamaChat provisionado.
7. H01 aprovado/aplicado.
8. CRM M2M gateway/schema provisionados.
9. Caller autorizado.
10. Executor autorizado.
11. m2mEnabled explicitamente autorizado.
12. decisão humana de ativação produtiva.

Falhar qualquer gate => fail closed.

## 10. Relação com estado atual

R18 comprovou:

- infraestrutura legada de Integration/Webhook existe;
- webhook `contact.created` legado não é P02;
- `lead-webhook` comercial legado não é P02;
- journal P02 não está provisionado em produção;
- H01 não está aplicado em produção;
- gateway/schema M2M CRM não estão provisionados;
- callers produtivos não estão habilitados;
- executor produtivo não está habilitado.

Portanto o mapping deste P19 deve permanecer default OFF.

## 11. Organização CRM

Nenhum `organizationId` real é provisionado neste R02.

A seleção de organização precisa ser explícita e auditável.

A existência de uma organização operacional dominante no CRM é evidência para
decisão humana, não autorização automática.

## 12. Compatibilidade legada

P19 deve preservar integralmente:

- CRUD de Integrations;
- CRUD de Webhooks;
- eventos legados;
- testes de webhook;
- Eduzz;
- lead-webhook;
- sockets existentes;
- permissões atuais.

Nenhum código legado deve passar a acionar o P02 apenas porque
`Integration.type = "crm"`.

## 13. Segurança contra ativação acidental

Devem existir no mínimo dois gates distintos futuros:

- configuração/mapping P02 válido;
- autorização explícita de execução.

`Integration.isActive`, existência de secretReference ou presença de endpoint
não são autorização suficiente.

## 14. Fora de escopo

P19-R02 NÃO autoriza:

- migration;
- CREATE TABLE;
- alteração de Integrations;
- segredo real;
- chamada remota;
- H01;
- journal;
- wiring Create/Update;
- WhatsApp automático;
- executor;
- E2E;
- criação de contato CRM;
- criação de negócio;
- oportunidade;
- handoff;
- agente SDR;
- commit;
- push;
- deploy.

## 15. Critério de aceite R02

R02 passa somente se:

- desenho mantém Integration legado separado;
- identidade P02 usa exatamente organizationId/integrationId/sourceInstanceId;
- segredo é referenciado, nunca reutiliza apiKey legado;
- endpoint P02 não reutiliza Webhook/lead-webhook;
- default permanece OFF;
- organização real não é escolhida automaticamente;
- nenhuma mutação produtiva ocorreu.

Estado esperado:

`P19_R02=PASS_DOCUMENTAL_LOCAL`

Próximo passo permitido após aprovação:

`P19-R03 = desenho técnico de schema/provider e testes, ainda sem provisionamento produtivo`.
