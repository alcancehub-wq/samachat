# Bugs Operacionais SamaChat

Data da auditoria: 2026-05-20
Escopo: legado `backend/src` + `frontend/src`
Objetivo: registrar os 10 bugs reportados, os arquivos candidatos, a hipotese inicial, a evidencia ja encontrada, o risco operacional e a prioridade antes de qualquer correcao.

## Bug 1 - Contato fora do pais / DDI / DDD

- Prioridade: P4
- Arquivos candidatos:
	- `backend/src/controllers/ContactController.ts`
	- `backend/src/helpers/BuildContactNumberCandidates.ts`
	- `backend/src/helpers/NormalizeValidatedContactNumber.ts`
	- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
	- `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`
	- `backend/src/services/WbotServices/CheckIsValidContact.ts`
	- `backend/src/services/WbotServices/CheckNumber.ts`
- Hipotese inicial:
	- o legado melhorou a validacao brasileira, mas ainda separa caminhos de numero local, internacional, `lid` e grupo; qualquer divergencia entre validacao manual, eco do provider e merge de contato pode gerar contato duplicado ou invisivel.
- Evidencia encontrada:
	- o controller limpa caracteres nao numericos antes da validacao.
	- `wwebjs.checkNumber()` usa candidatos com `55` para casos brasileiros.
	- `CreateOrUpdateContactService` aceita `lid`, tenta merge por `number` e `lid`, e pode zerar `number` quando o telefone nao passa como plausivel.
	- contatos manuais continuam dependendo de `CheckIsValidContact` + `CheckNumber` no provider.
- Risco operacional:
	- `ERR_WAPP_INVALID_CONTACT`, duplicidade por formato, ou contato internacional existir mas ficar com representacao diferente do recebimento automatico.

## Bug 2 - Mensagem enviada pelo SamaChat nao registra no SamaChat

- Prioridade: P1
- Arquivos candidatos:
	- `frontend/src/components/MessageInput/index.js`
	- `backend/src/controllers/MessageController.ts`
	- `backend/src/services/WbotServices/SendWhatsAppMessage.ts`
	- `backend/src/services/WbotServices/SendWhatsAppMedia.ts`
	- `backend/src/handlers/handleWhatsappEvents.ts`
	- `backend/src/services/MessageServices/CreateMessageService.ts`
	- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
	- `backend/src/providers/WhatsApp/Implementations/whaileys.ts`
- Hipotese inicial:
	- o texto/midia sai para o WhatsApp, mas a persistencia depende do evento de retorno do provider; se esse eco falhar ou for filtrado, a mensagem nao entra em `Message` e some do historico.
- Evidencia encontrada:
	- `MessageController.store` so chama `CreateMessageService` para mensagem interna.
	- mensagens externas passam por `SendWhatsAppMessage` ou `SendWhatsAppMedia`, que atualizam `ticket.lastMessage` e retornam sem persistir a `Message`.
	- a persistencia externa acontece apenas em `handleWhatsappEvents.handleMessage()`.
	- o controller ainda emite `ticket:update` apos o envio externo, mesmo sem `Message` garantida.
	- reproducao local em serie curta em 2026-05-20:
		- cenario A, ticket `109`: 5/5 `POST /messages/109` com `200`, 5/5 `Messages` persistidas e 5/5 `Ticket.lastMessage` atualizados; a automacao so confirmou a renderizacao das 5 mensagens apos recarga.
		- cenario B, ticket `145`: 5/5 `POST /messages/145` com `200`, 5/5 `Messages` persistidas, 5/5 `Ticket.lastMessage` atualizados e 5/5 mensagens visiveis sem `F5`.
	- teste passivo em duas abas em 2026-05-20, ticket `109`:
		- `ABA A` enviou `TESTE_SOCKET_PASSIVO_109_01`.
		- `POST /messages/109` retornou `200`.
		- `ABA A` fez `GET /messages/109?pageNumber=1` apos o envio.
		- a `Message` foi persistida no banco e `Ticket.lastMessage` foi atualizado.
		- `ABA B`, passiva, exibiu a mensagem sem `F5` e sem troca de chat.
		- nao houve `GET /messages/109` capturado na `ABA B`.
		- `Socket.IO` permaneceu ativo via fallback de polling, sem prova de upgrade `WebSocket` bem-sucedido.
	- o resultado acima nao confirmou falha sistemica de persistencia, mas mostrou comportamento intermitente entre envio/persistencia/realtime na UI.
	- leitura consolidada apos a rodada passiva:
		- o Bug 2 nao foi reproduzido como falha de persistencia.
		- o realtime local ficou funcional via polling nesta rodada.
		- a intermitencia anterior fica classificada, por ora, como possivel timing de refresh/renderizacao ou cenario especifico ainda nao reproduzido.
