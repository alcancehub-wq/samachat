# Checklist Mestre - Integracao SamaChat <-> CRM Samacon

Atualizacao isolada: 2026-10-02, P02-R06. Base SamaChat f91b35d52b84e28a51512e10ee18cf58bdd850c0. Branch docs/samachat-crm-p02-r06-20261002.
Este e um checklist DOCUMENTAL da integracao, reconstruido a partir das evidencias recuperadas e reconciliado pelo Prompt Corretivo do responsavel em 2026-10-02. Nao edita nem substitui o checklist operacional CRM. Declaracoes historicas sao distinguidas de gates independentemente comprovados.

STATUS_ANTERIOR=P02_R06_BLOQUEADO
STATUS_APOS_RECONCILIACAO=P02_R06_DOCUMENTAL_PASS
P02_INTEGRACAO=EM_ANDAMENTO
INTEGRACAO_FUNCIONAL=NAO_IMPLEMENTADA
CONTRATO_M2M_CRM=PENDENTE_DE_VALIDACAO_CRM
PROMOCAO=NAO_AUTORIZADA

## Estado por pacote

| Item | Estado real registrado | Evidencia / limite |
| --- | --- | --- |
| P01 | CONCLUIDO conforme contexto anterior fornecido; auditorias anteriores recuperadas; selo integral NAO RECUPERADO | SAMACHAT-CRM-WEBHOOK-P01-R01-SOURCE-MAP-20260929-171951.txt e P01-R03-CRM-RECEIVER-SOURCE-MAP-20260929-173226.txt; leitura/source-map comprovados, nao integracao funcional |
| P02 | EM_ANDAMENTO | Homologacao M2M, implementacao e validacoes funcionais futuras pendentes; nao usar FECHADO ou ETAPA SELADA para a integracao integral |
| P02-R01 | AUDITORIA_DOCUMENTAL_REGISTRADA | SAMACHAT-CRM-P02-R01-SOURCE-MAP-20261001-104341.txt: mapa CRM em leitura, nao implementacao |
| P02-R02 | DESCOBERTA_CONTRATUAL_REGISTRADA | SAMACHAT-CRM-P02-R02-CONTRACT-DISCOVERY-20261001-104844.txt: contratos existentes historicos, nao receptor definitivo |
| P02-R03 | AUDITORIA_HANDOFF_NOSHOW_REGISTRADA | SAMACHAT-CRM-P02-R03-NOSHOW-HANDOFF-20261001-105244.txt: leitura contratual antiga; estado atual requer CRM |
| P02-R04 | CANCELADO_NAO_EXECUTADO | Cancelado expressamente antes da execucao pelo responsavel devido a evolucao paralela CRM; nao e auditoria ausente ou impedimento documental de R06 |
| P02-R05 | EXECUCAO_DOCUMENTAL_REGISTRADA_NO_HISTORICO | Matriz de identidade e TXT concluidos na conversa anterior conforme responsavel; evidencia original nao inspecionada nesta rodada, sem hash/caminho/validacao independente ou reexecucao |
| P02-R06 | P02_R06_DOCUMENTAL_PASS | Tres entregaveis, engenharia preservada, classificacoes reconciliadas e gates documentais validados; nao e implementacao nem homologacao M2M |
| P03 | PENDENTE | Nenhuma implementacao de integracao autorizada nesta rodada |
| P04 | PENDENTE | Nao antecipar designacao/entrega funcional sem checklist anterior |
| P05 | PENDENTE | Nao antecipar testes reais ou promocao |
| P06 | PENDENTE | Nao confundir com pacote SDR ou ONE DEAL do CRM |
| P07 | PENDENTE | Nenhum selo funcional ou release |

P03 do CRM e um pacote de OUTRO fluxo e nao satisfaz o P03 desta integracao por coincidencia de nome.

## R06 - Entregas documentais

