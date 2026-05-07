# Release Notes

## 2026-05-06

### legacy-prod

- Dashboard: o card "Evolucao do volume" para o periodo "Hoje" agora considera as 24 horas do dia. Tickets criados apos 19:00 deixam de sumir do grafico.
- Tickets: o controle "Todos" foi alinhado a mesma altura visual de "Tags" e "Setores" nos layouts mobile e desktop.
- Escopo desta promocao: somente `backend/src/services/DashboardServices/ShowDashboardService.ts`, `backend/src/services/DashboardServices/__tests__/ShowDashboardService.spec.ts` e `frontend/src/components/TicketsManager/index.js`.
- Fora de escopo nesta versao: usuarios, conexoes, chats, fluxo de mensagens e demais telas operacionais.
- Validacao local antes da promocao: teste focado de dashboard aprovado, endpoint local `/dashboard` com buckets reais em `20:00`, `21:00` e `22:00`, grafico renderizado no localhost e filtros `Todos`, `Tags` e `Setores` conferidos visualmente no localhost.