- Risco operacional:
	- cenario silencioso onde o celular recebe a mensagem, a lista lateral muda, mas o historico do ticket fica sem a linha da mensagem.

## Bug 3 - Mensagem chega no WhatsApp mas nao chega no SamaChat

- Prioridade: P1
- Arquivos candidatos:
	- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
	- `backend/src/providers/WhatsApp/Implementations/whaileys.ts`
	- `backend/src/handlers/handleWhatsappEvents.ts`
	- `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`
	- `backend/src/services/TicketServices/FindOrCreateTicketService.ts`
	- `frontend/src/components/MessagesList/index.js`
	- `frontend/src/components/TicketsList/index.js`
	- `frontend/src/services/socket-io.js`
- Hipotese inicial:
	- o problema pode estar em qualquer ponto entre listener do provider, merge/criacao de contato, criacao/reativacao do ticket, persistencia da `Message` ou entrega por socket.
- Evidencia encontrada:
	- `handleMessage()` cria/atualiza contato, localiza/cria ticket, persiste `Message` e atualiza `lastMessage`.
	- `MessagesList` depende de `appMessage` para ver a mensagem sem F5.
	- `TicketsList` depende de `ticket` e `appMessage` para refletir a novidade na lista lateral.
	- existe service worker em producao e cache estatico `samachat-static-v1`.
- Risco operacional:
	- a mensagem existir no provider e/ou no banco, mas a UI nao refletir sem recarga por falha de socket, token expirado, cache antigo ou filtro de visibilidade.

- Causa raiz confirmada em 2026-05-20 para a lista lateral `/tickets`:
	- `CreateMessageService` emitia `appMessage` apenas para rooms de status/notificacao escopadas por `whatsappId` quando o ticket tinha conexao definida.
	- os admins locais entram nas rooms globais `tickets:${status}:all` / `notification:all` quando `user.whatsappId` e `NULL`, entao o inbound persistia no banco sem chegar na lista lateral.
	- na aba `pending`, `TicketsManager` nao passava `showAll` para `TicketsList`; o admin via o card no carregamento HTTP, mas o filtro de socket descartava pendentes sem `userId` nas atualizacoes em tempo real.
- Correcao aplicada em 2026-05-20:
	- `backend/src/services/MessageServices/CreateMessageService.ts` passou a broadcastar `appMessage` para `all + whatsapp:<id>` nas rooms de status/notificacao.
	- `frontend/src/components/TicketsManager/index.js` passou a propagar `showAllTickets` tambem para a lista `pending`.
- Validacao apos correcao:
	- cenario A: ticket `151` (`Mor`) recebeu `TESTE_LISTA_SOCKET_FIX_OPEN_01` com `fromMe = 0`; preview, horario e topo da lista `open` atualizaram sem `F5`.
	- cenario B: ticket `153` (`Papai Rei`) apareceu no topo de `Aguardando` sem `F5` apos inbound real `TESTE_LISTA_SOCKET_FIX__INBOUND_01`, com `status = pending` e `userId = NULL` no momento da observacao.
	- cenario C: ticket `109` continuou recebendo inbound real no chat aberto sem `F5`; a mensagem `Teste` entrou com `fromMe = 0` em `20:35:50`.

## Bug 4 - Criar contato diz que ja existe, mas ninguem encontra

