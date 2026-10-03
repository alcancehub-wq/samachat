# P02-R15 - Gate diagnostico: BLOCKED

MODE=CONTROLLED_ISOLATED_IMPLEMENTATION; SCOPE=SAMACHAT_ONLY; RISK=R3.
PRODUCTION_ACTIVATION=FORBIDDEN; PRODUCTION_DATABASE_ACCESS=FORBIDDEN.
Base R14: `f1cb4d6590d560eb6d979b90f9ecdccb298f82c9`.
Worktree/branch R15 isoladas, sem commit/push por falta de PASS.

## Bloqueio Discriminante

O requisito de imutabilidade efetiva nao foi comprovado. Na migration R10
inalterada, `crm_origin_journal_immutable` compara `NEW`/`OLD` com `<=>`.
A coluna `canonicalBody` e TEXT com collation `utf8mb4_bin` (PAD SPACE).
No MariaDB sintetico R15, `canonicalBody = canonicalBody + ' '` alterou a linha
sem SIGNAL 45000: `affectedRows=1`, `changedRows=1`.

Uma conexao independente, depois de validar a identidade fisica do lab, mostrou:

- `_utf8mb4'x' COLLATE utf8mb4_bin <=> _utf8mb4'x '` = 1.
- `BINARY 'x' <=> BINARY 'x '` = 0.
- 1 linha sintetica, 1 byte trailing acrescentado, 1 `SHA2(canonicalBody,256)`
  divergente do `bodyHash` armazenado.

R09/R10 dependem dos bytes originais para hash/HMAC. A igualdade da collation
nao e prova de identidade de bytes. R14 comprovou roundtrip sintetico; nao testou
essa mutacao de whitespace e seu PASS nao e certificacao desta garantia adicional.
Nao se alterou migration/trigger/collation para fazer R15 passar. O probe continua
falhando explicitamente. A homologacao positiva de schema foi interrompida.

## Contrato Parcial Do Gate

`AssessCrmIntegrationReadiness(options)` recebe dependencias explicitamente;
nao le env, importa bootstrap, chama coordenador, M2M, webhook ou producer.
`enabled` ausente/falso retorna DISABLED antes de auth, clock, SQL ou transporte.
Scope explicito `synthetic_lab`, autorizacao server-side por callback e identidade
solicitada/configurada coerentes sao exigidos. Body HTTP nao habilita nem autoriza
o servico; nenhuma flag produtiva e alterada.

Valida config usando a funcao extraida de R13, sem regras novas divergentes:
UUID organizacao, integration/instance explicitos, endpoint HTTPS exato aprovado
sem credenciais/hash, keyId, secret >=32 bytes, transporte provisionado,
lease 15-300s, backoff 30-3600s, budget 1-10 e clock valido.
Defaults de politica R13: lease30s/backoff60s/budget5; nao inicia execucao.

SQL do diagnostico e exclusivamente SELECT de database/case mode e metadata
TABLES/COLUMNS/STATISTICS/TRIGGERS no database explicitamente vinculado.
Reutiliza lista/matcher/engine guard de `VerifyContactSourceBridgeSchema`.
Verifica colunas criticas, PKs, indices R10 com ordem/unicidade/sem prefixo/BTREE,
timing/evento/tabela/body completo dos triggers conhecidos.
Definicao aceita somente com normalizacao de whitespace, sem remover identificadores
quotados ou alterar literais. Nome de trigger sozinho nunca e suficiente.
Detecta PAD SPACE do R10 e bloqueia outras collations como NOT_VERIFIED: nenhuma
alternativa foi homologada nem deve ser provisionada automaticamente.

Diagnostico atual do schema:
`SCHEMA_IMMUTABILITY_PAD_SPACE:CrmOriginJournals.canonicalBody`.
Erros de driver/config sao redigidos em codigos estaveis; resultado nao contem
PII, journal, endpoint, DSN, segredo ou input de auth.
Esta implementacao parcial NAO foi publicada como gate homologado reutilizavel.

## Matriz De Prontidao

| Grupo | Estado | Evidencia / pendencia |
| --- | --- | --- |
| LOCAL_SCHEMA | BLOCKED | R10 metadata presente; prova de bytes imutaveis falhou. Nao existe LAB_PREFLIGHT_PASS final. |
| LOCAL_CONFIGURATION | PASS_LAB_ONLY | 29 unitarios: default, autorizacao, org/integration/instance, HTTPS, chave/secret, transporte, clock e policy. |
| M2M_REMOTE_DEPENDENCIES | NOT_VERIFIED | Gateway implantado, migrations/permissoes alvo, mapping, secret manager/rotacao, TLS/timeout/cancelamento, rate limit, receipts/reconciliacao operacional nao acessados. |
| PRODUCTIVE_CALLERS | NOT_ENABLED | R15 nao adiciona wiring; inventario dirigido dos callers documentado no TXT. Nao comprova ambiente remoto. |
| COMMERCIAL_AUTHORIZATION | OUT_OF_SCOPE | ONE DEAL e SDR nao homologados; nao sao falha tecnica cadastral e nao estao autorizados. |
| ACTIVATION_DECISION | FORBIDDEN | R15 nunca concede autorizacao de producao; autorizacao humana futura separada ainda obrigatoria. |

