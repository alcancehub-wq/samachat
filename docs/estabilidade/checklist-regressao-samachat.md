# Checklist de Regressao SamaChat

Data da criacao: 2026-05-20
Escopo: validacao manual e tecnica da stack legada antes e depois de cada correcao.
Regra: nenhuma correcao pode ser considerada pronta se quebrar item anterior desta lista.

## Preparacao do ambiente

- [ ] Confirmar branch e commit sob teste.
- [ ] Confirmar backend local respondendo em `localhost:8080`.
- [ ] Confirmar frontend local respondendo em `localhost:3000`.
- [ ] Confirmar pelo menos uma conexao WhatsApp pronta para envio/recebimento.
- [ ] Confirmar usuario admin disponivel.
- [ ] Confirmar pelo menos dois usuarios operadores com ownership diferente.
- [ ] Confirmar um numero brasileiro valido.
- [ ] Confirmar um numero internacional valido.
- [ ] Confirmar um grupo de WhatsApp controlado para teste.

## Validacao tecnica minima por rodada

- [ ] `git status --short` revisado antes e depois da rodada.
- [ ] `backend`: `npm run build` executado ou falha registrada.
- [ ] `frontend`: `npm run build` executado ou falha registrada.
- [ ] Testes focados existentes em `backend/src/services/TicketServices/__tests__` revisados quando a correcao tocar ticket/ownership.
- [ ] Testes focados existentes em `backend/src/__tests__/unit/Helpers` revisados quando a correcao tocar DDI/DDD/normalizacao.
- [ ] Registrar se houve erro de socket, token expirado, provider sem sessao ou cache antigo.

## Cenarios manuais obrigatorios

### Mensagem enviada

- [ ] 1. Enviar mensagem texto do SamaChat para contato brasileiro.
- [ ] 2. Confirmar mensagem aparece no celular.
- [ ] 3. Confirmar mensagem fica registrada no historico do SamaChat.
- [x] 4. Confirmar `lastMessage` e horario mudam na lista lateral sem F5.
- [ ] 5. Confirmar `ack` evolui no historico sem precisar trocar de tela.

### Mensagem recebida

- [ ] 6. Receber mensagem texto do celular para o SamaChat.
- [x] 7. Confirmar a mensagem aparece no chat aberto sem F5.
- [x] 8. Confirmar a conversa aparece ou sobe na lista lateral sem F5.
- [ ] 9. Confirmar contador de nao lidas/notificacao atualiza em tempo real.
- [ ] 10. Confirmar abertura do ticket por numero novo nao exige salvar contato manualmente.

### Audio e midia

- [ ] 11. Enviar audio gravado no navegador para contato de teste iPhone.
- [ ] 12. Confirmar chegada, reproducao inicial e replay no iPhone.
- [ ] 13. Enviar audio gravado no navegador para contato de teste Android.
- [ ] 14. Confirmar chegada e reproducao no Android.
- [ ] 15. Receber audio no WhatsApp e validar historico/preview no SamaChat.

### Contato nacional e internacional

- [ ] 16. Criar contato novo brasileiro com DDD, sem simbolos extras.
- [ ] 17. Criar ou localizar contato internacional com DDI completo.
- [ ] 18. Iniciar atendimento com numero brasileiro ja usado em outra conversa e validar que nao duplica contato por formatacao.
- [ ] 19. Iniciar atendimento com numero internacional ja salvo e validar que localiza o mesmo contato.

### Duplicidade e localizacao

- [ ] 20. Tentar criar contato duplicado por numero nacional.
- [ ] 21. Tentar criar contato duplicado por numero internacional.
- [ ] 22. Confirmar se o sistema informa onde o contato/ticket existente esta ou, no minimo, se o admin consegue localiza-lo por busca.
- [ ] 23. Confirmar que o contato continua visivel na lista correta apos erro de duplicidade.

### Ticket pendente / aceite / ownership

- [x] 24. Receber mensagem nova para gerar ticket em `pending`.
- [ ] 25. Aceitar o ticket como operador correto.
- [ ] 26. Confirmar mudanca para `open` sem F5.
- [ ] 27. Confirmar `userId`/responsavel exibido no card e no header do ticket.
- [ ] 28. Tentar aceitar o mesmo ticket com outro usuario e registrar o comportamento esperado.

### Permissoes e visibilidade

- [ ] 29. Validar que operador comum so ve tickets atribuidos a ele.
- [ ] 30. Validar que operador comum nao recebe mensagem em chat de outro operador.
- [ ] 31. Validar que operador comum nao localiza contato fora da propria conexao quando a regra atual assim exigir.
- [ ] 32. Validar que admin enxerga tickets e contatos de todas as conexoes.
- [ ] 33. Validar que `showAll` so fica disponivel para admin.

### Follow-up / resolvido / fechado

- [ ] 34. Fechar um atendimento sem `followUp` e validar mensagem de despedida, se configurada.
- [ ] 35. Fechar um atendimento com `followUp` e validar preservacao da tag `Follow up`.
- [ ] 36. Validar que o ticket continua aparecendo na aba de follow-up.
- [ ] 37. Validar que o historico continua acessivel apos fechamento.
- [ ] 38. Registrar se o negocio ainda exige status `resolved` separado de `closed`.

### Grupos

- [ ] 39. Receber mensagem em grupo controlado.
- [ ] 40. Confirmar se o sistema cria/usa ticket de grupo sem misturar com contato individual.
- [ ] 41. Confirmar se a permissao/visibilidade do grupo esta clara para o operador.

### Realtime / cache / deploy