- Prioridade: P2
- Arquivos candidatos:
	- `backend/src/services/ContactServices/CreateContactService.ts`
	- `backend/src/services/ContactServices/ListContactsService.ts`
	- `backend/src/helpers/GetUserScopedWhatsappId.ts`
	- `frontend/src/components/ContactModal/index.js`
	- `frontend/src/pages/Contacts/index.js`
	- `frontend/src/components/NewTicketModal/index.js`
	- `frontend/src/services/findExistingTicketByContact.js`
- Hipotese inicial:
	- o contato ja existe no banco por `number`, mas o operador nao consegue ve-lo porque a listagem esta escopada por `whatsappId` e por existencia de ticket nessa conexao.
- Evidencia encontrada:
	- `CreateContactService` lanca apenas `ERR_DUPLICATED_CONTACT`.
	- a UI traduz o erro como mensagem generica, sem apontar `contactId` ou `ticketId`.
	- `ListContactsService` exige `include Ticket required: true` para usuarios nao admin com `whatsappId` vinculado.
- Risco operacional:
	- usuarios repetem cadastros, perdem tempo tentando localizar o contato e concluem que o sistema "engoliu" o registro.

## Bug 5 - Usuario MAE / visao global de clientes

- Prioridade: P2
- Arquivos candidatos:
	- `backend/src/middleware/checkSectorPermission.ts`
	- `backend/src/services/PermissionServices/GetUserPermissionsService.ts`
	- `backend/src/helpers/GetUserScopedWhatsappId.ts`
	- `backend/src/services/TicketServices/ListTicketsService.ts`
	- `backend/src/services/TicketServices/CheckTicketAccess.ts`
	- `frontend/src/components/TicketsManager/index.js`
- Hipotese inicial:
	- o legado nao tem um perfil intermediario real de supervisor/global; hoje a visao global valida encontrada e apenas a do `admin`.
- Evidencia encontrada:
	- `admin` bypassa permissao de rota e escopo de conexao.
	- `showAllTickets` no frontend so fica ligado para `ADMIN`.
	- nao foi encontrado papel `supervisor` no codigo auditado.
- Risco operacional:
	- demanda de visao global vira bug de operacao porque operadores comuns nao enxergam tickets/contatos fora do proprio ownership ou da propria conexao.

## Bug 6 - Grupos do WhatsApp

- Prioridade: P6
- Arquivos candidatos:
	- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
	- `backend/src/providers/WhatsApp/Implementations/whaileys.ts`
	- `backend/src/handlers/handleWhatsappEvents.ts`
	- `backend/src/models/Contact.ts`
	- `backend/src/models/Ticket.ts`
	- `backend/src/services/TicketServices/FindOrCreateTicketService.ts`
	- `backend/src/services/WbotServices/SendWhatsAppMessage.ts`
- Hipotese inicial:
	- o backend tem suporte parcial a grupos no provider e no modelo, mas o restante do fluxo operacional ainda e fortemente centrado em contato individual e numero.
- Evidencia encontrada:
	- `Contact.isGroup` e `Ticket.isGroup` existem.
	- providers criam `groupContact` e separam participante x grupo.
	- envio usa `@g.us` quando `ticket.isGroup`.
	- fluxo manual de contato/ticket e erros de duplicidade continuam focados em `number`.
- Risco operacional:
	- conversas de grupo podem entrar, mas sem politica clara de permissao e sem UX dedicada, abrindo espaco para confusao entre grupo e membro individual.

## Bug 7 - Mensagens aparecem para usuarios errados

- Prioridade: P1
- Arquivos candidatos:
	- `backend/src/libs/socket.ts`
	- `backend/src/helpers/socketRooms.ts`
	- `backend/src/services/MessageServices/CreateMessageService.ts`
	- `backend/src/services/TicketServices/ListTicketsService.ts`
	- `backend/src/services/TicketServices/CheckTicketAccess.ts`
	- `frontend/src/components/TicketsList/index.js`
	- `frontend/src/components/MessagesList/index.js`
