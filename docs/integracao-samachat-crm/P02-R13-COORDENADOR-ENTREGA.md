# P02-R13 - Coordenador isolado de entrega e reconciliacao

Base R12 e5c3005d554a3daaabe19eac93b14b94feb74b9d. SamaChat somente,
feature/samachat-crm-p02-r13-delivery-coordinator-20261003. PES1.0/SAMACON
integrais indisponiveis; aplicar regras explicitas/contratos ja inspecionados,
sem certificacao integral ou engenharia reversa CRM repetida.

DELIVERY_COORDINATOR_IMPLEMENTED=TRUE_ISOLATED
EXCLUSIVE_RETRY_OWNER=CrmDeliveryCoordinator
PRODUCTIVE_CAPTURE=FALSE
PRODUCTIVE_DELIVERY_ENABLED=FALSE
CRM_MUTATION=NONE
AGENT_SDR_MUTATION=NONE

## Contrato e configuracao

CrmDeliveryCoordinator.runOnce(identity, { eventId? }) recebe repository R10,
identidade explicita, configuracao enabled/M2M/policy, clock e gerador de attemptId.
Default enabled ausente/false retorna disabled sem ler repository ou enviar.
Identity deve coincidir com configuracao server-side. Endpoint HTTPS exato aprovado,
keyId e chave minima32bytes; transporte injetado obrigatorio, sem fallback nativo
no coordenador. Nenhuma .env, usuario/senha SDR, conexao WhatsApp ou org padrao.
Nenhuma credencial real provisionada; testes geram chaves efemeras em memoria.

Retorno tecnico:disabled/idle/busy/contact_confirmed/receipt_validated/
reconciliation_required/terminal_failure/rejected,operation,eventId e codigo
minimo; nenhuma PII,header,body ou secret em log. Nao ha logger nem endpoint publico.
Cada chamada manipula no maximo um evento e faz no maximo uma operacao HTTP.
Sem loop infinito,sleep,polling,cron,daemon,worker,bootstrap/server/RUN_WORKERS.
Scheduler futuro deve apenas invocar este coordenador, nao criar retry alternativo.

## Integridade e ordenacao

Antes da aquisicao:hash exato/body/semanticHash R10,IDs/revisao,UTC,scope,versao,
event_name/source_system/operation,contexto/proveniencia/data/listas e limites
do envelope v1 sao validados. Nao segundo motor de elegibilidade/comercio.
Upsert recebe canonicalBody byte a byte; somente sentAt/HMAC renovados pelo
SendCrmM2mAttempt existente. Query de recibo usa BuildCrmM2mReceiptQuery R09,
operacao/event_name proprios,mesmos IDs/correlation/org/revisao/evento original.
Corpo persistido nunca reescrito/regenerado ou trocado por novo evento.

Repository ganha deliveryCandidate scoped,ordered e bounded. Revisao posterior
do mesmo sourceInstance/sourceContact nao ultrapassa anterior sem contact_confirmed,
inclusive terminal_failure anterior. Contatos independentes nao ficam presos por
lease ativa/cooldown de outro. Seleciona earliest createdAt/eventId entre elegiveis;
empate nao promete ordem de insercao global, apenas ordem de revisao por identidade.
Claim CAS revalida bloqueio de revisao e cooldown dentro da transacao SQL.

Lease default30s (min15s/max5min) excede deadline fisico8s R09. Novo attemptId e
stateVersion garantem um owner valido; resposta de owner antigo nao grava sobre
novo owner. Nenhuma transacao SQL permanece aberta durante transporte; teste
independente FOR UPDATE durante wait demonstra liberacao do lock.
Transporte injetado e trusted adapter que deve respeitar timeoutMs8000/cancelamento;
R13 nao pode cancelar uma funcao arbitraria que ignore esse contrato. Transporte
real/adapter de producao exige homologacao futura; nesta rodada foi simulado.

## Incerteza e retry

Politica limitada:backoff default60s,min30s/max1h;maxOperations default5,range1..10
por evento somando upsert/readbacks. Backoff usa leaseExpiresAt existente em
estados receipt_validated/reconciliation_required;nenhuma coluna/tabela nova.
Erro transitorio/429/recibo invalido/perda de resposta nao faz retry imediato.
Uma chamada posterior respeita timestamp persistido. Falhas apos HTTP na escrita
de estado retornam state_write_uncertain,lease preservada para recover/readback.

Primeira intent_persisted/attemptCount0 envia upsert uma vez. Todo evento incerto,
accepted ou recuperado de lease usa get_receipt primeiro. 404 de consulta e
receipt_not_found_inconclusive,nao prova ausencia de commit. Nunca re-upsert
automatico depois de incerteza/404; sem evidencia/contrato de consulta forte,
preserva reconciliacao e encerra. Esgotamento conserva evento/dados para operador;
nao apaga command,revisa IDs ou reinicia contador para forcar entrega.

