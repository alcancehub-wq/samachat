# Auditoria Arquitetura Operacional

Data da auditoria: 2026-05-20
Escopo: stack legada em `backend/src` e `frontend/src`
Branch de auditoria: `fix/samachat-estabilidade-operacional`
Modo: somente leitura no codigo funcional; este documento resume o mapa real encontrado antes de qualquer correcao.

## Tabelas e modelos centrais

- `backend/src/models/Contact.ts`
	- `number` e `lid` sao unicos.
	- `isGroup` diferencia contato individual de grupo.
	- `tickets` liga o contato aos atendimentos.
- `backend/src/models/Ticket.ts`
	- status real encontrado: `pending`, `open`, `closed`.
	- campos operacionais criticos: `userId`, `queueId`, `whatsappId`, `unreadMessages`, `lastMessage`, `pendingSince`, `isGroup`.
- `backend/src/models/Message.ts`
	- persiste `id`, `ticketId`, `contactId`, `fromMe`, `body`, `mediaUrl`, `mediaType`, `ack`, `isInternal`, `quotedMsgId`.
- `backend/src/models/User.ts`
	- `profile` existe, mas o tratamento especial encontrado no legado e apenas para `admin`.
	- `whatsappId` vincula o operador a uma conexao padrao.
- `backend/src/models/Queue.ts` + `QueuePermission`
	- permissoes efetivas por fila sao resolvidas por `GetUserPermissionsService`.

## Mapa do fluxo de mensagem enviada

### Frontend

- Disparo principal: `frontend/src/components/MessageInput/index.js`
	- texto: `handleSendMessage()` -> `api.post(`/messages/${ticketId}`, message)`.
	- midia/audio: `uploadMediaFiles()` -> `api.post(`/messages/${ticketId}`, formData)`.
	- ticket pendente: `ensureTicketIsOpen()` tenta `api.put(`/tickets/${ticketId}`, { status: "open", userId: user.id })` antes do envio.

### API / controller

- Rota: `backend/src/routes/messageRoutes.ts`
	- `POST /messages/:ticketId` -> `MessageController.store`.
- Controller: `backend/src/controllers/MessageController.ts`
	- carrega o ticket com `ShowTicketService(ticketId, accessData)`.
	- para mensagem interna, persiste direto via `CreateMessageService`.
	- para mensagem externa, nao persiste direto no controller:
		- texto -> `SendWhatsAppMessage({ body, ticket, quotedMsg })`
		- midia -> `SendWhatsAppMedia({ media, ticket })`
	- apos o envio externo, o controller chama `emitTicketUpdate(ticket)` e responde sem retornar a `Message` persistida.

### Service de envio

- Texto: `backend/src/services/WbotServices/SendWhatsAppMessage.ts`
	- garante sessao e readiness do WhatsApp.
	- resolve variaveis da mensagem com `ResolveMessageVariablesService`.
	- monta `chatId` com prioridade para `lid`, depois numero, e usa `@g.us` quando `ticket.isGroup`.
	- tenta normalizar numero via `whatsappProvider.checkNumber()` apenas como fallback.
	- atualiza `ticket.lastMessage` e, quando necessario, corrige `ticket.contact.number` com o numero normalizado.
- Midia: `backend/src/services/WbotServices/SendWhatsAppMedia.ts`
	- segue o mesmo padrao de sessao/chatId.
	- normaliza audio para envio por WhatsApp quando aplicavel.
	- atualiza `ticket.lastMessage` e pode corrigir `ticket.contact.number`.

### Persistencia em Message

- Persistencia direta so existe para mensagem interna em `MessageController.store`.
- Para mensagem externa, a persistencia depende do eco do provider:
	- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
		- `wbot.on("message_create", ...)` -> `handleMessage(...)`
		- `wbot.on("media_uploaded", ...)` -> `handleMessage(...)`
	- `backend/src/providers/WhatsApp/Implementations/whaileys.ts`
		- `wbot.ev.on("messages.upsert", ...)` -> `handleMessage(...)`
- O ponto unico de persistencia operacional encontrado para mensagens externas e `backend/src/handlers/handleWhatsappEvents.ts`:
	- `handleMessage()` -> `CreateMessageService({ messageData })`.

### Atualizacao de Ticket / lastMessage