- Hipotese inicial:
	- parte da seguranca esta so no HTTP; no socket, rooms e broadcasts ainda sao escopados por `ticketId` ou `whatsappId`, nao por `userId`.
- Evidencia encontrada:
	- `joinChatBox(ticketId)` nao valida acesso ao ticket.
	- `CreateMessageService` emite `appMessage` para rooms de status/notificacao por `whatsappId`.
	- `TicketsList` depende de filtro no cliente (`ticket.userId === user.id`) para descartar eventos que nao pertencem ao operador.
- Risco operacional:
	- usuario indevido pode receber evento em tempo real e ver ticket reaparecer ou mensagem cair no chat se estiver inscrito em room ampla ou em room de ticket conhecida.

## Bug 8 - Atendimento aguardando nao libera ao aceitar

- Prioridade: P3
- Arquivos candidatos:
	- `frontend/src/components/TicketListItem/index.js`
	- `frontend/src/components/TicketsList/index.js`
	- `frontend/src/components/MessageInput/index.js`
	- `backend/src/controllers/TicketController.ts`
	- `backend/src/services/TicketServices/UpdateTicketService.ts`
- Hipotese inicial:
	- o backend parece preparado para trocar `pending` -> `open` e gravar `userId`, mas o frontend pode mascarar falha ou ficar inconsistente na navegacao/estado local.
- Evidencia encontrada:
	- `UpdateTicketService` atualiza status, `userId`, `pendingSince` e emite `ticket:update`.
	- `TicketListItem.handleAcepptTicket()` faz `api.put()` e, mesmo no caminho de erro, ainda executa `history.push(`/tickets/${id}`)` depois do `catch`.
	- `MessageInput.ensureTicketIsOpen()` tambem depende do mesmo `PUT /tickets/:id` antes de enviar mensagem em ticket pendente.
- Risco operacional:
	- operador acha que aceitou porque foi redirecionado, mas o ticket pode continuar pendente no backend ou nao ter ficado com `userId` correto.

## Bug 9 - Recriar RESOLVIDO mantendo follow-up

- Prioridade: P5
- Arquivos candidatos:
	- `backend/src/models/Ticket.ts`
	- `backend/src/controllers/TicketController.ts`
	- `backend/src/services/TicketServices/UpdateTicketService.ts`
	- `backend/src/services/TicketServices/ListTicketsService.ts`
	- `frontend/src/components/TicketsManager/index.js`
	- `frontend/src/hooks/useTickets/index.js`
- Hipotese inicial:
	- o legado atual nao tem mais status persistido `resolved`; o equivalente funcional virou `closed` com tag `Follow up`.
- Evidencia encontrada:
	- `Ticket.ts` so expõe `pending`, `open`, `closed`.
	- `UpdateTicketService` gerencia `followUp` como tag e preserva o ticket fechado.
	- `ListTicketsService` usa `followUp === "true"` para filtrar tickets `closed` com a tag.
	- `TicketsManager` abre a aba `followUp` em cima de `status="closed"`.
- Risco operacional:
	- o time fala em "RESOLVIDO" como status, mas o banco e a UI operam com `closed` + tag; isso pode quebrar relatorios, filtros e expectativa de negocio se nao for tratado explicitamente.

## Bug 10 - Ticket com nova atividade nao sobe para o topo da lista lateral

- Prioridade: P2
- Arquivos candidatos:
	- `frontend/src/components/TicketsList/index.js`
	- `frontend/src/components/TicketListItem/index.js`
	- `frontend/src/hooks/useTickets/index.js`
	- `backend/src/services/TicketServices/ListTicketsService.ts`
	- `backend/src/services/TicketServices/UpdateTicketService.ts`
- Hipotese inicial:
	- a lista lateral atualiza preview e horario, mas a ordenacao final continua presa a um criterio anterior ao `updatedAt` recente; o candidato principal e o `pendingSince` ter precedencia indevida mesmo em ticket `open`.