401/403/404 de upsert viram erro terminal tecnico;409/429/5xx sao inconclusivos.
401/403/404 de readback preservam remoto desconhecido/reconciliacao e cooldown,
sem declarar rollback CRM. Resposta2xx sem receipt valido nao confirma contato.
Accepted/not_persisted e receipt_validated recuperavel. Created/reused/enriched
validos confirmam somente contato. commercialOperation sempre not_requested;
root/deal/opportunity/handoff inesperados rejeitados pelo parser R09.

Recibo tardio accepted/erro nao regride contact_confirmed nem altera o receipt
original;CRM contactId divergente e conflito explicito. Fencing/CAS impedem
timeouts/receipts de owners vencidos de substituir novo owner. RecoverExpired
admite eventId opcional para recuperar apenas unidade escolhida;API anterior
sem esse argumento permanece compativel. Ultima lease com budget esgotado ainda
vira reconciliacao duravel sem operacao de rede extra.

## Eventos invalidos

Read/pending antigos continuam verificando integridade;deliveryCandidate fornece
linha para verificacao completa antes de envio. Evento realmente invalido pode
ser isolado com CAS + mesmo body/hash/estado + scope em reconciliation_required,
lastErrorCode journal_integrity_requires_review. Nada apagado/reescrito;future
revisions desse contato continuam bloqueadas,contatos independentes seguem.
Selecao automatica exclui apenas esse flag tecnico ate revisao autorizada.
Metadata de candidate scope divergente nao pode marcar evento de outra identidade.
Remocao de flag/correcao de corpo/DDL administrativo sao fora do R13.

## Provas e limites

2 suites novas:5 contrato e36 SQL PASS;regressao9 casos R09 selecionados PASS,
26 excluidos por selecao explicitados. Total50 distintos,0 falhas finais.
SQL InnoDB demonstra CAS/concurrency/order,cooldown/budget,recover/fencing,
readback/receipt persistido,corrupcao isolada e compatibilidade API antiga.
Typecheck strict/noUnused de coordenador/repository/testes PASS;programa afetado
com produtores comparado:1 diagnostico herdado antes/depois,0 novo. Build/typecheck
geral nao executado/certificado. Formato validado apenas no delta TS,sem tocar
captura/cliente/transport/modelos/migrations/produtores protegidos.
Restart logico novo repository/coordinator lendo estados persistidos comprovado;
nao alegar restart fisico/E2E/producao. Simulacao HTTP prova assinatura/corpo/
resultados,nao servidor CRM real. HTTP/HTTPS real bloqueados/assertados0 na suite.

Fixture R13 em datadir proprio fisicamente identificado por @@datadir/versao
antes de schema,127.0.0.1:55444/database r13_delivery_lab,binarios anteriores
somente lidos,sem tocar datadirs R10-R12. Nenhum .env/secret real/Docker/servico
Windows/Supabase/EasyPanel. Modelos/migration R10 reais e fixture de Contact,
nao schema produtivo completo. Secret aleatorio efemero,nao commitado.

Reparos intermediarios:patch duplicado recusado sem escrita,JSON narrowing,
mock.calls types,empate de createdAt UUID/gate de teste,clones de snapshot da
fixture e tipos Sequelize get plain. Writer minimo antigo retorna dataValues
referenciado;R13 nao reforma esse produtor,usa padrao clone R11/R12 na fixture.
Limite de reparos levou consulta pontual;responsavel autorizou concluir somente
tipagem fixture e validação. Depois,decode map/escopo de classificacao manual
foram corrigidos por testes falsificaveis. Nada ocultado como PASS ficticio.

## Rollback e proximo gate

Nao existe wiring produtivo. Desligar configuracao e nao invocar coordenador
interrompe novas tentativas;leases/recibos permanecem para reconciliacao. Sob
autorizacao,reverter somente commit R13;nenhuma schema/migration nova a desfazer.
Nao deletar journal/command/eventId/revisao ou dados CRM como fallback.

Antes de qualquer ativacao:homologar schema/permissoes/caller/secret manager e
rotacao,adapter timeout/cancelamento,clock/SLA/rate/backoff/retention/procedimento
operador de casos exhausted/corrompidos. Transicoes antigas sem attemptId existem
por compatibilidade e sao APIs server-side confiaveis;future retry deve passar
somente pelo coordenador. Contratos commerciale/SDR/P05/Vivian nao tocados.
Encerrar apos TXT final;nao iniciar R14 automaticamente.