- `SendWhatsAppMessage.ts` e `SendWhatsAppMedia.ts` atualizam `ticket.lastMessage` logo apos o envio ao provedor.
- `handleWhatsappEvents.ts` tambem atualiza `ticket.lastMessage` quando trata mensagens recebidas ou o eco das enviadas.

### Emissao socket

- `CreateMessageService.ts`
	- emite `appMessage` para:
		- room do ticket (`ticket.id.toString()`)
		- room de status (`tickets:${status}:whatsapp:${whatsappId}` ou `tickets:${status}:all`)
		- room de notificacao (`notification:whatsapp:${whatsappId}` ou `notification:all`)
- `MessageController.ts`
	- apos envio externo, emite `ticket` com `action: "update"` via `emitTicketUpdate(ticket)`.
- `handleMessageAck()` atualiza `ack` e emite `appMessage` com `action: "update"` para a room do ticket.

### Conclusao operacional do fluxo enviado

- O envio ao WhatsApp e a persistencia em `Message` nao acontecem na mesma transacao logica.
- Para mensagem externa, o controller confirma o envio e atualiza o ticket antes da persistencia da `Message`.
- Se o provider nao devolver `message_create`, `media_uploaded` ou `messages.upsert`, o celular pode receber a mensagem e o SamaChat ficar sem historico persistido.

## Mapa do fluxo de mensagem recebida

### Listener do provider

- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
	- `syncUnreadMessages()` reprocessa chats com `unreadCount > 0` apos sincronizacao.
	- `message_create` e `media_uploaded` tambem passam por `handleMessage(...)`.
- `backend/src/providers/WhatsApp/Implementations/whaileys.ts`
	- `messages.upsert` e o ponto de entrada principal.

### Identificacao de remoteJid / from / grupo

- `wwebjs.ts`
	- `getMessageData()` usa `msg.getChat()` e `msg.getContact()`.
	- em grupo, monta `groupContact` com o `groupChatId` e usa o participante como contato da mensagem.
- `whaileys.ts`
	- `getMessageData()` parte de `msg.key.remoteJid`.
	- se `isGroup(remoteJid)` e a mensagem nao e `fromMe`, troca o contato ativo para `msg.key.participant` e guarda o grupo em `groupContact`.

### Criacao / localizacao de Contact

- `backend/src/handlers/handleWhatsappEvents.ts`
	- `CreateOrUpdateContactService` e chamado sempre para o contato principal.
	- quando existe `groupContact`, o grupo tambem passa por `CreateOrUpdateContactService`.
- `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`
	- limpa numero para digitos, aceita `lid`, tenta localizar por `number`, `lid` e legados derivados de `lid`.
	- quando acha conflito entre `number` e `lid`, faz merge e reatribui `Ticket.contactId`.

### Criacao / localizacao de Ticket

- `backend/src/handlers/handleWhatsappEvents.ts`
	- usa `FindOrCreateTicketService(contact, whatsappId, unreadMessages, groupContact)`.
- `backend/src/services/TicketServices/FindOrCreateTicketService.ts`
	- busca primeiro ticket `open/pending` por `contactId + whatsappId`.
	- para grupo, pode reciclar o ultimo ticket do grupo e recolocar em `pending`.
	- para contato individual, faz fallback para ticket recente da mesma conexao nas ultimas 2 horas e recoloca em `pending`.
	- se nao achar, cria ticket novo em `pending` com `pendingSince`.

### Persistencia da Message

- `handleWhatsappEvents.ts`
	- monta `messageData` com `id`, `ticketId`, `contactId`, `body`, `fromMe`, `read`, `mediaType`, `quotedMsgId`, `ack`.
	- salva arquivo de midia quando houver `mediaPayload`.
	- chama `CreateMessageService({ messageData })`.

### Emissao socket e atualizacao sem F5

- Backend:
	- `CreateMessageService` emite `appMessage` para room do ticket + rooms de status/notificacao.
	- `SetTicketMessagesAsUnread` e `SetTicketMessagesAsRead` emitem `ticket` para atualizar contadores.
- Frontend:
	- `frontend/src/components/MessagesList/index.js`
		- faz `GET /messages/:ticketId`.
		- abre socket e emite `joinChatBox(ticketId)`.
		- escuta `appMessage` para `ADD_MESSAGE` e `UPDATE_MESSAGE`.
	- `frontend/src/components/TicketsList/index.js`
		- abre socket e entra em `joinTickets({ status, whatsappId })` ou `joinNotification({ whatsappId })`.
		- escuta `ticket`, `appMessage` e `contact` para atualizar lista lateral e badges.

