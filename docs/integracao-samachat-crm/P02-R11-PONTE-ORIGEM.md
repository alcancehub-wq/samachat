# P02-R11 - Ponte transacional de origem

Base R10 a1b0037d49263c30027b5b3b39f1c45bca35b740. SamaChat somente, branch
feature/samachat-crm-p02-r11-source-bridge-20261003. Nenhuma entrega CRM,
inteligencia SDR, operacao comercial, migration produtiva ou promocao autorizada.
PES1.0/SAMACON integrais continuam indisponiveis; regras explicitas aplicadas,
sem alegar certificacao documental integral ou reabrir auditorias anteriores.

## Fronteira escolhida

SOURCE_BRIDGE_IMPLEMENTED=TRUE_EXPLICIT_CREATE_CONTACT_OPT_IN
ATOMIC_CAPTURE_PER_PRODUCER=CreateContactService_VERIFIED_IN_LAB
LEGACY_BEHAVIOR_PRESERVED=VERIFIED_WITH_LIMITS_BELOW
PRODUCTIVE_DELIVERY_ENABLED=FALSE

CreateContactService preserva o mesmo lookup de numero, AppError de duplicidade,
campos do create, include extraInfo, tags, reload e contrato de retorno. Nenhum
novo algoritmo substitui normalizacao, LID, numero equivalente, contato preferido
ou merge. A funcao de persistencia original recebe Transaction somente quando a
ponte explicita estiver habilitada. Sem segundo argumento, ou enabled=false,
queries/opcoes/efeitos permanecem os legados, sem query do journal ou transacao nova.

Segundo argumento CreateContactSourceContext e configuracao/contexto server-side,
nao parte do body HTTP: identity explicita, enabled, captureKey/correlationId,
phoneE164 resolvido, bindingStatus e contexto/autorizacao/proveniencia R07-R09.
Body com sourceContext/enabled/identity nao habilita a ponte. Callers/controller
existentes continuam de um argumento; nao recebem flag ou contexto automaticamente.
O R11 fecha o produtor opt-in real, nao uma ativacao dos endpoints operacionais.
Provisionar/atestar configuracao e contexto em callers exige outro gate.

## Transacao e reuso

SequelizeCrmOriginJournalRepository recebe apenas um callback opcional aditivo
sourceMutation(mutation, transaction). API anterior/caminho default sao preservados;
se ausente, executa exatamente seu writer R10. Nenhuma tabela/migration nova,
motor de elegibilidade paralelo, mudanca de envelope ou armazenamento alternativo.

CaptureCreateContactSourceBridge conecta CrmOriginJournalService a esse callback.
O R10 bloqueia a chave de comando antes da mutacao; CreateContactService realiza
lookup/create com extraInfo, tags e reload na mesma Transaction do journal/command.
O snapshot vem do Contact efetivamente persistido pelo produtor. R07/R08/R09
decidem elegibilidade e R10 controla identidade, revisao, hash, evento e recibos.
Falha em source/association/journal/pre-commit desfaz tudo e nao dispara webhook.

Somente o caminho opt-in verifica previamente as cinco tabelas de escrita como
InnoDB em information_schema. Tabela ausente ou engine nao transacional bloqueia
antes de mutar; case de nome respeita lower_case_table_names do servidor. Nenhuma
DDL, troca de engine ou migration e executada pela ponte. O default legado nao
consulta o journal/schema. Alteracao administrativa concorrente de schema, triggers
operacionais desconhecidos e permissoes reais ainda exigem homologacao antes de
habilitar callers; a fixture nao certifica o schema produtivo completo.

producerInput inclui todos os dados efetivos do create e associacoes apenas no
hash idempotente do comando. Mudanca de tags/extraInfo com mesma chave conflita,
nao e ignorada. Esses dados nao entram no envelope M2M nem sao armazenados como
payload bruto do comando. Mesmo captureKey/input reutiliza contato/evento sem
reescrever body/hash/revision e sem repetir webhook de criacao. Replay de contato
removido gera erro explicito, nunca recria identidade automaticamente.

TriggerWebhooksService generico existente permanece void e apenas apos commit,
para a criacao efetiva. Nao foi removido, conectado ao M2M ou convertido em novo
transporte. Foi mockado nos testes; zero HTTP real. Sockets do controller seguem
fora do servico e nao foram alterados. Caller futuro deve tratar replay/efeitos
externos antes de habilitar contexto; R11 nao certifica idempotencia de sockets
em endpoints ainda nao conectados nem exactly-once de efeitos externos.

## Cobertura Por Produtor

