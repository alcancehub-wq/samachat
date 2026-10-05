# P02-R15-H01 - Hardening aditivo de imutabilidade R10

MODE=CONTROLLED_ISOLATED_CORRECTIVE_IMPLEMENTATION; RISK=R3;
SCOPE=SAMACHAT_ONLY; PRODUCTION_ACTIVATION=FORBIDDEN;
PRODUCTION_DATABASE_MUTATION=FORBIDDEN; R15_EXISTING_WORKTREE=PROTECTED.
Base exclusiva R14: `f1cb4d6590d560eb6d979b90f9ecdccb298f82c9`.
Nenhum arquivo da worktree R15 foi usado como base ou alterado.

## Defeito E Expressao Comprovada

R10 compara textos usando `NEW.field <=> OLD.field`. `utf8mb4_bin` e PAD SPACE
no MariaDB 10.11.10: corpo com espaco final tem bytes diferentes, mas compara
igual. H01 reproduziu o UPDATE aceito com bodyHash anterior e hash inconsistente.
O RED de rejeicao falhou antes da correcao; a reproducao historica continua no
harness e nao e homologacao de seguranca do R10 original.

No banco fisicamente guardado, `CAST(value AS BINARY)` sem tamanho fixo distinguiu
espaco final, case, UTF-8 e os bytes do corpo persistido. `<=>` preserva NULL-safe:
NULL/NULL iguais, NULL/string vazia diferentes. Nao se trocou nenhuma collation.

Migration nova: `20261003125100-harden-crm-origin-immutability.ts`.
Migration R10 original permanece inalterada.
Os dois triggers conservam nomes, eventos BEFORE UPDATE ROW e SQLSTATE 45000.
Em cada texto imutavel, a condicao passa a ser:

```sql
NOT (CAST(NEW.field AS BINARY) <=> CAST(OLD.field AS BINARY))
```

Journal: eventId, correlationId, sourceInstanceId, integrationId, organizationId,
sourceContactId, operation, canonicalBody, bodyHash, semanticHash, provenance,
provider, occurredAt e commercialOperation: 14 textos protegidos por bytes.
sourceRevision/schemaVersion e createdAt conservam `<=>` numerico/temporal.
Command: captureKey, sourceInstanceId, integrationId, organizationId e inputHash:
5 textos protegidos por bytes; createdAt conserva comparacao temporal.
outcome preserva a escrita inicial e fica imutavel depois:

```sql
OLD.outcome IS NOT NULL AND
NOT (CAST(NEW.outcome AS BINARY) <=> CAST(OLD.outcome AS BINARY))
```

NULL -> primeiro resultado valido e NULL -> NULL continuam permitidos.
Depois de preenchido, troca/null/trailing whitespace sao rejeitados.
Estado, CAS, stateVersion, attemptCount, lease, fencing, receipt e updatedAt
continuam fora da lista imutavel; nenhum contrato M2M/comercial foi modificado.

## Preflight E Pos-Verificacao

`up` exige database ativo/case mode conhecido, as duas tabelas InnoDB/R10,
colunas/tipos/nullability/comprimentos/signedness/collations conhecidos,
PKs/indices R10 com ordem/unicidade/BTREE sem prefixo, e exatamente os triggers
originais conhecidos ou os dois endurecidos conhecidos. Extra/missing/no-op/
definicao divergente e instalacao mista sao recusados, sem reparo automatico.

Antes de DDL, SQL agregado verifica SHA2(canonicalBody) versus bodyHash por bytes,
JSON dos corpos/receipts/outcomes e invariantes de revisao/schema/counters/comercial.
Nao reconstitui o input original de inputHash ou uma auditoria completa de dados.
Corrupcao observada R15 e recusada, nao corrigida ou incorporada silenciosamente.

`up` substitui DROP/CREATE dos dois triggers sequencialmente e reinspeciona schema,
definicoes completas e checks de dados. Nao e transacao DDL atomica.
Falha DDL/pos-check lanca `H01_DDL_OR_POSTCHECK_FAILED_REQUIRES_WRITER_FREEZE`.
Ausencia/instalacao parcial exige intervencao explicita: retry nao conserta parcial
nem restaura automaticamente definicoes vulneraveis. Rerun somente quando os dois
triggers endurecidos estiverem integros e dados validos e idempotente.
`verify(queryInterface)` permite reinspecao read-only do contrato instalado;
equivalencia de definicao nao substitui as provas comportamentais em SQL.