- Evidencia encontrada:
	- reproducao local em 2026-05-20:
		- ticket `109` (`Julia lopes Samacon`) recebeu 5 novas mensagens, atualizou `lastMessage` e `updatedAt` ate `2026-05-20 16:29:34`, mas permaneceu abaixo de `Ana Samacon`, `Mateus Samacon`, `Laysa` e `Augusto Solidade` na lista lateral.
		- ticket `145` (`Mateus Samacon`) recebeu 5 novas mensagens, atualizou `lastMessage` e `updatedAt` ate `2026-05-20 16:34:30`, mas continuou abaixo de `Ana Samacon` na lista lateral.
	- a UI confirmou preview novo e horario novo nos dois tickets, sem mover nenhum deles para a primeira linha.
	- `frontend/src/components/TicketsList/index.js` usa `sortTicketsByRecentActivity()` e prioriza `pendingSince` antes de `updatedAt` para todos os tickets.
	- leitura no banco no mesmo momento mostrou:
		- ticket `146`: `pendingSince = 2026-05-19 12:36:47`, `updatedAt = 2026-05-20 11:36:51`
		- ticket `145`: `pendingSince = 2026-05-19 12:34:02`, `updatedAt = 2026-05-20 16:34:30`
		- ticket `142`: `pendingSince = 2026-05-19 11:33:45`, `updatedAt = 2026-05-20 09:57:15`
		- ticket `140`: `pendingSince = 2026-05-19 09:01:32`, `updatedAt = 2026-05-20 09:49:18`
		- ticket `109`: `pendingSince = 2026-05-06 21:19:41`, `updatedAt = 2026-05-20 16:29:34`
	- a ordem observada em tela bateu mais com `pendingSince` do que com `updatedAt`, confirmando a suspeita local.
	- pos-correcao local em 2026-05-20:
		- envio `TESTE_BUG10_FIX_109_BUILD` no ticket `109`: `POST /messages/109` com `200`, `Message` criada, `Ticket.lastMessage` atualizado e ticket movido para a primeira linha da lista lateral.
		- envio `TESTE_BUG10_FIX_145_BUILD` no ticket `145`: `POST /messages/145` com `200`, `Message` criada, `Ticket.lastMessage` atualizado e ticket movido para a primeira linha da lista lateral.
		- a aba `Aguardando` continuou com contador `2` e itens pendentes visiveis.
- Causa raiz confirmada:
	- `pendingSince` era avaliado antes de `updatedAt` em `frontend/src/components/TicketsList/index.js`, entao um ticket aberto com nova atividade podia continuar abaixo de outro ticket menos recente se o outro tivesse `pendingSince` maior.
- Arquivo alterado na correcao:
	- `frontend/src/components/TicketsList/index.js`
- Regra nova de ordenacao:
	- `updatedAt || createdAt` passou a ser o criterio principal de atividade.
	- `pendingSince` permanece apenas como desempate.
- Risco operacional:
	- operador perde a conversa mais recente no meio da lista, responde fora de ordem, depende de busca manual ou `F5` e quebra a expectativa operacional estilo WhatsApp de ver o chat ativo no topo.

## Suspeitas principais de causa raiz por prioridade

- P1
	- persistencia de mensagem externa depende do eco do provider, nao do controller.
	- realtime de ticket/chat nao e escopado por `userId` no backend socket.
- P2
	- visibilidade de contato depende de ticket e `whatsappId`, o que mascara registros existentes.
	- inexistencia de um papel global intermediario alem de `admin`.
	- ordenacao da lista lateral prioriza `pendingSince` antes de `updatedAt`, o que pode impedir que tickets abertos com nova atividade subam para o topo.
- P3
	- fluxo de aceitar ticket navega mesmo em falha e pode mascarar erro operacional.
- P4
	- normalizacao de numero envolve varios formatos (`number`, `lid`, `group`, `55+DDD`) e ainda pode divergir entre entrada manual e entrada automatica.
- P5
	- divergencia semantica entre "resolved" esperado pelo negocio e `closed` + `followUp` implementado.
- P6
	- grupos possuem suporte parcial, sem cerca clara de permissao/UX.