| Produtor | R11 | Limite |
| --- | --- | --- |
| CreateContactService | Ponte opt-in, atomicidade SQL comprovada | Config/contexto server-side explicitos; sem habilitacao dos callers atuais |
| UpdateContactService | Sem wiring, preservado e testado | Upsert/destroy de extraInfo, update, tags/reload independentes; necessita limite proprio, snapshot locked e politica de retry, nao anexar journal depois |
| CreateOrUpdateContactService | Sem wiring, preservado | Preferencia/equivalencia/LID/merge, foto, Ticket.update/destroy/contact.update e socket sem unica transacao; ligar indiscriminadamente reformaria core/efeitos |
| CreateMessageService | Sem captura | Mensagem/ACK/historico/contagem nao e mutacao cadastral elegivel; upsert e sockets mantidos |
| handleWhatsappEvents/provedores | Sem wiring/refatoracao | Proveniencia R08 e guards mantidos; nao registrar por mensagem/foto/ACK/history/echo/reconciliation/outbound/unknown |

Nao alegar atualizacao semantica ou enriquecimento LID capturados pelo produtor
automatico. A fundacao R10 anterior suporta-os em superficie isolada, mas isso
nao substitui prova de sua ponte operacional. Casos LID/colisao/merge permanecem
com regras existentes, sem journal indevido ou alteracao de ticket pela ponte.

## Provas Executadas

- 25 testes SQL: produtor real create/update sobre modelos de fixture Sequelize
  com extraInfo/tags e migration R10, em MariaDB10.11.10/InnoDB novo e guardado.
  Rollback source/tag/journal/pre-commit, replay/conflito, concorrencia por chave e
  numero, webhook visivel pos-commit, default-off/body nao habilitante, ineligibilidade,
  pendencia telefone, atualizacao nao wired, LID/colisao/ticket intactos, writer R10
  default compativel, recusa de MyISAM sem afetar default legado. Zero http/https.request
  nos testes da ponte.
- 5 testes focados strict da ponte: callback recebe transacao, replay nao muta,
  source fault nao insere/completa command, schema ausente/inseguro/case bloqueado.
  Mocks nao sao prova atomica.
- 3 testes novos de preservacao explicita LID pendente/enriquecimento/merge no
  produtor automatico, com zero escrita journal/command. Nao sao wiring desse produtor.
- Regressao R10 pura e consumidores proximos, sem repetir os194 testes anteriores;
  contagem final distinta, falhas intermediarias e limits constam do TXT.
- Typecheck strict do recorte novo aprovado. Produtor/teste SQL com strict e
  strictPropertyInitialization=false por modelos legados:1 diagnostico herdado
  antes/depois,0 adicionado. Nao e build/typecheck geral PASS.
- Regressao handler offline passou com tentativa de conector MySQL bloqueada
  igualmente na base R10 e R11. Nenhuma conexao real aberta; ressalva nao ocultada.

Fechamento dirigido: 7 suites,80 casos distintos PASS,0 FAIL/0 SKIP finais:
ponte strict5 + SQL25 + R10 puro12 + preservacao nova3 + legado35. Os194 historicos
R10, reruns e os24 de comparacao do handler na base nao entram novamente na soma.
AST semantica comprova writer create legado identico removendo apenas plumbing
Transaction, e repository R10 default identico sem callback opcional. Comparadores
baseados em impressao geraram falso diff de layout; prova final usa kind/literais/
estrutura, sem ignorar mudancas semanticas. Checks estaticos ampliados com os tres
produtores e testes:31 diagnosticos herdados antes/depois,0 novos; programa mais
estreito da criacao/update tinha1 antes/depois. Typecheck geral nao aprovado.

Falhas intermediarias: dois tipos locais da ponte corrigidos, matcher AppError
legado nao-Error ajustado, teste ES2020 allSettled trocado por ES2019, guard de
engine corrigido para case policy Windows e fixture negativa MyISAM acomodada
removendo/restaurando apenas seu indice de busca; migration R10 inalterada.

Laboratorio novo backend/node_modules/.cache/r11-source-lab, bind127.0.0.1:55442,
database r11_source_lab; opt-in valida @@datadir/versao antes de schema. Binario
portatil R10 apenas lido/reusado, datadir R10 nunca modificado. Sem .env/credencial
produtiva, Docker ou terminal externo. Modelos de fixture nao sao schema produtivo
completo; codigo do produtor/callback/engine e transacoes reais foram exercitados.
Entry SQL usa isolatedModules apenas por imports legados; checks de tipos separados.

## Gates e Rollback

Entrega produtiva, CRM/P03/P04/P05, Vivian/SDR, ONE DEAL, worker, deploy e schema
real continuam proibidos. Nenhum novo campo M2M ou migration criada no R11.
Configuracao default-off nao requer tabela R10 no caminho legado. Habilitacao
futura precisa validar schema/provisionamento/permissoes/caller e replay de efeitos.

Rollback de codigo: omitir/desligar segundo argumento e, sob autorizacao, reverter
somente commit R11, preservando R10/journal/commands e estados do atendimento.
Nao apagar eventos nem alterar/reverter CRM ou worktrees paralelas. Falha atomica
na ponte nao cai para mutacao legada silenciosa. Nao iniciar R12 automaticamente.