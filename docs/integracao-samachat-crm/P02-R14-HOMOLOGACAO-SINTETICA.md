# P02-R14 - Homologacao integrada sintetica

SamaChat base R13 a2432a98ade7576e996a10fc2434767813212dc8;CRM fonte imutavel
R09 49e3279009c2f2fd681f194c034e92adcf1d43ff. Apenas harness/fixtures/tests/docs
na worktree feature/samachat-crm-p02-r14-integrated-e2e-20261003;CRM fonte read-only.
PES1.0/SAMACON integrais indisponiveis;regras explicitas e contratos anteriores
disponiveis seguidos,sem certificacao integral ou redescoberta geral.

COMMERCIAL_OPERATION=NOT_REQUESTED
PRODUCTION_MUTATION=NONE
CRM_REPOSITORY_MUTATION=NONE
AGENT_SDR_MUTATION=NONE
PRODUCTIVE_CAPTURE=FALSE
PRODUCTIVE_DELIVERY_ENABLED=FALSE

## Cadeia real

CreateContactService/UpdateContactService reais opt-in -> transaction MariaDB e
journal R10 -> CrmDeliveryCoordinator R13 -> SendCrmM2mAttempt/HMAC R09 ->
createHandler core CRM R09 real -> samachat_m2m_contact_v1/PostgreSQL -> contato,
binding,receipt duraveis -> receipt validado/estado contact_confirmed no journal.
Transporte e Request/Response em memoria,nao receptor ficticio ou HTTP200fabricado.
Mock somente de model bindings para fixtures ORM e webhook legado para bloquear
efeitos externos;transacao/mutacao/produtores/motores/coordinator/client/gateway/
RPC/bancos sao os componentes reais. Nao schema operacional inteiro ou E2E de prod.

## Ordem e isolamento

1. SHAs SamaChat/CRM local-remoto e destino livre confirmados,binarios locais existentes.
2. Prova barata de transpilar/carregar core imutavel em memoria,drivers mysql2/pg,
   rejeicao405 real;0 conexoes de banco,sem download. So entao laboratorios preparados.
3. git archive do commit CRM49e somente6arquivos para ignored lab/crm;nenhuma escrita
   no repoCRM. LF/CRLF normalizados para pinsSHA256,sem edicao de regra.
4. Datadirs MariaDB ePostgreSQL R14 novos,loopback127.0.0.1:55445/55446. Helpers
   conferem path EXATO,versao,host,port eDBexclusivo antes CREATE/DROP/schema. Opt-in
   CRM_INTEGRATED_LAB_ENABLED=1 obrigatorio. Admin PostgreSQL valida DBpostgres
   no cluster proprio antes criar r14_crm_lab;roles de fixture resetadas apenas ali.
5. MariaDB:fixture Contacts/Info/Tags/ContactTags/Tickets e migrationR10 existente.
6. PostgreSQL:tests/m2m/schema.fixture.sql,20261001180000 foundation P03,
   20261001182000 root guards,20261001183000 create-opportunityRPC,
   20261002150000 M2Mfoundation. SQL originalcopiado/pinado,sem CLIgeral migrations.
7. Primeiro somente caso feliz A,aprovado antes de expandir B-E. Confronto por
   conexoes independentes aos dois bancos,nao logs ou apenas respostaHTTP.

Core/migrations sao fonte contratual CRM de teste copiada em
backend/node_modules/.cache/r14-integrated-lab/crm,nao dependencias vendorizadas
no commit. Hashesnormativos pinados em CrmIntegratedGatewayLab.ts. SQLaplicado
na mesma ordem do harness R09 previamente comprovado;negocios/oppsP03 vazios.
M2M_INTEGRATED_LAB_PG_MODULE aponta driverpg instalado local,nao segredo/DSN.
Nenhum .env/credencialprodutiva,Supabase/EasyPanel,Docker,terminalexterno outooldownload.
Binario MariaDBR10 apenaslido,datadirs R09-R13 intocados. WebCrypto/Request/Response/
Headers nativos Node24 carregados por adapter VM por incompatibilidade ambiente
Jest26 antigo;receiver executado sem alterar fonte. PostgreSQL17.7 real,nao mock.

## Provas A-E

A:Contato/extraInfo/tags eevento criado pelo produtorreal na transacao;HMAC,
gateway/RPC criam1CRMcontact/1binding/1receipt;receiptid/event/org/revision/bodyhash
coerentes por SQLindependente eSamaChat contact_confirmed.

