# Release Notes

## 2026-05-07

### legacy-prod

- Chats/Aguardando: o card do ticket foi reorganizado para que a conexao ou responsavel nao fique mais escondido atras do botao `Aceitar`.
- Chats/Aguardando: a lista agora exibe a data e hora de entrada no SamaChat usando `pendingSince`, em vez de depender apenas do `updatedAt` do ticket.
- Chats/Atendendo: os cards foram reorganizados para manter nome no topo, mensagem no corpo e metadados no rodape; tags deixam de quebrar o layout e passam a aparecer alinhadas a direita na mesma linha de data/hora e responsavel.
- Contatos: a foto do contato deixa de ser apagada quando o provedor nao retorna avatar no evento e, quando faltar foto mas existir numero valido, o backend tenta preencher `profilePicUrl` automaticamente.
- Backend: tickets criados, reabertos ou devolvidos para `pending` passam a registrar `pendingSince`, e a ordenacao da aba `Aguardando` passa a respeitar esse carimbo.
- Escopo desta promocao: `backend/src/database/migrations/20260507103000-add-pending-since-to-tickets.ts`, `backend/src/models/Ticket.ts`, `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`, `backend/src/services/TicketServices/CreateTicketService.ts`, `backend/src/services/TicketServices/FindOrCreateTicketService.ts`, `backend/src/services/TicketServices/ListTicketsService.ts`, `backend/src/services/TicketServices/UpdateTicketService.ts` e `frontend/src/components/TicketListItem/index.js`.
- Validacao local antes da promocao: `npm run build` aprovado em `backend` e `frontend`; `docker compose -f docker-compose.yaml up -d --build backend frontend` com migracao `20260507103000-add-pending-since-to-tickets` aplicada; localhost `http://localhost:3000` validado na aba `Aguardando` com 31 tickets reais, timestamp `07/05 09:56` renderizado a partir de `pendingSince`, avatar real carregado no card de `Augusto Solidade` e checagem DOM com `overlaps: false` entre a etiqueta lateral e o botao `Aceitar`; localhost validado tambem na aba `Atendendo` com a tag `teste de tag` renderizada no rodape, alinhada a direita da linha de data/hora e responsavel.

- Tickets: o usuario com conexao padrao propria, como o CS, nao recebe mais acesso indireto a tickets de outros usuarios so por causa dessa configuracao. A visibilidade volta a respeitar apenas tickets proprios ou pendentes da fila do usuario.
- Backend: acessos por `ticketId` agora validam permissao antes de abrir ticket, listar mensagens, enviar resposta, atualizar, excluir ou marcar como nao lido.
- Frontend: a lista em tempo real por socket deixou de reinserir tickets sem responsavel fora da aba `pending`, evitando que conversas alheias reaparecam para usuarios nao admin.
- Escopo desta promocao: `backend/src/controllers/MessageController.ts`, `backend/src/controllers/TicketController.ts`, `backend/src/services/MessageServices/ListMessagesService.ts`, `backend/src/services/TicketServices/CheckTicketAccess.ts`, `backend/src/services/TicketServices/DeleteTicketService.ts`, `backend/src/services/TicketServices/ShowTicketService.ts`, `backend/src/services/TicketServices/UpdateTicketService.ts`, `backend/src/services/TicketServices/__tests__/ShowTicketService.spec.ts` e `frontend/src/components/TicketsList/index.js`.
- Validacao local antes da promocao: teste focado `ShowTicketService.spec.ts` aprovado no backend e checagem de erros sem diagnosticos nos arquivos alterados.

## 2026-05-06

### legacy-prod

- Dashboard: o card "Evolucao do volume" para o periodo "Hoje" agora considera as 24 horas do dia. Tickets criados apos 19:00 deixam de sumir do grafico.
- Tickets: o controle "Todos" foi alinhado a mesma altura visual de "Tags" e "Setores" nos layouts mobile e desktop.
- Escopo desta promocao: somente `backend/src/services/DashboardServices/ShowDashboardService.ts`, `backend/src/services/DashboardServices/__tests__/ShowDashboardService.spec.ts` e `frontend/src/components/TicketsManager/index.js`.
- Fora de escopo nesta versao: usuarios, conexoes, chats, fluxo de mensagens e demais telas operacionais.
- Validacao local antes da promocao: teste focado de dashboard aprovado, endpoint local `/dashboard` com buckets reais em `20:00`, `21:00` e `22:00`, grafico renderizado no localhost e filtros `Todos`, `Tags` e `Setores` conferidos visualmente no localhost.