Todos os retornos mantem `PRODUCTION_NOT_VERIFIED`, activationAuthorized=false,
productiveCapture=false e productiveDeliveryEnabled=false, inclusive qualquer
futuro PASS de laboratorio. Nenhum endpoint remoto e consultado para a matriz.

## Laboratorio E Contagens

MariaDB 10.11.10, 127.0.0.1:55447, `r15_readiness_lab`.
Datadir NOVO: backend/node_modules/.cache/r15-readiness-lab/data/ da worktree R15.
Binario portable R10 apenas reutilizado read-only; dados R10-R14 nao usados.
Guards exatos datadir/versao/porta/bind/database antes de preparar schema,
antes de cada mutacao negativa e na conexao independente de evidencia.
Fixture source minima e migration R10 original; sem migration nova.
DDL/DML sinteticos pertencem ao harness, nunca ao diagnostico.

Resultado final discriminante: 36 casos distintos executados, 35 PASS/1 FAIL/0 SKIP:
29 unitarios novos, 2 SQL novos (1 PASS fail-closed, 1 FAIL garantia R10),
5 regressao R13 executados. Repeticoes e happy path metadata intermediario nao
foram somados. Suite R14 integrada nao reexecutada; nenhuma outra suite historica
foi incluida na contagem final.

Nao executados apos bloquear o happy path efetivo: matriz SQL completa de tabelas
ausentes/MyISAM, colunas/PK/indices/triggers negativos, e demais regressoes R10-R14.
Implementacao de codigos nao equivale a prova desses cenarios.
Checks direcionados strict/noUnused PASS; diagnosticos baseline R14=1/current=1,
adicionados=0; strictPropertyInitialization=false para modelos legados.
Build/typecheck global nao executado nem declarado PASS.

## Preservacao E Proximo Gate Humano

Migration/modelos/journal/producers/client R09 e demais runtimes intocados.
Somente 2 compartilhados editados localmente: validacao R13 extraida e matcher do
guard de tabelas exportado para evitar duplicacao. Default disabled preservado.
Nao houve CRM fonte/DB, Supabase, EasyPanel, WhatsApp, SDR/Vivian, comercial,
scheduler, worker, deploy, PR, promocao ou commit/push R15.
Originais e worktrees historicas nao foram revertidos, limpos ou alterados.
PES/SAMACON completos nao fornecidos; sem certificacao integral ficticia.

Antes de retomar R15, e necessaria autorizacao explicita de pacote separado para
avaliar/endurecer comparacoes de imutabilidade R10 e seu impacto/rollout, sem
correcao automatica pelo preflight. Nao se iniciou tal pacote nem R16.
Rollback produtivo nao se aplica; o delta parcial permanece apenas na worktree
isolada para evidencia/revisao. Cleanup/hashes finais e TXT externo consolidado
sao registrados apos encerramento do laboratorio.

## P02-R15-R1 - Conclusao Reconciliada Em Isolamento

A secao anterior e o estado historico do R15 original; seus9 arquivos/HEAD/status
na worktree antiga continuam BLOCKED e byte-identicos. Esta secao pertence a nova
worktree feature/samachat-crm-p02-r15-reconciled-20261003,base exclusiva H01
0fc9c4905aac613701a77829d04b144f11a9aaa5,pai f1cb4d6590d560eb6d979b90f9ecdccb298f82c9.
H01 e seus testes aprovados nao foram modificados ou reimplementados.

Reconcilacao individual:6 TS recuperados inicialmente identicos,mais este doc.
CrmDeliveryCoordinator/VerifyContactSourceBridgeSchema conservam exatamente as
extracoes puras ja testadas no R15;gate/unitarios/SQL/fixture recebem somente
adaptacoes H01 e cobertura pendente. A instrucao que menciona7 TS conflita com
o inventario:existem6 TS e3 documentos,nenhum path extra foi inventado.

Checklist/release:prefixos completos H01 preservados;deltas exclusivos R15
relativos a R14 acrescentados depois de H01,seguidos de conclusao R15-R1 separada.
Os deltas exclusivos normalizados LF possuem SHA256:
checklist4b1074149f9db042c7292e45e47722bbbb60721442afe554400b5b3cd009ff79;
release a65e0ca3675a44c822be6f42e99e6bc8707ab653f134e752992eefb4a65ad37c.
Nunca copiar documento inteiro da origem por cima do historico H01.

### Contrato Read-Only E Fonte De Verdade