B:Mesmo Contact local,observador do adaptador verdadeiro ve before/after completos,
nome/canal semanticos geramrevision2. Entrega reusa CRMcontactId/binding. Nome/canal
previamente preenchidos/curados CRM ficam iguais,nao alterada regra para fazer PASS.

C:RPCCRMcommit/receipt real persistido,adaptador perde resposta. Source registra
incerteza,dadosduraveis preservados. Novorepository/coordinator aposcooldown usa
get_receipt original,mesmo receiptid/event/revision/body e1upsert/1readback. Sem
novo contato/evento ou upsertautomatico. Restartlogico,nao processo inteiro/producao.

D:CaptureKey/input iguais reusamresultado eIDs/bod/hash/revision/associacoes sem
webhookreplay. Coordnao entrega evento confirmado novamente. Payloaddivergente
conflita antes denovaescrita. Replayupdate aposoutro update devolveprojecao original
sem desfazerestadoatual,um CRMcontact permanece.

E:HMACincorreto401 eorg/instanciaalterada com assinatura validad403 antesRPC;
history/echo/outbound/ACK/reconciliation/unknown/phoneunresolved/incompatível geram
0intencoes/0pessoaficticia. Troca phone em identidade bound causa conflito duravel,
preservando contato curado/binding antigos. Fault em associacao/journal local
rollback source/infos/tags/command,sem remoto. Fault na persistencia receipt CRM
rollback contato+binding+receipt juntos;readback404 permaneceinconclusivo semupsert.

Org/sourceInstance/sourceContactId sao identidade externa canonica,nao ticket ou
Whatsappconnection. Duas conexoes sinteticas no envelope reusam mesmoCRMcontact/
binding. Contexto de conexao testado com gateway real eeventos sinteticos proprios,
nao envio/alteracao do WhatsApp ou produtor automatico.

Depois detodos cenarios,SQLverifica0deals/opportunities/roots/eventsP03. Contato
nao constitui admissao comercial;nenhuma ONEDEAL adaptada ou inteligenciaSDR.

## Resultados e reparos

20 testes novos distintos PASS/0FAIL/0SKIP finais. Reruns/casoA inicial nao somados
novamente. Nenhuma suitehistorica inteira ou testecontraCRMreal repetido.
NativeHTTP/HTTPS bloqueados/assertados0;gatewayexecutadoemmemoria com RPCreal.
Checks strict/noUnused das fixtures ecomparacao diagnostics dos produtores/test
antes/depois;build/typecheckgeral nao homologado. Contagens/gates/SHAs finais no TXT.

Resultado final de tipos: fixtures strict/noUnused PASS; programa Create/Update
mais harness comparado com R13: 1 diagnostico herdado antes/depois, zero novo.
Nao equivale a typecheck/build geral aprovado. A homologacao nao exigiu mudanca
funcional SamaChat R09-R13 ou fonte CRM; nenhum transporte/caller foi conectado.

Reparos exclusivamente harness:patchdecontexto recusado semescrita;WebAPI ausente
no sandboxJest (Nodeja suportava),hostPostgreSQL inet::text incluia/32 eguard
passou ausarhost(inet_server_addr()),tiposNodelegados sem crypto.webcrypto usaram
Crypto nativaVM existente. Fonte/runtime SamaChat R09-R13 eCRM nao precisaram
qualquercorrecao funcional/contrato. Nenhum PASS substituindoPGSQLpor mock.

## Preflight e rollback

Runtime/model/migration/config/callers/workers/credenciais/workflows protegidos.
Whitelist somente fixtures/harness/docs;binarios/copiaCRM/datadirs ignorados fora
do commit. NovoComponente nao importado porapp;flagsdefaultoff. Scripts/testes
recusamservidor com metadata fora do labantesDDL. Roles/TRIGGERdeFault somente
fixturesdescartaveis,nao operacionais.

Rollback:nao ativar/caller/worker nem promoverfeature;reverter somentedeltaR14 sob
autorizacao. Desligarlabsprimeiro,preservaroriginais/CRMfontes e evidencias anteriores.
Nenhuma mudanca dedadosprodutivos ouM2Mcomercial a desfazer. Se fonteCRM/SamaChat
referencia divergir ouinfra local faltar,pararBLOCKED,nao adaptar silenciosamente.

Gates futuros:ambienteschema/permissoes/triggers reais,provisionamento/config/
rotacao/segredos,runtime/networkauth eTLS/SLA/cancelamento/transporte/retention,
callers e revisaoprodutiva explicitamenteautorizados. Esta homologacao e apenas
integradaSINTETICA,nao producao certificada. Encerrar apos TXT,nao iniciarR15.