### Conclusao operacional do fluxo recebido

- A mensagem recebida depende de tres saltos: provider -> `handleMessage` -> `CreateMessageService` -> listeners do frontend.
- Se o socket falhar, o historico pode existir no banco e ainda assim a UI aparentar precisar de F5.

## Mapa de Contact / Ticket / Message / User / Queue

### Normalizacao e DDI/DDD

- `backend/src/controllers/ContactController.ts`
	- remove tudo que nao e digito antes de validar e salvar contato manual.
- `backend/src/helpers/BuildContactNumberCandidates.ts`
	- para sessao brasileira, tenta prefixar `55` quando o numero parece local com DDD.
- `backend/src/helpers/NormalizeValidatedContactNumber.ts`
	- normaliza o retorno do provider para digitos consistentes.
- `backend/src/providers/WhatsApp/Implementations/wwebjs.ts`
	- `checkNumber()` usa `BuildContactNumberCandidates()` e `NormalizeValidatedContactNumber()`.

### Duplicidade e localizacao de contato

- `backend/src/models/Contact.ts`
	- `number` e `lid` sao unicos.
- `backend/src/services/ContactServices/CreateContactService.ts`
	- ao encontrar `number` existente, lanca apenas `ERR_DUPLICATED_CONTACT`.
	- nao devolve `contactId`, `ticketId`, `userId` ou contexto de localizacao.
- `frontend/src/components/ContactModal/index.js`
	- apenas exibe o erro via `toastError(err)`.
- `frontend/src/translate/languages/pt.js`
	- a mensagem encontrada para `ERR_DUPLICATED_CONTACT` e generica: "Ja existe um contato com este numero.".

### Busca e visibilidade de contatos

- `backend/src/services/ContactServices/ListContactsService.ts`
	- para nao admin, usa `GetUserScopedWhatsappId(userId, profile)`.
	- quando existe `whatsappId` escopado, a listagem exige `include Ticket` com `required: true` e `where: { whatsappId: scopedWhatsappId }`.
	- efeito pratico: um contato pode existir no banco, mas ficar invisivel para operadores de outra conexao ou sem ticket nessa conexao.

### Criacao manual de ticket

- `frontend/src/components/NewTicketModal/index.js` e `frontend/src/pages/Contacts/index.js`
	- tentam achar ticket existente via `findExistingTicketByContact()` antes de criar novo.
- `frontend/src/services/findExistingTicketByContact.js`
	- pesquisa tickets `open` e `pending` por `searchParam` e tenta casar por `contactId` ou `contact.number`.
- `backend/src/services/TicketServices/CreateTicketService.ts`
	- antes de criar, faz busca global de ticket `open/pending` apenas por `contactId`.
	- depois faz validacao mais especifica por `contactId + whatsappId` com `CheckContactOpenTickets()`.
	- usa `GetDefaultWhatsApp(userId)` como conexao padrao do ticket manual.

### Status reais encontrados

- Status persistidos do ticket: `pending`, `open`, `closed`.
- Nao foi encontrado um status persistido separado chamado `resolved`.
- O conceito de follow-up existe hoje como tag (`FOLLOW_UP_TAG_NAME`) aplicada em tickets `closed`.

## Mapa de permissoes, owner, fila e usuario

### Gate HTTP e permissoes por fila

- `backend/src/middleware/checkSectorPermission.ts`
	- `admin` bypassa a checagem.
	- demais usuarios dependem de `GetUserPermissionsService(req.user.id)`.
- `backend/src/services/PermissionServices/GetUserPermissionsService.ts`
	- agrega permissoes vindas das filas do usuario (`QueuePermission`).

### Escopo por conexao e proprietario

- `backend/src/helpers/GetUserScopedWhatsappId.ts`
	- para nao admin, retorna `user.whatsappId` ou `user.whatsapp.id`.
- `backend/src/services/TicketServices/CheckTicketAccess.ts`
	- `admin` pode tudo.
	- nao admin so passa se `ticket.userId === userId` e, quando o usuario tem `whatsappId`, o ticket usa a mesma conexao.
	- nao ha regra especial de supervisor; nenhum papel `supervisor` foi encontrado no legado auditado.
