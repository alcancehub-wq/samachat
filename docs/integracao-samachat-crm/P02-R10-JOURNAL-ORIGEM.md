# P02-R10 - Journal transacional de origem

Base R09: 2f7f93328ba5d1c2dcd5239c3e77b1a9fff89f20. Implementacao isolada,
SamaChat somente. Nenhum transporte, Agente SDR, CRM/P04 ou ambiente real autorizado.
PES 1.0 e protocolo SAMACON integral nao disponibilizados; regras explicitas do
prompt aplicadas sem alegar certificacao documental integral.

## Invariantes antes da implementacao

1. Captura isolada controla explicitamente a mutacao cadastral e a gravacao do
   comando/journal na mesma transacao Sequelize/InnoDB. Nao chama servicos legados
   que possuem efeitos fora dessa transacao. Falha de qualquer escrita impede
   confirmacao integrada. Atomicidade so recebe PASS apos prova em banco compativel.
2. captureKey UUID identifica uma mutacao, nunca uma tentativa de transporte.
   Reuso da mesma chave e input hash devolve resultado duravel; divergencia rejeita
   sem nova mutacao. Resultado inelegivel tambem e idempotente.
3. Snapshot anterior lido sob lock e mutacao realizada sob a mesma transacao.
   Regras R07/R08/R09 decidem elegibilidade; nenhum segundo motor de leads.
4. Revisao positiva serializada por contato/instalacao, baseada em delta semantico,
   nao updatedAt. Nova chave com mesmo snapshot pendente reutiliza evento anterior.
   Alteracao de target integration/org da identidade persistida exige reconciliacao.
5. Evento, correlacao, identidade decimal segura, revisao, versao, operacao e corpo
   do envelope R09 sao imutaveis. JSON.stringify do envelope normativo R09 e o corpo
   canonico persistido uma unica vez; SHA256 cobre seus bytes UTF-8. Nao regenerar
   corpo/evento em retry. Digest de input/semantica usa chaves ordenadas.
6. Estados e marcos locais distinguem persistencia, tentativa, transporte, recibo,
   contato remoto e reconciliacao/falha. commercialOperation e sempre not_requested.
   Lease/CAS do futuro worker nao implementa envio automatico.
7. Nenhum hook global, socket, mensagem, tag, merge ou webhook e introduzido.
   Criacao/update minima isolada nao substitui a resolucao canonica de contatos,
   tags/extraInfo, LID/merge ou permissao operacional dos consumidores legados.
8. Fechado por padrao via configuracao explicita, nunca org inferida ou .env real.
   PRODUCTIVE_WIRING_ENABLED=FALSE. Laboratorio usa dados sinteticos e nao prova
   captura automatica de uma mensagem recebida pelo atendimento existente.

## Fronteira identificada

CreateContactService grava contato/extraInfo, depois tags/reload/webhook sem
transacao compartilhada explicita. UpdateContactService faz varias escritas
independentes. CreateOrUpdateContactService resolve identidade/LID/merge e possui
efeitos operacionais. CreateMessageService upsert e posteriormente emite sockets.
Nao anexar uma gravacao posterior ao journal e chamar isso de atomicidade.

A menor fronteira autorizada e um servico novo e desconectado, com repositorio
transacional proprio sobre o Sequelize existente. O wiring dos produtores
estaveis depende de outro gate e fica fora do R10.

## Estrutura implementada

Migration aditiva `20261002173000-create-crm-origin-journal.ts`: duas tabelas
InnoDB no banco SamaChat, `CrmOriginCaptureCommands` e `CrmOriginJournals`.
Modelos tipados registrados em database/index sem sync, hooks globais, instanciacao
de produtor ou alteracao de server/handler/provider. Nao existe nova infraestrutura
de fila ou banco separado para a arquitetura produtiva; o banco separado e somente
o laboratorio de prova. Nenhuma migration foi aplicada em ambiente existente.

CrmOriginJournalService recebe configuracao explicita validated de identity e
enabled; false/ausente nao abre transacao nem modifica origem. Nao le .env ou
infere organizacao. O caller futuro precisa de autorizacao operacional e identidade
de instalacao provisionadas em gate proprio, nao senha/UUID/email de SDR.

O repositorio exige Sequelize mysql e Contact/modelos vinculados a mesma instancia.
Managed transaction READ COMMITTED controla comando, lock de contato, create/update
minimo, classificacao R09/R07, ultimo journal com lock, insercao e resultado duravel.
Confirmacao source=committed so e devolvida depois do commit. Hash de input ordenado
e chave captureKey protegem inclusive mutacao inelegivel contra replay/duplicacao.
Unicidade de eventId e instalacao/contato/revisao, alem do lock da origem, protegem
concorrencia. Uma nova mutacao com semantica igual reutiliza o evento ja persistido.
O envelope R09 fornece versao/operacao/snapshot e decimal local; nenhuma copia do
motor de elegibilidade foi criada. Tags/foto/email/cidade/updatedAt nao sao enviados
ao CRM; indicacao so influencia completude pelo helper R07 existente.

Triggers exclusivamente nas tabelas novas impedem reescrita dos identificadores,
corpo, hashes, revisao, contexto e resultado de comando ja concluido. Estados e
marcos tecnicos sao atualizaveis por interface local scoped. O repositorio nao
oferece delete/purge. Operacoes administrativas com poder de DROP/TRUNCATE estao
fora da garantia de imutabilidade; requerem politica e autorizacao futuras.

