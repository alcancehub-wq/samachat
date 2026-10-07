# BIA SDR no SamaChat — Alteração, manutenção e atualização

Para quem mexe no código.

## Princípios

1. **A BIA não cria motor comercial.** Disponibilidade, agendamento, avanço de etapa e handoff SDR→Closer vêm do `CrmIntegrationServices`. Não crie agenda, funil ou Closers na BIA.
2. **Não toca no nativo.** Nada de Kanban, Evolution, Meta nova, ações em massa de contatos ou agenda própria neste pacote.
3. **Segredos nunca em texto puro** no banco (AES-256-GCM) nem na API/tela.
4. **Regras validadas no servidor**, espelhadas na tela.

## Mapa do código (raiz do repositório)

### Backend (`backend/src`)

| Caminho | Responsabilidade |
|---|---|
| `services/SdrAgentServices/tools.ts` | Ferramentas do modelo: `check_availability`, `create_appointment`, `advance_stage`, `transfer_to_human`. Traduz a conversa em chamadas ao CRM (`CrmApi` injetável; testes usam fakes) |
| `.../RunSdrAgentService.ts` | Roda o agente por ticket (histórico, áudio, ferramentas, envio) |
| `.../HandleIncomingSdrMessageService.ts` | Decide se a BIA assume a mensagem (chamado em `handlers/handleWhatsappEvents.ts`) |
| `.../SdrHandoffService.ts` | Botões IA/Humano (só ticket, sem funil) |
| `.../policy.ts`, `scheduler.ts`, `agentLoop.ts`, `conversation.ts`, `timezone.ts`, `audio.ts` | Política de resposta, agrupamento de mensagens, laço de ferramentas, histórico, fuso, Whisper/voz |
| `.../SdrAgentSettingsService.ts`, `models/SdrAgentSetting.ts` | Configuração do agente (inclui `aiEngine`) |
| `services/SdrKnowledgeServices/` | Base de conhecimento (chunks + embeddings OpenAI) |
| `services/AiEngineServices/engines.ts` | `getActiveEngine(preferred)`, `createEngineChat`, Gemini/Claude. Motor **escolhido no agente** |
| `.../claudeAdapter.ts` | Converte formato OpenAI ⇄ API Messages da Anthropic |
| `services/IntegrationSettingsServices/` | `providers.ts` (catálogo: gemini, claude, elevenlabs), `IntegrationSettingsService.ts`, `secretCrypto.ts`, `IntegrationStatusService.ts`, `elevenlabs.ts` |
| `controllers/` e `routes/` | `sdrAgentRoutes`, `integrationSettingsRoutes` |

Rotas: `GET/PUT /sdr-agent/settings`, `/sdr-agent/knowledge[...]`, `/sdr-agent/generate-prompt`, `/sdr-agent/status`, `GET/PUT /tickets/:id/sdr-agent`, `GET /ai-engine`, `GET/PUT /integration-settings/:provider`, `GET /integration-settings/:provider/status`.

### Frontend (`frontend/src`)

| Caminho | Responsabilidade |
|---|---|
| `pages/SdrAgent/*` | Treinamento da IA (Agente + Base de conhecimento) |
| `components/SdrHandoffButtons` | Botões IA/Humano (montados em `TicketActionButtons`) |
| `pages/Settings/SdrApis.js`, `IntegrationForm.js`, `LiveStatus.js` | Aba "Motores de IA e voz" |
| `components/PillTabs`, `hooks/useSdrStatus`, `utils/sdrMode.js` | Apoio |

## Banco de dados (migrations `20261008…`)

| Migration | O que faz |
|---|---|
| `…100000-create-sdr-agent` | `SdrAgentSettings` + `Tickets.sdrAgentEnabled` |
| `…100100-create-sdr-knowledge` | Arquivos e chunks da base |
| `…100200-sdr-agent-test-mode-and-categories` | Modo teste e números permitidos |
| `…100300-sdr-agent-ai-first-default` | IA atende primeiro por padrão |
| `…100400-add-sdr-crm-stage-to-tickets` | `Tickets.sdrCrmStage` (etapa SDR confirmada pelo CRM) |
| `…100500-create-integration-settings` | `IntegrationSettings` (config JSON; segredos cifrados) |
| `…100600-add-ai-engine-to-sdr-agent` | `SdrAgentSettings.aiEngine` |

Todas têm `down`. Aplicar: `cd backend && npm run build && npx sequelize db:migrate`. Nunca edite migration já aplicada em produção.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `INTEGRATION_SETTINGS_ENC_KEY` | 64 hex. Cifra as chaves de Gemini/Claude/ElevenLabs. **Obrigatória** para salvar chaves. Gere: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SAMACHAT_CRM_M2M_*` | Já existentes: integração CRM que a BIA consome |

**Rotação/perda da chave:** se `INTEGRATION_SETTINGS_ENC_KEY` mudar ou se perder, as chaves salvas ficam ilegíveis (`ERR_INTEGRATION_SECRET_UNREADABLE`) e devem ser cadastradas de novo. Para trocar a chave: cadastre as chaves novamente após a troca.
Segredos antigos em texto puro (legado) ainda são lidos e regravados cifrados no próximo salvamento.

## Receitas

**Adicionar um motor de IA:** declare em `providers.ts`, implemente em `engines.ts` (`ENGINE_IDS`, `getEngineStates`, `createEngineChat`), inclua em `oneOf` de `SdrAgentController` e `SdrAgentSettingsService`, e nas opções do front.

**Adicionar uma ferramenta à BIA:** definição em `TOOL_DEFINITIONS` e `case` em `executeTool` (`tools.ts`), chamando **serviço do CRM**; adicione ao `CrmApi` e teste em `agent.spec.ts`.

**Novo código de erro:** `AppError("ERR_...")` no backend e texto em `translate/languages/pt.js` (`backendErrors`).

## Testes

```
cd backend
npx tsc --noEmit -p .
NODE_ENV=test npx jest src/__tests__/unit/services/SdrAgentServices src/__tests__/unit/services/AiEngineServices src/__tests__/unit/services/IntegrationSettingsServices --coverage=false
cd ../frontend && npx vite build
```

O `jest.config` tem `bail: 1`: rode suítes específicas para ver todas as falhas.

## Atualizar a partir do upstream

A branch parte da `legacy-prod`. Para atualizar: `git fetch upstream && git rebase upstream/legacy-prod` (ou merge). Pontos que mais conflitam: `routes/index.ts`, `database/index.ts`, `handlers/handleWhatsappEvents.ts`, `models/Ticket.ts`, `layout/MainListItems.js`, `routes/index.js` (front), `pages/Settings/index.js`, `TicketActionButtons`, `translate/languages/*.js`. Depois: build, `db:migrate`, testes acima e teste manual (Configurações, Treinamento da IA, botões IA/Humano).

## Pendências conhecidas

- Validar ponta a ponta em homologação: WhatsApp real, Claude/Gemini/OpenAI reais, Whisper, ElevenLabs, agendamento e handoff reais no CRM.
- Fora deste pacote (deixado para depois, por decisão do cliente): ações em massa de contatos.
- Não incluído por decisão: Evolution, nova configuração Meta, Kanban automático, agenda/Google Agenda próprios.