O gate importa exclusivamente a API `verify` ja existente da migration H01;
nao chama `up`/`down`,migrate/seed,transport,coordenador,webhook ouproducer.
Removeu o conjunto duplicado de regras/triggers R10 e o veto baseado somente
em collation. Contrato R10/tipos/indices/defs endurecidas echecks de integridade
agregados sao verificados pelo H01 inalterado. Fonte source conserva case/engine
guard existente echecks de colunas/PKs. Banco explicito ecomparado a DATABASE().

SELECTs de metadata econtagens agregadas de integridade H01 nao retornam PII,
corpo/journal,DSN ousegredo. O harness aceita somente SELECT no facade de
diagnostico. DDL/DML e H01.up existem somente na preparacao de fixture sintetica.
Falhas H01 conhecidas retornam codigos estaveis;falha arbitraria e redigida.
Default disabled precede autorizacao/clock/SQL/rede;body HTTP nunca autoriza.

Somente dois triggers H01 integros/defs completas sao reconhecidos. Original R10,
misto R10/H01,ausente,no-op,extra/definicao divergente,banco/coluna/PK/indice
incompativel bloqueiam. H01.verify nao e instalador de runtime.

### Provas E Matriz Final

Lab NOVO MariaDB10.11.10,127.0.0.1:55449,r15_reconciled_lab,datadir
backend/node_modules/.cache/r15-reconciled-lab/data/ da nova worktree.
Opt-in CRM_READINESS_RECONCILED_LAB_ENABLED=1;guards fisicos exatos de host/bind,
versao/porta/database/datadir antes de fixture/negativos e conexao independente.
Ordem:source fixture minima ->R10 original ->H01 aditivo. Nunca db:migrate geral.
Nenhum dado R10-R15/H01 reutilizado. Sem Docker/servico/Supabase/CRM/credencial real.

A/B/C passaram antes de ampliar:original R10 bloqueado com witness PAD SPACE
preservado,mesma assertion impeditiva original rejeita apos H01 com SQLSTATE45000,
HEX de todas as colunas/row/bodyHash idente por conexao separada,outcome inicial
legitimo aceita e reescrita trailing rejeita;LAB_PREFLIGHT_PASS sem autorizacao.

40 SQL distintos cobrem tabelas5 ausentes/5 MyISAM,coluna ausente/tipo/tamanho/
nullable/signedness,PKs/indices ausentes/order/unique/prefix/composicao,trigger
ausente/no-op/original/misto/extra/divergente,database explicito/disabled epositivos.
Schema reconstruido R10+H01 antes de cada negativo. Para journal MyISAM,indice
pending oversized removido somente na fixture para respeitar limite1000 bytes;
gate bloqueia engine antes de examinar indices. Migrations nunca alteradas.

31 puros validam config/identity/authorization,HTTPS/key/secret/transport/policy/
clock/default/body/redaction/case.28 regressoes unitarias realmente executadas:
R10 journal12,R11 create5,R12 update6,R13 coordinator5. Historicos nao executados,
incluindo SQL/R14/H01 completos,nao somados. Contagens finais reais noTXT.
Strict direcionado/noUnused PASS;comparativo H01 baseline1/current1,zero novo;
strictPropertyInitialization=false/skipLibCheck por legado. Nao build geral PASS.

| Grupo | Estado Local | Limite |
| --- | --- | --- |
| LOCAL_SCHEMA | PASS | Exclusivamente contrato local H01/fixture comprovado. |
| LOCAL_CONFIGURATION | PASS_LAB_ONLY | Server-side sintetica explicita;nao operacional. |
| IMMUTABILITY_GUARDS | PASS | H01 read-only reconhecido e comportamento efetivo provado no lab. |
| M2M_REMOTE_DEPENDENCIES | NOT_VERIFIED | Gateway,permissoes,mapping,secret/TLS/rate limit/reconciliacao real nao acessados. |
| PRODUCTIVE_CALLERS | NOT_ENABLED | Inspecao documental local,nenhum wiring novo. |
| COMMERCIAL_AUTHORIZATION | OUT_OF_SCOPE | ONE DEAL/SDR nao homologados ou autorizados. |
| ACTIVATION_DECISION | FORBIDDEN | Autorizacao humana futura separada obrigatoria. |

Todos retornos mantem PRODUCTION_NOT_VERIFIED,productionActivationAuthorized=false,
productiveCapture=false,productiveDeliveryEnabled=false. Nunca PRODUCTION_READY.
Nao concede autorizacao operacional/deploy/migrations reais ou automatic callers.
Completude de readiness local nao altera fluxos CRM/Vivian/WhatsApp/tickets.
Preflight/commit exclusivo/remoto/fingerprints/cleanup/TXT fisico registrados no
consolidado R15 reconciled. Encerrar apos TXT;nao iniciar R16 automaticamente.