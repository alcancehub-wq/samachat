# P02-R12 - Ponte de atualizacao cadastral

Base R11:7562653c251752bbf0f630b1a40212a209558e36. SamaChat somente,
worktree/branch exclusivos feature/samachat-crm-p02-r12-update-bridge-20261003.
PES1.0/SAMACON integrais indisponiveis; regras explicitas e trechos R10/R11
consultados sem certificacao integral. Nenhuma auditoria geral refeita.

PRODUCTIVE_CAPTURE=FALSE
PRODUCTIVE_DELIVERY_ENABLED=FALSE
CRM_MUTATION=NONE
AGENT_SDR_MUTATION=NONE

## Fronteira e default

UpdateContactService recebe segundo argumento server-side UpdateContactSourceContext,
seguindo R11. Ausente/desligado executa o fluxo legado sem nova transacao, lock,
snapshot adicional ou consulta schema/journal. Body HTTP nao habilita esse argumento.
Nenhum controller/caller atual passa contexto automaticamente.

Opt-in exige identidade/configuracao/autorizacao/proveniencia/captureKey/correlationId
explicitos. Guard InnoDB R11 foi extraido sem mudar sua regra para ser compartilhado
pelas pontes create/update. Tabelas ausentes/MyISAM bloqueiam antes de escrever.
Nenhuma migration/schema produtiva ou storage alternativo foi introduzido.

## Limite transacional

R10/R11 continuam donos de managed READ COMMITTED: comando locked/replay primeiro,
callback source na mesma Transaction, motor R07/R08/R09, journal/resultado e commit.
Callback update le Contact completo FOR UPDATE por ID canonico antes da consulta
parcial legada. Mesmo lock/transaction serializa updates concorrentes. Snapshot
anterior e posterior sao clones reais completos, com isGroup/number/name/canal e
campos de completude, sem preencher valores ficticios para satisfazer o motor.

extraInfo upsert/remoções, contact.update, tags/reload e leitura posterior completa
usam a mesma transaction. IDs extraInfo fornecidos precisam existir e pertencer ao
contato-alvo, com lock; remocoes sao igualmente scoped. A regra default antiga nao
foi silenciosamente corrigida. Ausente/null/lista vazia seguem os condicionais
legados: arrays vazios limpam, ausente ou null falsy nao executa associacao; undefined
de campos escalares nao apaga, valores explicitos sao preservados pelo update.

Retorno original e webhook mantem atributos parciais/include extraInfo/tags. Snapshot
completo adicional nao altera desnecessariamente esse contrato. Webhook contact.updated
legado permanece void, pos-commit para mutacao efetiva; falha ou replay nao o repete.
Nenhum novo socket/HTTP/envio M2M foi acrescentado. Transporte generico legado nao
foi ativado/exercitado em ambiente real; testes o mockam e bloqueiam HTTP.

## Telefone e identidade

Motor R10 agora respeita phoneE164 explicito em cada snapshot, preservando fallback
anterior para snapshots que nao o possuem (create R11 e writer R10). Nenhuma regra
R07/R08/R09 ou contrato M2M alterado. Proof anterior vem de previousPhoneE164 server-side,
ou telefone persistido no ultimo envelope da mesma identidade, com hash/escopo
verificados; se numero nao mudou, evidencia posterior declarada pode servir para o
mesmo numero. Se mudou sem evidencia anterior, before.phoneE164=null, nunca reutiliza
silenciosamente o telefone posterior para fingir identidade passada.

After recebe evidencia phoneE164 server-side separada, e R07 valida contra number
real posterior. Claim incompatível/telefone ausente vira pending_identity duravel,
sem novo evento signavel/telefone ficticio. Troca numero nao troca localId/survivor.
Org/integration divergente no journal bloqueia inclusive alteracao tecnica irrelevante.
Nao existe novo resolvedor de numero/LID/merge.

## Idempotencia e revisao

Input hash R10 inclui contato alvo, todos campos efetivos (extraInfo/tags/ausencia/
null/lista vazia) e evidencia anterior declarada, sem payload extra no envelope M2M.
Mesmo captureKey/hash retorna outcome original antes do callback. Divergencia
rejeita antes de source write. Dados nao sao reaplicados, associacoes nao removidas
outras vezes, nenhum evento/revisao/webhook adicional.