- [x] Identidade original, remote, branch e HEAD registrados.
- [x] Baseline remoto legacy-prod confirmado sem fetch; branch local atrasada nao utilizada.
- [x] Worktree/branch exclusivas criadas limpas, original preservado.
- [x] Entradas WhatsApp, Cloud, manual/API, identidade, ticket e consumidores compartilhados auditados.
- [x] Eventos internos distinguidos de webhook e legado tag.created investigado sem disparo.
- [x] Contrato de identidade, elegibilidade, eventos, resposta, seguranca e estados escrito como PROPOSTO.
- [x] Matriz de responsabilidades, plano futuro A/B/C, riscos, rollback e T01-T24 definidos.
- [x] Engineering Contract PES com todos os campos preenchidos, incluindo N/A justificado.
- [x] Estado CRM atualizado com registros de 02/10: SQL aplicado, build/push UI e dispatch documentados por outra atividade; conclusao do deploy/E2E/receptor externo nao comprovados.
- [x] TXT unico consolidado e minuta de nota estritamente documental criados no isolamento.
- [x] Releitura integral, check de 34 campos PES, dois JSON, sete estados, 24 testes definidos, referencias e diff-check documental.
- [x] SamaChat original: HEAD/status/diff e seis hashes preexistentes preservados; checklists CRM consultados com hashes inalterados.
- [x] P02_R04=CANCELADO_NAO_EXECUTADO; cancelamento declarado pelo responsavel, sem impedimento documental de R06.
- [x] P02_R05=EXECUCAO_DOCUMENTAL_REGISTRADA_NO_HISTORICO; P02_R05_EVIDENCIA_ORIGINAL_NAO_INSPECIONADA_NESTA_RODADA=SIM. Nao refazer nem inventar evidencia.
- [x] Protocolos apresentados ao responsavel; textos integrais nao disponibilizados ao agente anteriormente e nao lidos integralmente nesta reconciliacao. Gates explicitados confrontados, sem invalidacao automatica.
- [x] Ausencia de mutacao CRM por esta execucao registrada; preservacao global paralela nao certificada e nao usada como gate adicional de R06 documental.
- [x] Checklist comercial vigente nao recuperado na auditoria anterior registrado como dependencia funcional; nao substituido nem novamente investigado.
- [x] P01 mantido conforme contexto/evidencias anteriores; selo integral nao inspecionado registrado como limite de acesso, nao requisito de reexecucao.
- [x] P02_R06_DOCUMENTAL_PASS apos reconciliacao; P02 em andamento, integracao nao implementada, M2M pendente e promocao nao autorizada.

Releitura integral, validacao estatica, diff-check e fingerprints antes/depois registrados no TXT; nenhum teste funcional T01-T24 executado. A divergencia CRM nao foi corrigida nem revertida.

O status historico bloqueado e a minuta original permanecem no TXT, identificados como anteriores e substituidos para fins de classificacao pelo registro de reconciliacao. A engenharia tecnica nao foi alterada.

## Dependencias CRM

| Dependencia | Estado / preservacao |
| --- | --- |
| ONE DEAL / ONE JOURNEY | Direcao canonica informada; SQL piloto com aplicacao registrada em CRM-P03-R19-R22N-TERMINAL-PRODUCTION-APPLY.txt; nao extrapolar para E2E/frontend |
| Oportunidades independentes | Artefatos e contratos piloto registrados; receptor externo/operacao M2M PENDENTE_DE_VALIDACAO_CRM |
| Principal persistente e admissao inicial | Regras definitivas, identidade de journey e recibos PENDENTE_DE_VALIDACAO_CRM |
| Handoff/agenda/No-show | Evolucao paralela; apenas capacidades contratuais, nao implementar nem usar archive/reativar copia SDR |
| Auth, organizacao, LID-only, ownership | PENDENTE_DE_VALIDACAO_CRM; nenhum segredo, org padrao ou fallback implicitamente aprovado |
| Idempotencia/readback/reconciliacao | Garantias internas documentadas nao comprovam ingress SamaChat; homologacao futura exigida |
| Frontend CRM e piloto E2E | E36 registra build/push UI; E37 registra dispatch, mas termina BLOCKED na consulta do run exato; conclusao/E2E nao comprovados. Nenhuma promocao nesta atividade |

## Gates de preservacao

Codigo operacional, CRM, schema/RLS/banco, mensagens/clientes reais, pipelines/responsaveis, conexoes/tokens Meta, webhooks de teste, WhatsApp, Docker, scripts destrutivos, commit, push e deploy: **NAO AUTORIZADOS E NAO EXECUTADOS**.

Escopo de escrita esperado: exatamente dois Markdown e um TXT dentro da worktree documental. A criacao autorizada da branch/worktree altera apenas metadados Git de isolamento; nenhum commit/HEAD original e alterado.

R06 documental concluido; nenhuma nova tarefa ou micropacote aberto nesta execucao. Pendencias exclusivas da futura integracao funcional: homologacao M2M/checklist comercial vigente, auth/org/binding/recibos, politica de admissao e oportunidades, implementacao autorizada, testes isolados/E2E e rollout/rollback aprovados. Nada disso esta liberado pelo PASS documental.

## Registro P02-R07 - Implementacao Local Isolada

O conteudo R06 acima e um snapshot importado sem reescrever seu historico. Origem: D:/Samacon/worktrees/samachat-crm-p02-r06-20261002. SHA256 do checklist importado: 20A2672471B43288D1E00B04FEC66B14C3B111CA07944369261E323909A4D13C. A copia do Contrato Tecnico R06 continua byte a byte identica ao original, SHA256 74B828402BCEBEA3B6D6D7F839F56D581B218FDD913D683B8A846E2ECB995CB7.