## Estados e recuperacao

intent_persisted nao confirma CRM. begin_attempt requer CAS de stateVersion,
attemptId UUID e lease limitado; nenhuma chamada de rede e executada. Transporte
aceito tem marco separado, sem receipt/contactConfirmedAt implicitos. Timeout ou
lease expirado vira reconciliation_required, preservando evento/corpo/hash/revisao.
Recibo passa pelo parser R09 e escopo original; so campos contratados sao guardados.
accepted/not_persisted resulta receipt_validated e permanece disponivel para
readback futuro. Created/reused/enriched validos confirmam apenas contato; estado
contact_confirmed nao regride por timeout tardio. commercialOperation nunca deixa
not_requested. Falha terminal conserva registro e origem, sem evento novo.

Leitura local read/pending e transicoes exigem org/integracao/instalacao explicitas.
Nao ha endpoint publico, worker, cron, agendador, callback ou envio automatico.
Retry ownership continua reservado ao worker exclusivo futuro, nao a este pacote.
Reconciliacao/receipt recebidos pela interface local pressupõem caller server-side
confiavel e transporte autenticado futuro; o journal nao autentica HTTP que nao fez.

## Evidencia de verificacao

JOURNAL_FOUNDATION_IMPLEMENTED=TRUE
SOURCE_CAPTURE_ATOMIC_VERIFIED=TRUE_IN_ISOLATED_SERVICE
PRODUCTIVE_WIRING_ENABLED=FALSE

7 suites, 194 testes distintos PASS, 0 FAIL/0 SKIP finais: R10 puro12 + SQL28,
R07/completude71 + R08 proveniencia/AST48 + R09 cliente35. Reruns nao somados.
MySQL dialect real via Sequelize5/mysql2 sobre MariaDB10.11.10/InnoDB portatil:
rollback de insert/update de origem, falha de journal, falha apos journal/pre-commit,
concorrencia, replay/conflict, revisao, corpo/hash/comando imutaveis, LID/enriquecimento,
scope/receipt/CAS/lease e preservacao de ticket demonstrados. HTTP request bloqueado
e assertado zero na suite SQL. Regras inelegiveis reaproveitadas de R07/R08/R09.

Reinicio fisico do processo/datadir e nova instancia do repository compilado
preservaram evento/hash/revisao; recoverExpired retomou o mesmo evento como
reconciliation_required. Check adicional documentado no TXT, nao somado aos194.
Compilacao estrita direcionada PASS; build/typecheck geral nao executado/certificado.
Nenhum teste CRM R09 repetido, schema CRM/P04 modificado ou dados reais consultados.

## Laboratorio e reproducao

Artefatos exclusivamente em backend/node_modules/.cache/r10-origin-lab, ignorados.
MariaDB portatil oficial10.11.10, SHA256 do ZIP verificado contra sha256sums oficial.
Datadir novo, bind127.0.0.1:55441, sem servico Windows/Docker/.env de producao.
Fixture opt-in CRM_ORIGIN_LAB_ENABLED=1 verifica @@datadir e versao antes de criar
apenas r10_origin_lab. Ela nao importa database/index/bootstrap/server. Model Contact
da fixture e minimo, nao o schema operacional completo; capacidade do adapter sobre
Contacts e comprovada, mas produtores legados e todos seus efeitos nao foram wired.

Usar Jest26/ts-jest26 com compiler TypeScript4.9 explicito, decorators/metadata,
strict e tipos node/jest; setupFiles/AfterEnv vazios, runInBand e cache=false.
Em worktree sem deps completas, fixar mapper lru-cache no transitivo6 do mysql2;
Jest antigo pode resolver equivocadamente outra versao, embora Node nativo funcione.
Reusar deps existentes e runner direto; nao npm test, cujos hooks migram/semeiam DB.
Compilacao em diretorio ignorado permite read/recover em processo novo. Testes SQL
tem opt-in fechado; seus skips de uma descoberta padrao nao sao prova de execucao.

## Limites e rollback

Nao substitui CreateOrUpdateContactService, dedupe por numero equivalente/LID,
merge, tags/extraInfo, sockets, tickets/filas ou regras operacionais. Nao promete
atomicidade desses produtores legados, capture de cada mensagem ou entrega real.
Hook global foi deliberadamente evitado. Instalacao restaurada que reutilize IDs,
merge de identidades, retention/purge LGPD, configuracao/provisionamento, worker,
SLA/backoff e wiring operacional exigem gates separados. P04 nao e dependencia.
PES1.0 e SAMACON integrais continuam nao acessiveis; R06/checklist e regras explicitas
lidos, sem certificacao documental integral dos dois protocolos ausentes.

Rollback de codigo: desativar configuracao explicita e nao promover/deployar branch.
Migration down so remove tabelas vazias; com comando/evento persistido ela bloqueia
para impedir perda silenciosa. Preservar journal para reconciliacao, nunca apagar
eventos como rollback de contato. MySQL DDL nao e transacional; aplicacao real da
schema/migration e compatibilidade do ambiente exigem outro gate autorizado.
Concluir apos commit/push exclusivo e TXT final; nao iniciar R11.