# Bugs Operacionais SamaChat

Data da auditoria: 2026-05-20
Escopo: legado `backend/src` + `frontend/src`
Objetivo: registrar os 9 bugs reportados, os arquivos candidatos, a hipotese inicial, a evidencia ja encontrada, o risco operacional e a prioridade antes de qualquer correcao.

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

## Suspeitas principais de causa raiz por prioridade

- P1
	- persistencia de mensagem externa depende do eco do provider, nao do controller.
	- realtime de ticket/chat nao e escopado por `userId` no backend socket.
- P2
	- visibilidade de contato depende de ticket e `whatsappId`, o que mascara registros existentes.
	- inexistencia de um papel global intermediario alem de `admin`.
- P3
	- fluxo de aceitar ticket navega mesmo em falha e pode mascarar erro operacional.
- P4
	- normalizacao de numero envolve varios formatos (`number`, `lid`, `group`, `55+DDD`) e ainda pode divergir entre entrada manual e entrada automatica.
- P5
	- divergencia semantica entre "resolved" esperado pelo negocio e `closed` + `followUp` implementado.
- P6
	- grupos possuem suporte parcial, sem cerca clara de permissao/UX.