WORKTREE_R07=D:/Samacon/worktrees/samachat-crm-p02-r07-20261002
BRANCH_R07=feature/samachat-crm-p02-r07-20261002
HEAD_R07=f91b35d52b84e28a51512e10ee18cf58bdd850c0
STATUS_R07=P02_R07_LOCAL_PASS
GATES_R07=IMPLEMENTACAO_TESTES_TYPECHECK_ESCOPO_DIFF_CHECK_PRESERVACAO_APROVADOS
P02_INTEGRACAO=EM_ANDAMENTO
INTEGRACAO_FUNCIONAL=NAO_IMPLEMENTADA
CONTRATO_M2M_CRM=PENDENTE_DE_VALIDACAO_CRM
PROMOCAO=NAO_AUTORIZADA

P02-R07 e um micropasso desta fase, nao o pacote P07 da integracao listado no historico.

- [x] Referencia remota legacy-prod confirmada no mesmo SHA da base R06; branch/diretorio R07 livres antes da criacao.
- [x] Nova worktree criada limpa, sem reutilizacao ou limpeza de diretorio existente.
- [x] Apenas contrato e checklist R06 copiados; originais e respectivos hashes preservados.
- [x] Auditoria dirigida: contrato R06, completude/plausibilidade puras, identidade local, testes/configuracao e ausencia de implementacao equivalente.
- [x] Nucleo puro criado em backend/src/services/CrmIntegrationServices/BuildCrmContactIntentService.ts; nenhum modulo compartilhado modificado.
- [x] Tipos explicitos para snapshots/contexto, resolucao/vinculo, candidato, sem acao e identidade pendente; telefone E.164 explicitamente resolvido, sem inferir DDI ou converter LID.
- [x] Reuso do avaliador de completude existente; projecao semantica minima, sem contar mensagens, updatedAt, tags ou foto como enriquecimento.
- [x] Modulo desconectado: nenhuma referencia produtiva, chamada HTTP/SQL/webhook/WhatsApp ou ativacao de flag.
- [x] Testes novos sinteticos: 62 PASS. Regressao pura de completude: 9 PASS. Rodada final conjunta: 71 PASS / 0 FAIL, duas suites.
- [x] Falha inicial de uma fixture local classificada e corrigida somente no novo teste; reexecucao focada aprovada, sem patch em modulo estavel.
- [x] Typecheck estrito focado com tsc --noEmit PASS; build completo do backend nao executado, sem emissao de artefatos.
- [x] Imports puros e ausencia de relogio/rede/ambiente/IDs de evento e comercio verificados via parser TypeScript; diff dos consumidores/dependencias preexistentes vazio.
- [x] Original e R06 preservados por HEAD/branch/status/hashes; nenhuma mutacao CRM, commit, push ou deploy.
- [x] Encerramento documental final: escopo exato de cinco arquivos, historico importado, TXT fisico e diff-check incluindo todos os untracked aprovados; nenhum commit, push ou deploy.

Todas as decisoes retornam transport=not_released, commercialOperation=not_requested e m2mContract=PENDENTE_DE_VALIDACAO_CRM. Nao criam event_id, source_revision, journal, fila, worker, scheduler ou admissao comercial. Um candidato local nao e evento enviado, contato persistido ou operacao comercial confirmada.

Os 24 cenarios E2E de R06 continuam apenas definidos; nao foram executados. Pendencias exclusivas da futura integracao: homologacao M2M, autorizacao do journal e transporte/recibos, conexao produtiva e validacao funcional em pacote autorizado. P02 continua em andamento; promocao bloqueada.

TXT_R07=D:/Samacon/worktrees/samachat-crm-p02-r07-20261002/auditorias/SAMACHAT-CRM-P02-R07-CONSOLIDADO-20261002.txt

## Registro P02-R08 - Fundacao Independente de Proveniencia

Historico R06/R07 acima herdado integralmente do commit 65c1ff728ad8f9f401767615af902524f2187466, sem recopia, reescrita ou modificacao do nucleo R07. R08 e micropasso de P02, nao conclusao da integracao ou do pacote P07 historico.

WORKTREE_R08=D:/Samacon/worktrees/samachat-crm-p02-r08-20261002
BRANCH_R08=feature/samachat-crm-p02-r08-20261002
BASE_R08=65c1ff728ad8f9f401767615af902524f2187466
STATUS_LOCAL_R08=P02_R08_LOCAL_PASS
PUSH_R07=VERIFICADO_NO_SHA_65c1ff728ad8f9f401767615af902524f2187466
PUSH_R08=AUTORIZADO_SOMENTE_APOS_PREFLIGHT_E_COMMIT; resultado final documentado no TXT externo, sem alegar aqui um push ainda nao ocorrido.
P02_INTEGRACAO=EM_ANDAMENTO
INTEGRACAO_FUNCIONAL=NAO_IMPLEMENTADA
CONTRATO_M2M_CRM=PENDENTE_DE_VALIDACAO_CRM
PROMOCAO=NAO_AUTORIZADA