Projecao parcial original de retorno e persistida em producerResult no outcome TEXT
imutavel do comando existente, limitado a32KiB UTF8; resultado maior rejeita e
rollback, nao trunca. Replay verifica que identidade ainda existe, reidrata essa
projecao sem escrita e devolve resultado original mesmo apos update posterior,
sem desfazer estado atual. Dados pertencem ao banco operacional restrito; nao sao
logs/M2M e sua retencao segue gate journal/LGPD futuro. Nenhuma coluna nova.

R07/R09/R10 decidem mudanca semantica e sync inicial: nome/canal geram revisao;
foto (nao suportada pelo payload legado)/cidade/associacoes irrelevantes nao geram
revisao. binding not_linked sem journal pode pedir sync inicial. Evento/body/hash/
revision/identidade permanecem imutaveis conforme R10; nao ha worker ou retry ativo.

## Verificacao isolada

Laboratorio novo backend/node_modules/.cache/r12-update-lab, bind127.0.0.1:55443,
database r12_update_lab, binario MariaDB10.11.10 R10 somente lido. Datadirs R10/R11
nao modificados. Helper compartilhado de fixture verifica @@datadir EXATO e versao
antes de DROP/CREATE schema sintetico. Seletores opt-in fechados, sem .env/creds
reais, Docker, servico Windows ou Supabase/EasyPanel. Mesmo helper executa cinco
regressoes SQL R11 no datadir R12; probe usa config fisicamente validada.

Casos novos: snapshots completos/phone observados diretamente no adaptador real,
revisao/irrelevancia/sync inicial, extraInfo add/change/remove/ownership, tags replace/
empty, parcial/null/vazio, rollback source/associacao/journal/precommit, replay
original/conflito/concorrencia, contato ausente/org/integration, grupo/ineligibilidade,
default/body injection, webhook pos-commit/unico e tickets/identidade separada intactos.
Fixtures exercitam produtores e R10/migration reais com modelos ORM sinteticos de
associacao, nao schema produtivo completo. Mocks nao usados como prova de atomicidade.

Gate final dirigido:6 suites,69 casos distintos PASS,0 FAIL;6 ponte update strict,
5 guard/create R11 strict,12 motor R10 puro,38 SQL update reais,3 default e5 SQL
R11 selecionados no datadir R12.20 testes da suite R11 excluidos por selecao sao
registrados como nao executados,nao somados como PASS;80/R11,194/R10 e reruns nao
duplicados. Producao/callers/transporte continuam nao exercitados.

Typecheck strict/noUnused do recorte PASS; produtores/SQL comparados1 diagnostico
herdado antes/depois,0 novo,sem certificar typecheck geral. Reparo intermediario:
callback Sequelize5 Bluebird convertido a Promise nativa por async. Prova AST
semantica do default passou retirando apenas plumbing opt-in; comparador inicial
removia spread legado info e nao visitava where interno,foi corrigido sem editar
codigo para satisfazer teste. Guard InnoDB R11 extraido sem alterar regras/case.

Checks strict do recorte novo e comparacao dos diagnostics herdados antes/depois;
build/typecheck geral nao certificados. Testes distintos/reruns/excluidos/falhas,
fingerprints/commit/push/cleanup constam do TXT final unico externo. Regressoes
relevantes R10/R11 apenas, nao reexecucao integral dos pacotes selados.

## Cobertura e rollback

CreateContactService R11 preservado; UpdateContactService agora ponte opt-in.
CreateOrUpdateContactService/LID/merge/preferencia, messages/handlers/providers,
tickets/filas/distribuicao/conversas,CRM/Vivian/SDR continuam intocados/sem wiring.
Escritas/efeitos externos de callers, schema/permissoes/triggers reais, retention/
purge/LGPD e entrega exigem gate futuro proprio. Check previo de engine nao cobre
DDL concorrente administrativo. Nenhuma ativacao produtiva ou admissao ONE DEAL.

Rollback codigo: omitir/desligar contexto e reverter somente commit R12 sob
autorizacao; default sem journal/transacao nova. Preservar comandos/eventos antigos
e dados R10/R11, nao desfazer updates/delete CRM como fallback. Erro opt-in rollback
conjunto sem tentar update legado desconectado. Nenhuma migration nova a reverter.
Encerrar apos TXT final; nao iniciar R13.