`down` sempre lanca `H01_AUTOMATIC_ROLLBACK_FORBIDDEN`, inclusive em tabelas vazias.
Nao apaga registros nem devolve os triggers vulneraveis.

## Laboratorio E Provas

MariaDB10.11.10,127.0.0.1:55448,`r15h01_immutability_lab`,datadir NOVO exclusivo
backend/node_modules/.cache/r15h01-immutability-lab/data/ da worktree H01.
Opt-in: CRM_IMMUTABILITY_H01_LAB_ENABLED=1. Binario existente read-only.
Guards datadir/versao/bind/porta/database antes de preparar ou alterar fixture;
conexao independente e ORM conferem a identidade. Nenhum dado R10-R15 reutilizado.
R10 original aplicado somente neste laboratorio, restaurado entre os casos.

Matriz SQL A-E: 52 casos distintos. Rejeicoes com SQLSTATE45000 e confronto
HEX(CAST(column AS BINARY)) de TODAS as colunas antes/depois por conexao separada.
Textos testados dentro da capacidade VARCHAR: overflow/truncamento nao sao
confundidos com alteracao dos bytes efetivamente persistidos.

- A: witness PAD SPACE original preservado, hash inconsistente reproduzido.
- B: 14 textos/numero/datas,espacos inicial/final/multiplos,tab/newline,case,
  UTF-8 2/4 bytes; linha inteira preservada nas rejeicoes.
- C: 5 textos de command/createdAt e primeira escrita/outcome/null/rewrite.
- D: repository real CAS/recovery/fencing,7 estados,receipt/replay duraveis,
  hash e identidade imutaveis; producers R11/R12 reais com replay/revision2,
  extraInfo/tags e outcome gravados legitimamente.
- E: schema/migration recusam ausencias/engine/colunas/indice,corruption,
  post-check recusa triggers ausentes/ineficazes,DDL interrompido nao recupera
  silenciosamente,rerun integro idempotente e down bloqueado.

Regressoes unitarias realmente executadas R10/R11/R12/R13: 28 casos (12/5/6/5).
R14 e demais suites SQL historicas nao reexecutadas nem somadas ao total.
HTTP/HTTPS nativos bloqueados no harness; transport/gateway CRM nao invocados.
Webhook generico e modelos source substituidos somente por fixtures reais SQL.
Contagens finais,strict/comparativo,hashes e falhas intermediarias no TXT externo.
Build/typecheck global nao homologados. PES/SAMACON completos nao fornecidos;
nenhuma certificacao integral ficticia.

## Aplicacao Operacional Futura: Nao Executada

Exige autorizacao humana separada, inventario de todas as instancias escritoras,
parada/bloqueio efetivo de writers (inclusive backends/workers fora da instancia),
janela de manutencao,backup consistente de dados/metadata/SequelizeMeta/triggers,
auditoria de hashes e reconciliacao de corrupcao preexistente,com recuperacao
planejada/testada. A migration NAO congela writers externos automaticamente.

Manter writers parados durante DROP/CREATE e em qualquer falha/interrupcao.
Identificar estado parcial,comparar com as definicoes conhecidas e recuperar
somente sob controle humano para o contrato endurecido; executar `verify` e
provas de bytes/NULL/transicoes antes de liberar escritores. Nao usar retry como
reparo generico nem down para degradar a protecao. Nenhum procedimento operacional
ou SQL de banco real foi executado neste pacote; feature push nao e deploy.

## Contrato De Reconciliacao Futura R15

H01 NAO conclui/publica R15 e nao muda seu status BLOCKED.
Os nove paths locais/HEAD/status/hashes R15 permanecem protegidos conforme TXT R15.
Futura incorporacao exige novo pacote autorizado e base que contenha H01,
sem checkout/reset/clean/stash/merge/cherry-pick/rebase sobre a worktree R15 atual.
Inventariar/exportar evidence/fingerprints antes,conciliar os nove paths por diff
em isolamento e comparar cada conflito,sem sobrescrever o gate/fixtures/docs.

Atualizar a verificacao R15 para reconhecer EXCLUSIVAMENTE as duas definicoes
endurecidas H01,nao aceitar PAD SPACE vulneravel nem supor collation bin suficiente.
Conservar witness original como controle negativo e aplicar R10+H01 no novo lab
R15; reaplicar todos positivos/negativos SQL,regressoes e matriz operacional.
Mesmo eventual R15 lab PASS nao autoriza producao. Nenhuma reconciliacao/R16
foi iniciada automaticamente.