- [x] R07 confirmado limpo no commit aprovado, parent correto e cinco arquivos; branch remota ausente antes do push.
- [x] Automacao versionada conferida: feature/* nao aciona workflows de publicacao/deploy; politica documentada de producao legacy-prod preservada.
- [x] Push exclusivo R07 sem force/rebase/merge, remoto confirmado no SHA autorizado e legacy-prod inalterada.
- [x] Nova branch/worktree R08 criada limpa no commit R07; nenhuma worktree anterior alterada ou CRM acessado.
- [x] Auditoria dirigida dos quatro consumidores diretos, com oito chamadas handleMessage: Cloud (1), wwebjs (5), whaileys (1) e bridge (1).
- [x] Tipo MessageProvenance e classificador/resolvedor puros; metadata opcional messageProvenance no contexto; ausencia/invalidez resolve unknown, nunca realtime por default.
- [x] Proveniencia anotada apenas onde comprovada: wwebjs eventName, whaileys notify/append, Cloud change.field e callback preparado de reconciliacao.
- [x] History, echo, outbound, reconciliation, ack e unknown permanecem sem elegibilidade comercial; grupos continuam sujeitos ao guard e R07, sem regra nova de grupo.
- [x] Corpo e assinatura decisoria do handler inalterados; AST confirma codigo operacional identico a R07 ao remover somente imports/tipos/metadata novos.
- [x] Regressao final dirigida: 163 PASS em 13 suites; roteamento Cloud mockado: 4 PASS; total 167 testes distintos, 0 FAIL na validacao final.
- [x] Typecheck estrito dos novos componentes/testes PASS; arquivos compartilhados com 17 diagnosticos herdados iguais a R07, zero novos; typecheck/build geral NAO declarado PASS.
- [x] Nenhum journal/transporte/webhook/worker/credencial/endpoint/negocio/opportunity/Agente SDR; nenhum import produtivo do builder R07.
- [ ] Encerramento de commit/push R08 e verificacao do SHA remoto; resultado deve constar no TXT unico externo.

Metadata: kind=realtime|history|echo|outbound|reconciliation|ack|unknown; provider=wwebjs|whaileys|cloud_api|unknown. Source/receiver/direction/group/ticket/read/storage/socket/merge/roteamento permanecem com suas regras anteriores. ACK e historico Cloud continuam nos processadores existentes fora de handleMessage; nenhum novo caminho operacional criado.

Rollback previsto: retirar somente o delta deste commit de trabalho mediante autorizacao, preservando a base R07; nenhuma mudanca de dados ou ambiente real a desfazer. Nenhum rollback ou promocao executado.

TXT_R08=D:/Samacon/auditorias/SAMACHAT-CRM-P02-R08-CONSOLIDADO-20261002.txt

## P02-R09 - Fundacao M2M integrada isolada

- Baselines: SamaChat R08 `36058bf7e35f6bc3cf5f07d99af6f2a0ad0a04c9`; CRM P03 `a9491e859265b4208d042e444cd7f8133054b149`.
- Contato M2M, org vinculada, binding externo, idempotencia e recibo/readback: implementados e validados em laboratorio sintetico, sem ativacao real.
- R07/R08 preservados: adaptador puro reutiliza builder e metadata; nenhum provider/handler produtivo importa o novo caminho.
- Admissao comercial: bloqueada por ausencia de inicializacao/autorizacao M2M de raiz homologada; RPC P03 nao cria a raiz e gateways piloto nao sao credenciais de maquina.
- Journal/worker/origem duravel: pendente; atomicidade com atendimento nao comprovada, portanto nao houve wiring produtivo ou nova migration SamaChat.
- Novas credenciais, contas SDR, rotacao, politica comercial e ativacao real: gates futuros explicitos, nao executados.
- P03 funcional concluido permanece declaracao do usuario; laboratorio nao certifica seu ambiente real nem retoma auditoria geral.
- PES/SAMACON completos indisponiveis; regras mestras explicitas seguidas, sem falsa certificacao dos textos ausentes.
- Status esperado apos preflight/publicacao exclusiva: `P02_R09_CONTACT_SYNC_PASS_ADMISSION_BLOCKED`; nenhuma integracao produtiva declarada.
- TXT consolidado externo: `D:/Samacon/auditorias/SAMACHAT-CRM-P02-R09-M2M-CONSOLIDADO-20261002.txt`.