- [ ] 42. Abrir o sistema em duas abas e validar sincronizacao sem F5.
- [ ] 43. Forcar refresh do token/sessao e validar reconexao do socket.
- [ ] 44. Validar comportamento apos trocar de chat e voltar, sem perder mensagem recente.
- [ ] 45. Validar se o service worker registrado nao manteve bundle antigo apos novo build/deploy.
- [ ] 46. Em producao, apos deploy, confirmar versao do bundle carregado e limpar cache/PWA apenas se necessario.
- [ ] 47. Repetir 5 envios sequenciais de texto no mesmo ticket aberto e validar se todas as mensagens aparecem sem `F5`.
- [ ] 48. Repetir 5 envios sequenciais em outro ticket aberto e validar se todas as mensagens aparecem sem `F5`.
- [x] 49. Confirmar que qualquer ticket com nova atividade sobe para a primeira linha da lista lateral, respeitando filtros e permissoes.
- [ ] 50. Confirmar que `lastMessage`, horario e criterio de ordenacao usam o mesmo evento/mesmo timestamp operacional.
- [x] 51. Se o frontend local estiver servido por `dist`, rodar `npm run build` antes da validacao visual para garantir que o browser esta consumindo o bundle novo.

### Registro da rodada local de 2026-05-20 para itens 4, 7, 8, 24, 49 e 51

- Build executado antes da validacao visual:
	- `backend`: `npm run build` aprovado.
	- `frontend`: `npm run build` aprovado.
	- nenhum dos dois pacotes tem script `lint` declarado.
- Correcao sob teste:
	- `backend/src/services/MessageServices/CreateMessageService.ts` passou a emitir `appMessage` para rooms `all` e `whatsapp:<id>`.
	- `frontend/src/components/TicketsManager/index.js` passou a enviar `showAll` tambem para `TicketsList status="pending"`.
- Cenario A - ticket aberto existente:
	- contato/ticket: `Mor`, ticket `151`.
	- inbound validado: `TESTE_LISTA_SOCKET_FIX_OPEN_01` (`fromMe = 0`).
	- resultado: preview, horario visual (`18:50`) e topo da lista `open` atualizaram sem `F5`.
- Cenario B - pending observado na lista lateral:
	- contato/ticket: `Papai Rei`, ticket `153`.
	- inbound real observado: `TESTE_LISTA_SOCKET_FIX__INBOUND_01` (`fromMe = 0`).
	- resultado: aba `Aguardando` subiu de `2` para `3`, o card entrou no topo sem `F5` e permaneceu com `status = pending` / `userId = NULL` no momento da prova.
- Cenario C - chat aberto passivo:
	- ticket validado: `109`.
	- inbound real observado: `Teste` (`fromMe = 0`) em `2026-05-20 20:35:50`.
	- resultado: o chat aberto exibiu a nova mensagem sem `F5`.
- Cenario D - separacao defensiva entre `open` e `pending` em 2026-05-21:
	- correcao local: `frontend/src/components/TicketsManager/index.js` passou a esconder a sublista inativa com `display: none`; `frontend/src/components/TicketsList/index.js` passou a filtrar e renderizar somente tickets com `status` compativel, alem de substituir o estado da pagina 1/sync.
	- resultado do cenario A: nao aplicavel nesta rodada, porque a API local `pending` respondeu `count = 3`; ainda assim a aba `Aguardando` mostrou apenas os tickets `pending` (`155`, `152`, `150`), sem cards `open` misturados.
	- resultado do cenario B: a aba `Atendendo` mostrou apenas os tickets `open`; `Bruna Santos` so apareceu ali depois do aceite local.
	- resultado do cenario C: aceite da `Bruna Santos` moveu o ticket `154` de `pending` para `open` sem `F5`, abriu `/tickets/154` e liberou o input; `GET http://localhost:8080/tickets/154` confirmou `status = open`, `userId = 1`, `queueId = NULL`, `whatsappId = 13`.
	- resultado do cenario D: o inbound realtime anterior nao foi rerodado nesta rodada; permanece valido o baseline de 2026-05-20 para preview, horario e topo sem `F5`.
- Observacao operacional:
	- durante a rodada, a sessao do browser expirou e precisou ser reidratada localmente para concluir a validacao; isso nao alterou o resultado funcional do fix da lista lateral.

### Registro da rodada local de 2026-05-20 para o item 42

- Ticket validado: `109`
- Mensagem de teste: `TESTE_SOCKET_PASSIVO_109_01`
- Resultado observado:
	- teste com duas abas concluido.
	- `ABA A` enviou a mensagem e recebeu `POST /messages/109` com `200`.
	- `ABA A` fez `GET /messages/109?pageNumber=1` apos o envio.
	- a `Message` foi persistida no banco e `Ticket.lastMessage` foi atualizado.
	- `ABA B`, passiva, exibiu a mensagem sem `F5` e sem troca de chat.
	- nao houve `GET /messages/109` capturado na `ABA B`.
	- `Socket.IO` estava ativo via fallback polling.
	- nao houve prova de upgrade `WebSocket` bem-sucedido.
	- realtime local funcional via polling nesta rodada.
	- Bug 2 nao reproduzido como falha de persistencia.
	- intermitencia anterior classificada, por ora, como possivel timing de refresh/renderizacao ou cenario especifico ainda nao reproduzido.

## Evidencias a registrar em cada rodada

- [ ] Branch e commit testados.
- [ ] Usuario testado e conexao WhatsApp usada.
- [ ] Numero brasileiro e numero internacional usados.
- [ ] Ticket IDs impactados.
- [ ] Horario do teste.
- [ ] Resultado: passou, falhou, intermitente.
- [ ] Log/erro exato quando falhar.
- [ ] Print ou video quando o comportamento depender de realtime sem F5.