- `backend/src/services/TicketServices/ListTicketsService.ts`
	- para nao admin, a listagem parte de `assignedVisibilityScope = { userId }`.
	- `showAll` so vale para admin.
	- filas entram como visibilidade adicional, mas nao substituem o ownership por `userId`.

### Reforco no frontend

- `frontend/src/components/TicketsManager/index.js`
	- `showAllTickets` so e habilitado quando `user.profile === "ADMIN"`.
- `frontend/src/components/TicketsList/index.js`
	- o filtro de socket para a lista usa `canAccessTicketInCurrentList(ticket)`.
	- para nao admin, so mantem ticket cujo `ticket.userId === user.id`.

### Ponto de risco encontrado no realtime

- `backend/src/libs/socket.ts`
	- `joinChatBox(ticketId)` apenas faz `socket.join(ticketId)`.
	- nao existe validacao de acesso ao ticket no join da room de chat.
- `CreateMessageService.ts`
	- emite `appMessage` tambem para rooms de status/notificacao escopadas por `status + whatsappId`, nao por `userId`.
- Conclusao:
	- a protecao forte esta no HTTP (`ShowTicketService` + `CheckTicketAccess`).
	- no socket, a separacao e por room de ticket ou por conexao/status, nao por usuario dono do ticket.

## Mapa de socket / realtime / cache

### Backend rooms e emits

- `backend/src/helpers/socketRooms.ts`
	- tickets: `tickets:${status}:whatsapp:${whatsappId}` ou `tickets:${status}:all`
	- notificacao: `notification:whatsapp:${whatsappId}` ou `notification:all`
	- contatos: `contact:whatsapp:${whatsappId}` ou `contact:all`
- `backend/src/libs/socket.ts`
	- eventos de join: `joinChatBox`, `joinNotification`, `joinTickets`, `joinContacts`.
- Emissores principais:
	- `CreateMessageService.ts` -> `appMessage`
	- `MessageController.ts` -> `ticket:update` apos envio externo
	- `UpdateTicketService.ts` -> `ticket:update` e `ticket:delete` quando muda status/owner
	- `SetTicketMessagesAsRead.ts` -> `ticket:updateUnread`
	- `SetTicketMessagesAsUnread.ts` -> `ticket:update`
	- `EmitContactEvent.ts` -> `contact:create|update|delete`

### Frontend listeners

- `frontend/src/components/MessagesList/index.js`
	- `socket.emit("joinChatBox", ticketId)`
	- `socket.on("appMessage", ...)`
- `frontend/src/components/TicketsList/index.js`
	- `socket.emit("joinTickets", { status, whatsappId })` ou `joinNotification`.
	- `socket.on("ticket", ...)`
	- `socket.on("appMessage", ...)`
	- `socket.on("contact", ...)`
- `frontend/src/services/socket-io.js`
	- handshake com `transports: ["polling", "websocket"]`.
	- refresh de token em `connect_error` via `/auth/refresh_token`.
- `frontend/src/hooks/useAuth.js/index.js`
	- refresh silencioso em foco/visibilidade e a cada 10 minutos.

### Ordenacao da lista lateral

- `frontend/src/components/TicketsList/index.js`
	- `sortTicketsByRecentActivity()` ordena por:
		- `updatedAt || createdAt` desc
		- depois `pendingSince` desc
		- por fim `id` desc
	- `UPDATE_TICKET` e `UPDATE_TICKET_UNREAD_MESSAGES` passam por `upsertTicketInState()` e reaplicam esse sort local.
- Implicacao operacional confirmada em reproducao local:
	- ticket `109` atualizou `lastMessage` para `TESTE_BUG2_SERIE_A_05` e `updatedAt` para `2026-05-20 16:29:34`, mas continuou abaixo de tickets com `updatedAt` mais antigo.
	- ticket `145` atualizou `lastMessage` para `TESTE_BUG2_SERIE_B_05` e `updatedAt` para `2026-05-20 16:34:30`, mas continuou abaixo de `Ana Samacon` na lista lateral.
	- a consulta no banco mostrou que a ordem em tela acompanhava melhor `pendingSince` do que `updatedAt`, o que explica o BUG 10 de ordenacao.
	- correcao aplicada na rodada do BUG 10: inverter a prioridade do sort para promover tickets com `updatedAt` mais recente, mantendo `pendingSince` apenas como desempate.
	- validacao pos-fix:
		- ticket `109` subiu para o topo apos `TESTE_BUG10_FIX_109_BUILD`.
		- ticket `145` subiu para o topo apos `TESTE_BUG10_FIX_145_BUILD`.
		- a aba `Aguardando` permaneceu funcional com contador `2` e itens pendentes visiveis.

