# BIA SDR no SamaChat — Guia de uso

Para quem opera o sistema. Para alterar o código, veja [MANUTENCAO.md](MANUTENCAO.md).

## O que a BIA faz

Atende o lead pelo WhatsApp **dentro do chat do SamaChat**, qualifica, agenda a reunião com um Closer e passa o atendimento. A BIA **não tem funil, agenda nem Closers próprios**: tudo isso é do CRM (integração SamaChat ↔ CRM já existente). A BIA só conversa e chama o CRM.

| O que a BIA precisa | De onde vem |
|---|---|
| Contato do lead | SamaChat |
| Etapa do funil SDR (avançar) | CRM (`CrmM2mSdrStageAdvanceService`) |
| Closers livres em um horário | CRM (`CrmM2mCloserSchedulingService`) |
| Agendar reunião | CRM (`CrmM2mCloserSchedulingService`) |
| Passar do SDR para o Closer | CRM (`CrmM2mCloserHandoffService`) |

Se o CRM estiver desligado ou recusar a ação, a BIA **não inventa**: ela avisa o lead que a equipe vai assumir e transfere para um humano.

## Primeiro uso

1. **Servidor:** defina `INTEGRATION_SETTINGS_ENC_KEY` no `.env` do backend (veja a Manutenção). Sem ela, nenhuma chave é salva.
2. **Configurações > Motores de IA e voz:** cadastre a chave de **Claude** e/ou **Gemini** e ligue. A **OpenAI** (e a transcrição de áudio) continua em Configurações > IA.
3. **Treinamento da IA > Agente:** crie o prompt mestre, escolha a **IA do agente** e ligue o agente.
4. **Modo teste (recomendado):** ligue e informe só os números que podem falar com a IA. Os demais clientes continuam só com a equipe.
5. Mande uma mensagem de teste de um dos números permitidos.

## Treinamento da IA

- **Agente:** liga/desliga, quem atende primeiro (IA ou equipe), nome e empresa, prompt mestre (gerador guiado), IA do agente, modo teste, ajustes avançados.
- **Base de conhecimento:** documentos que a BIA consulta para responder (busca por similaridade; usa a chave da OpenAI para os embeddings).

## IA do agente (Claude, OpenAI ou Gemini)

A escolha é **por agente**, em Treinamento da IA > passo 5. Podem existir várias chaves cadastradas ao mesmo tempo; o agente usa a escolhida. Se a escolhida estiver sem chave ou desligada, o agente **não responde** (não troca de IA sozinho). Em "Automática" ele usa a primeira disponível.

## Chaves (segurança)

- As chaves ficam **cifradas** no banco e **nunca** reaparecem na tela. Você vê só "chave salva ••••1234" e o status em tempo real (conectada / recusada / sem conexão).
- Para trocar, digite a nova por cima. Campo vazio mantém a atual.
- Só é possível ligar uma integração que tenha chave cadastrada.

## Botões IA / Humano no atendimento

No topo da conversa:

- **IA:** passa a conversa para a BIA (exige agente ligado, prompt criado e IA disponível; senão avisa o que falta).
- **Humano:** a BIA para e a conversa fica com quem clicou.

Isso só altera quem responde no chat. A movimentação comercial (etapas, Closer) é do CRM.

## Áudio

- Áudio do lead é transcrito (Whisper, com a chave OpenAI existente) e tratado como texto.
- Resposta em voz (ElevenLabs): ligue "Responder em áudio" em Motores de IA e voz. Se a voz falhar, a BIA responde por texto.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "O servidor não tem a chave de criptografia" | Falta `INTEGRATION_SETTINGS_ENC_KEY` | Definir no `.env` e reiniciar |
| Não consigo ligar a integração | Sem chave cadastrada | Salve a chave primeiro |
| BIA não responde | Agente desligado, sem prompt, IA escolhida sem chave, ou lead fora do modo teste | Conferir Treinamento da IA |
| "Chave recusada" | Chave errada/revogada | Cadastrar outra |
| BIA diz que vai passar para a equipe | CRM indisponível ou recusou a ação | Ver integração CRM M2M |

## Limitações

- O fluxo completo com WhatsApp real e chaves reais ainda precisa ser validado em homologação.
- A BIA depende do CRM M2M estar habilitado e com a integração local configurada (`SAMACHAT_CRM_M2M_INTEGRATION_ID`).
