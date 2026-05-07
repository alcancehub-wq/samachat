# Release Notes

## 2026-05-07

### legacy-prod

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