### Reproducao local do Bug 2 em serie curta

- Data: 2026-05-20
- Cenario A: ticket `109`
	- 5/5 `POST /messages/109` com `200`
	- 5/5 `Messages` persistidas no banco
	- 5/5 `Ticket.lastMessage` e `Ticket.updatedAt` atualizados
	- a automacao so confirmou as 5 mensagens apos recarga da tela
- Cenario B: ticket `145`
	- 5/5 `POST /messages/145` com `200`
	- 5/5 `Messages` persistidas no banco
	- 5/5 mensagens visiveis sem `F5` e tambem apos recarga
- Leitura operacional atual:
	- a serie curta nao reproduziu perda de persistencia no banco.
	- houve indicio de comportamento intermitente no eixo realtime/UI no cenario A.
	- o problema de ordenacao da lista lateral foi reproduzido nos dois cenarios.

### Teste passivo em duas abas no ticket 109

- Data: 2026-05-20
- Escopo: duas abas simultaneas no ticket `109`, com `ABA A` ativa para envio e `ABA B` passiva apenas observando.
- Evidencia registrada:
	- `ABA A` enviou `TESTE_SOCKET_PASSIVO_109_01`.
	- `POST /messages/109` retornou `200`.
	- `ABA A` fez `GET /messages/109?pageNumber=1` apos o envio.
	- a `Message` foi persistida no banco e `Ticket.lastMessage` foi atualizado.
	- `ABA B`, passiva, exibiu a mensagem sem `F5` e sem troca de chat.
	- nao houve `GET /messages/109` capturado na `ABA B` durante a janela instrumentada.
	- o `Socket.IO` permaneceu ativo via fallback de polling.
	- nao houve prova de upgrade `WebSocket` bem-sucedido nesta rodada.
- Leitura operacional consolidada:
	- o realtime local ficou funcional via polling nesta rodada.
	- o Bug 2 nao foi reproduzido como falha de persistencia.
	- a intermitencia anterior fica classificada, por ora, como possivel timing de refresh/renderizacao ou cenario especifico ainda nao reproduzido.

### Cache / PWA / build antigo

- `frontend/src/index.js`
	- registra `navigator.serviceWorker.register("/service-worker.js")` em producao.
- `frontend/public/service-worker.js`
	- cache estatico com nome fixo `samachat-static-v1`.
	- faz cache de scripts, styles, images, fonts e `manifest`.
	- nao usa versionamento dinamico do cache por build hash.
- Risco observado:
	- mesmo com bundle novo no deploy, o cache estatico pode segurar script antigo ate novo ciclo de ativacao/limpeza.

## Suspeitas principais antes de qualquer correcao

- Mensagem enviada e registrada no celular mas nao no SamaChat:
	- o envio externo nao persiste no controller; depende do eco do provider para chamar `handleMessage()`.
- Mensagem recebida chega no WhatsApp mas nao no SamaChat:
	- pode falhar no listener do provider, na criacao/merge de contato, na atribuicao do ticket, ou no socket do frontend.
- Ticket com nova atividade nao sobe para o topo:
	- o frontend reaplica sort com prioridade em `pendingSince`, o que pode manter tickets abertos atras de itens menos recentes por `updatedAt`.
- Contato "ja existe" mas ninguem encontra:
	- duplicidade e validada por `number`, mas a localizacao do contato na UI depende de ticket e `whatsappId` escopado.
- Mensagem aparece para usuario errado:
	- socket rooms sao por `ticketId` ou `status + whatsappId`, nao por `userId`, e `joinChatBox` nao valida acesso.
- Aceitar pendente nao libera:
	- o backend atualiza status/userId e emite socket, mas o frontend `TicketListItem` navega para o ticket mesmo se o `api.put()` falhar.
- "Resolvido" com follow-up:
	- nao existe status persistido `resolved`; hoje o comportamento equivalente e `closed` + tag `Follow up`.
