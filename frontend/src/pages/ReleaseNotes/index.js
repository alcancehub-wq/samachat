import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import PageBackButton from "../../components/PageBackButton";
import Title from "../../components/Title";

const releases = [

  {
    version: "2026.09.28 / Atalhos rápidos por título",
    label: "Busca de atalhos com / pelo título",
    summary:
      "Correção da busca de atalhos rápidos no compositor para localizar corretamente o conteúdo pelo título cadastrado ao utilizar o comando com barra.",
    changes: [
      "Ao digitar / no campo de mensagem, a pesquisa passa a localizar corretamente os atalhos pelo título.",
      "O fluxo existente de seleção e inserção do atalho foi preservado.",
      "A correção foi promovida no ambiente legado e validada com o bundle ativo em produção.",
    ],
  },
  {
    version: "2026.09.28 / Segunda conexão oficial Meta",
    label: "Nova conexão oficial da WhatsApp Business Platform",
    summary:
      "Uma segunda conexão oficial da Meta foi incorporada à operação do SamaChat, preservando a conexão oficial anterior e o isolamento entre os números.",
    changes: [
      "A nova conexão oficial foi configurada sem substituir a conexão oficial já existente.",
      "Entrada e saída de mensagens foram validadas no fluxo real da API oficial.",
      "A identificação da conexão foi preservada durante o atendimento e o processamento das mensagens.",
      "A conexão oficial anterior permaneceu operacional e isolada durante a ativação da nova conexão.",
    ],
  },
  {
    version: "2026.09.26 / Status de entrega e reenvio seguro",
    label: "Tratamento de mensagens não confirmadas e áudios",
    summary:
      "Reforço do fluxo outbound para representar corretamente o estado de entrega das mensagens, proteger identificadores de mídia e permitir recuperação manual segura quando um envio não puder ser confirmado.",
    changes: [
      "O status de entrega de áudio passou a ser exibido de forma coerente com o estado conhecido pelo SamaChat.",
      "Nomes técnicos de arquivos de mídia deixaram de aparecer indevidamente na conversa.",
      "A normalização dos identificadores internos de mídia do WhatsApp Web foi reforçada para evitar colisões e serializações inválidas.",
      "Mensagens sem confirmação receberam opção de reenvio manual controlado, evitando reenvio automático ambíguo.",
      "O backend recebeu proteção adicional para operações de leitura durante estados transitórios da sessão.",
    ],
  },
  {
    version: "2026.09.17 / Seletor de conexão mobile",
    label: "Ajuste visual do seletor de conexão",
    summary:
      "Ajuste visual no cabeçalho dos Chats em telas mobile, substituindo o seletor de conexão por um botão compacto e preservando integralmente a lógica existente de escolha do canal de envio.",
    changes: [
      "No mobile, o seletor de conexão foi substituido por um botão de ícone compacto, liberando espaço no cabeçalho do atendimento.",
      "Mantidas integralmente as opções Minha conexão e API Oficial, os valores STANDARD e OFFICIAL e o fluxo existente de seleção do canal de resposta.",
      "O layout desktop permanece com o seletor original Enviar por, sem alteração visual ou funcional.",
      "O indicador Cadastro pendente permanece inalterado e deixou de disputar espaço com o seletor no mobile.",
      "Alteracao validada por build local, verificação visual, build e publicação da imagem frontend e confirmação do bundle ativo em produção.",
    ],
  },

  {
    version: "2026.09.16 / Variáveis em templates oficiais",
    label: "Variáveis do SamaChat resolvidas por destinatário",
    summary:
      "Os templates oficiais da Meta evoluíram para utilizar variáveis do SamaChat de forma compatível com a criação do template e com a resolução individual no momento do envio.",
    changes: [
      "Templates oficiais passaram a aceitar as variáveis suportadas pelo SamaChat.",
      "As variáveis internas são traduzidas para a estrutura esperada pela Meta durante a criação do template.",
      "O fluxo de criação foi estabilizado após as validações da integração.",
      "No envio, os valores dinâmicos passam a ser resolvidos individualmente para cada destinatário.",
    ],
  },
  {
    version: "2026.09.15 / Cadastro completo de contatos",
    label: "Ampliação do cadastro de clientes",
    summary:
      "Criado o fluxo de cadastro completo de contatos para armazenar informações complementares sem apagar ou alterar os dados que já existiam.",
    changes: [
      "O cadastro de contatos recebeu campos complementares opcionais para ampliar as informações disponíveis no atendimento.",
      "Os novos campos foram adicionados sem preenchimento automático dos registros antigos.",
      "A interface passou a identificar visualmente quando o cadastro do contato está completo.",
      "O fluxo anterior de contatos permanece compatível com registros que ainda não possuem as informações adicionais.",
    ],
  },
  {
    version: "2026.09.12 / Integração Eduzz",
    label: "Webhook inbound e automação de atendimento",
    summary:
      "Integração inbound da Eduzz incorporada ao SamaChat com autenticação HMAC, variáveis de mensagem e direcionamento operacional do atendimento.",
    changes: [
      "Criado webhook inbound para processar eventos recebidos da Eduzz.",
      "Adicionada estrutura genérica de credenciais para validação HMAC sem exposição de segredos no frontend.",
      "Variáveis disponíveis para a mensagem da automação passaram a ser inseridas pela própria interface.",
      "A interface de Integrações passou a disponibilizar a ação de criação de credenciais no fluxo incorporado.",
      "Tickets gerados ou reutilizados pela automação passam a respeitar o responsável e a fila configurados.",
      "A compatibilidade com o runtime e com o MySQL da produção foi preservada.",
    ],
  },
  {
    version: "2026.09.09 / Múltiplas conversas",
    label: "Isolamento correto dos históricos por atendimento",
    summary:
      "Correção da visualização do histórico para contatos que podem possuir mais de uma conversa, evitando mistura entre atendimentos independentes.",
    changes: [
      "Quando múltiplas conversas estão habilitadas, o histórico exibido passa a pertencer somente ao ticket atual.",
      "Quando múltiplas conversas estão desabilitadas, o comportamento agregado legado permanece preservado.",
      "A resolução do ticket passou a considerar explicitamente a configuração de múltiplas conversas.",
      "A correção foi reaplicada de forma controlada após validação do comportamento final.",
    ],
  },
  {
    version: "2026.09.09 / Corretor de texto PT-BR",
    label: "Correção textual preservando a mensagem original",
    summary:
      "O corretor do compositor foi refinado e convertido para uma solução nativa em português do Brasil, focada em correções textuais seguras.",
    changes: [
      "O corretor deixou de depender do prompt global para decidir como reescrever a mensagem.",
      "A correção foi restringida para preservar o conteúdo e a intenção originalmente digitados pelo atendente.",
      "O processamento em tempo real foi refinado para responder com maior rapidez durante a digitação.",
      "A versão final utiliza tratamento nativo de português do Brasil no frontend.",
    ],
  },
  {
    version: "2026.09.09 / Coexistência oficial sem duplicidade inbound",
    label: "Reconciliação entre API oficial e WhatsApp Business App",
    summary:
      "Reforço da coexistência entre eventos da API oficial e eventos sincronizados do WhatsApp para evitar que a mesma mensagem recebida seja materializada duas vezes no SamaChat.",
    changes: [
      "Eventos inbound equivalentes vindos de providers diferentes passam por reconciliação antes da criação de uma nova mensagem.",
      "O fluxo preserva mensagens realmente distintas e evita deduplicação baseada apenas em semelhança de texto.",
      "A correção foi aplicada sobre a operação de coexistência já ativa da conexão oficial.",
    ],
  },
  {
    version: "2026.09.08 / Áudio outbound e player",
    label: "Recuperação de mídia e estabilidade visual",
    summary:
      "Correções adicionais no ciclo de áudio outbound para impedir ecos vazios, recuperar payloads de mídia e manter o player estável dentro da conversa.",
    changes: [
      "Ecos outbound de áudio sem mídia utilizável deixam de gerar balões vazios.",
      "O backend passou a recuperar o payload de mídia quando o provider retorna o áudio por uma trilha alternativa.",
      "O caso de áudio enviado pelo mobile recebeu compatibilidade adicional para recuperação da mídia.",
      "O player de áudio no frontend foi estabilizado para respeitar a largura disponível da conversa.",
    ],
  },
  {
    version: "2026.09.05 / Ressincronização global e contatos",
    label: "Ressincronização completa por conexão",
    summary:
      "A ressincronização do WhatsApp Web foi ampliada para trabalhar no escopo real da conexão e recuperar também informações dos contatos.",
    changes: [
      "A ação de ressincronização deixou de ficar limitada ao ticket atual e passou a operar no escopo da conexão.",
      "O processo passou a enumerar os contatos disponíveis no provider durante a ressincronização global.",
      "Contatos identificados somente por LID passaram a ser tratados sem inventar um número telefônico inexistente.",
      "A recuperação de fotos de perfil foi incorporada ao resync global.",
      "A busca de tickets a partir de cartões de contato passou a respeitar a conexão correta.",
    ],
  },
  {
    version: "2026.09.04 / Operação oficial Meta e coexistência",
    label: "Consolidação do canal oficial no atendimento",
    summary:
      "Consolidação do uso da API oficial da Meta no SamaChat, incluindo status, coexistência, canal de resposta, janela de atendimento e fluxos outbound.",
    changes: [
      "Status enviados pela Cloud API passaram a atualizar o estado das mensagens oficiais no SamaChat.",
      "O eco de mensagens enviadas pelo WhatsApp Business App passou a ser reconciliado com o fluxo oficial.",
      "Agendamentos e campanhas passaram a utilizar o resolvedor do canal outbound oficial quando aplicável.",
      "Foi preservada a autoria operacional do responsável pelo envio oficial.",
      "Cada ticket passou a poder manter explicitamente o canal usado para a resposta.",
      "O SamaChat passou a registrar a janela oficial de atendimento ao cliente e bloquear texto livre fora da janela permitida quando o envio exige template.",
      "Fatos de correlação dos eventos inbound oficiais passaram a ser persistidos para melhorar rastreabilidade e deduplicação.",
      "Importação histórica e ecos de mídia oficial receberam proteção adicional contra duplicidade.",
    ],
  },
  {
    version: "2026.09.03 / Integridade operacional de tickets",
    label: "Ticket canônico e proteção contra conflitos",
    summary:
      "Reforço estrutural das regras que determinam qual atendimento pode operar um contato, reduzindo tickets ativos conflitantes e envios em estados inválidos.",
    changes: [
      "Foi centralizada a resolução do ticket operacional ativo de um contato.",
      "O envio externo passou a ser bloqueado quando o ticket não está em estado aberto.",
      "O aceite de um ticket pendente passou a utilizar proteção contra dois usuários assumirem o mesmo atendimento simultaneamente.",
      "A criação e reutilização de tickets passaram a respeitar a configuração de múltiplas conversas.",
      "Ao iniciar conversa por um cartão de contato, o sistema reutiliza o atendimento operacional já existente quando aplicável.",
      "As ações de encerrar ou marcar um atendimento como perdido passaram a confirmar que o envio ficará indisponível.",
    ],
  },
  {
    version: "2026.08.28 / Reconciliação e histórico WhatsApp",
    label: "P05 - Ressincronização e recuperação direcionada",
    summary:
      "Consolidação do pacote de sincronização WhatsApp para recuperar histórico, identidade do contato e mensagens ausentes sem realizar varreduras indiscriminadas.",
    changes: [
      "Foi restaurada a reconciliação do WhatsApp com opção de ressincronização manual.",
      "O processo passou a manter checkpoint próprio e a aprofundar o histórico até encontrar a âncora necessária.",
      "Metadados repetidos de contatos passaram a ser deduplicados durante a reconciliação.",
      "A rotina global recebeu limites de segurança para evitar processamento excessivo de histórico e contatos.",
      "A reconciliação direcionada por ticket passou a permitir recuperação profunda quando um atendimento específico exige histórico anterior.",
      "Identidades de telefone e LID passaram a ser reconstruídas usando evidências do próprio ticket e do provider.",
      "Falhas de fronteira do modelo interno do WhatsApp Web receberam tratamento específico para preservar a recuperação do histórico.",
    ],
  },
  {
    version: "2026.08.27 / Gestão de templates oficiais da Meta",
    label: "Listagem, permissões, criação e exclusão",
    summary:
      "A fundação de templates oficiais evoluiu para uma área de gestão com autorização própria e operações específicas de template.",
    changes: [
      "Adicionada listagem de templates oficiais com páginação sanitizada.",
      "Criadas permissões específicas para visualizar, criar e excluir templates.",
      "A autorização passou a respeitar a governança definida para os setores habilitados.",
      "Adicionados clientes e endpoints específicos para criação e exclusão de templates.",
      "A interface passou a disponibilizar as operações de gestão sem acoplar templates ao fluxo comum de diálogos.",
    ],
  },
  {
    version: "2026.08.26 / Templates oficiais da Meta - Fundação",
    label: "Fundação de templates oficiais da Meta",
    summary:
      "Criada a base técnica isolada para futura gestão de Message Templates oficiais do WhatsApp Business Platform, preservando integralmente a integração Cloud API atualmente em operação.",
    changes: [
      "Criado módulo independente MetaMessageTemplateServices, sem acoplamento ao fluxo atual de envio e recebimento de mensagens.",
      "Adicionado contrato inicial para categorias MARKETING, UTILITY e AUTHENTICATION e para estruturas retornadas pela Meta.",
      "Adicionada construção validada do endpoint WABA /message_templates usando a versão configurada da API.",
      "Incluídas validações para WABA ID e token de acesso sem expor credenciais ao frontend.",
      "Nenhuma chamada real a Meta, alteração de banco, campanha, dialogo, FlowBuilder, webhook ou fluxo de envio foi realizada nesta etapa.",
      "Fundação validada com 5 testes unitarios aprovados e build do backend concluido com sucesso.",
    ],
  },

  {
    version: "2026.08.25 / Mídias na API oficial Meta",
    label: "Áudio, imagem e documentos na conexão oficial",
    summary:
      "A conexão oficial da Meta passou a tratar mídias de entrada e saída diretamente no fluxo operacional do SamaChat.",
    changes: [
      "O envio oficial passou a suportar mídias outbound pela Cloud API.",
      "Mensagens inbound oficiais com mídia passaram a ser normalizadas e armazenadas no atendimento.",
      "Mídias enviadas pela conexão oficial passaram a ser persistidas localmente para manter a renderização da conversa.",
      "O tipo real do provider passou a ser hidratado corretamente durante a persistência das mídias.",
      "O ticket passou a exibir o estado da conexão oficial utilizada na operação.",
    ],
  },
  {
    version: "2026.08.18 / Continuidade de transferências",
    label: "Correcao de continuidade do atendimento",
    summary:
      "Ajuste de continuidade para transferências entre usuários, preservando o contexto operacional atual do atendimento e evitando fragmentação causada por agendamentos antigos.",
    changes: [
      "Agendamentos vinculados a um atendimento passam a usar o usuário e a conexão atuais do ticket no momento da execução.",
      "Transferencias continuam preservando o mesmo atendimento, histórico e contexto acumulado entre os usuários.",
      "Mantidas as proteções existentes contra duplicidade de mensagens e o comportamento de contatos com múltiplas conversas permitidas.",
    ],
  },

  {
    version: "2026.08.12 / Compatibilidade de mídia recebida",
    label: "Recuperação de mídia inbound no WhatsApp Web",
    summary:
      "Correção do recebimento de mídias quando o WhatsApp Web apresenta variações internas de identificação ou disponibilidade do arquivo.",
    changes: [
      "O fluxo inbound recebeu instrumentação específica para identificar a etapa real de aquisição da mídia.",
      "A sessão responsável pelo evento passou a ser registrada na observabilidade da mídia recebida.",
      "Foi adicionada compatibilidade para estruturas alternativas de identificação retornadas pelo provider.",
      "Mensagens sem payload de mídia utilizável deixam de ser persistidas como se o arquivo tivesse sido recuperado corretamente.",
    ],
  },
  {
    version: "2026.08.11 / Conexão compartilhada por usuários",
    label: "Distribuição de uma mesma conexão entre usuários",
    summary:
      "A estrutura de conexões do SamaChat foi ampliada para permitir distribuição controlada de uma mesma conexão WhatsApp entre mais de um usuário.",
    changes: [
      "A sincronização de usuários vinculados deixou de substituir todos os vínculos ao selecionar um novo usuário.",
      "Uma conexão pode manter múltiplos usuários vinculados de acordo com a configuração operacional.",
      "A mudança preservou as regras existentes de propriedade e visibilidade dos tickets.",
    ],
  },
  {
    version: "2026.08.11 / Estabilidade de outbound e áudio",
    label: "Proteção contra duplicidade e reconciliação de ecos",
    summary:
      "Fechamento dos pacotes de duplicidade outbound e áudio com correlação entre a mensagem persistida e os eventos posteriores do WhatsApp.",
    changes: [
      "Retentativas ambíguas de texto outbound deixaram de provocar um segundo envio físico quando o resultado do primeiro envio não é conclusivo.",
      "Ecos outbound de texto passaram a ser correlacionados com a mensagem já persistida no SamaChat.",
      "O eco do áudio gravado passou a reutilizar a identidade real da mensagem persistida, evitando um segundo balão local.",
      "Eventos message e message_create continuam compartilhando a proteção contra processamento duplicado.",
      "O evento posterior de disponibilidade de mídia passou a possuir ciclo próprio para não ser descartado apenas por compartilhar o mesmo ID.",
      "O pacote de áudio foi validado no fluxo real com um envio correspondendo a um player local e a um áudio no destinatário.",
    ],
  },
  {
    version: "2026.08.09 / Tickets aceitos permanecem visíveis",
    label: "Correção da aba Atendendo após o aceite",
    summary:
      "Correção do caso em que um ticket podia desaparecer da lista do próprio atendente logo após ser aceito.",
    changes: [
      "Tickets abertos do próprio responsável passam a prevalecer antes dos filtros de fila e conexão.",
      "A atualização devolvida pela API é reaproveitada imediatamente no frontend após o aceite.",
      "A lista de tickets realiza atualização por ID sem criar uma segunda cópia do mesmo atendimento.",
      "Tickets pertencentes a outro responsável continuam sem ganhar visibilidade indevida.",
      "O comportamento compartilhado dos tickets em Aguardando permanece separado da regra de tickets já aceitos.",
    ],
  },
  {
    version: "2026.07.27 / Duplicidade de mensagens outbound",
    label: "Correcao de duplicidade visual nos Chats",
    summary:
      "Entrega focada em impedir que uma única mensagem enviada pelo SamaChat apareca duplicada na conversa por causa do eco assíncrono do WhatsApp Web.",
    changes: [
      "Adicionada uma reserva segura antes do envio de textos e mídias pelo provider.",
      "O eco outbound passa a ser ignorado somente quando corresponde ao mesmo ID real retornado pelo envio.",
      "Mantida a compatibilidade entre o ID serializado do WhatsApp Web e sua representação curta.",
      "Mensagens legitimas repetidas continuam sendo preservadas quando possuem IDs diferentes.",
      "Falhas de envio cancelam a reserva e a remoção da sessão limpa qualquer estado pendente.",
      "Validação local concluida em handler, guarda outbound, integração do provider, deduplicação, reconexão, envio de texto, envio de mídia e builds do backend e frontend.",
    ],
  },
  {
    version: "2026.07.27 / Estabilidade das conexões WhatsApp",
    label: "Correcao de estabilidade e recuperação automática",
    summary:
      "Entrega focada em manter as conexões WhatsApp Web mais estaveis e recuperar automaticamente sessões travadas, reduzindo quedas e a necessidade de reconexão manual.",
    changes: [
      "Reforcada a recuperação automática de conexões que permaneciam ativas internamente, mas ainda não estavam prontas para enviar mensagens.",
      "Evitado reiniciar uma conexão que tenha ficado pronta enquanto aguardava sua vez no processo de inicialização.",
      "Corrigida a fila global de inicialização para que uma conexão travada não bloqueie indefinidamente a abertura das demais conexões.",
      "Adicionado limite seguro para a limpeza de sessões travadas, permitindo que o sistema continue processando outras conexões mesmo quando uma limpeza demora além do esperado.",
      "Integrada a recuperação de sessão aos envios de texto e mídia, preservando as conexões saudáveis e acionando reinicio apenas quando realmente necessario.",
      "Validação concluida com 28 testes automatizados, build aprovado e funcionamento confirmado em produção.",
    ],
  },
  {
    version: "2026.06.10 / Operacao, atalhos e mobile",
    label: "Pacote de estabilidade e usabilidade",
    summary:
      "Entrega concentrada em estabilidade operacional dos atendimentos, governança dos atalhos, agendamentos e melhoria da experiência mobile em Chats.",
    changes: [
      "Corrigida a listagem de atalhos para respeitar o usuário logado, mantendo visíveis os atalhos próprios e os atalhos globais quando aplicavel.",
      "Reforcada a estrutura dos atalhos com coluna de usuário declarada de forma explícita, preparando a governança por atendente sem quebrar registros existentes.",
      "Ajustada a mensagem interna no mobile para abrir corretamente ao tocar na linha Mensagem interna dentro do menu de ações do composer.",
      "Aplicado fundo solido ao composer de mensagem interna no mobile, evitando mistura visual com as mensagens da conversa ao fundo.",
      "Corrigida a visibilidade de tickets transferidos para o usuário de destino e melhorado o envio de notificações sobre transferências.",
      "Evitado que tickets sejam marcados como lidos automaticamente apenas por abertura ou transferência, preservando melhor a leitura operacional.",
      "Reforcada a proteção contra duplicidade em conversas manuais, respeitando proprietario do contato, conexão e reaproveitamento seguro de tickets.",
      "Melhorada a auditoria dos agendamentos executados e endurecido o controle de horário das campanhas agendadas.",
      "Reforcadas regras de exclusão/revogação de mensagens, incluindo fallback seguro e confirmação antes de marcar mensagens como apagadas.",
    ],
  },
  {
    version: "2026.05.11 / FlowBuilder canvas visual",
    label: "Atualizacao do dia",
    summary:
      "Entrega focada em transformar o construtor de fluxos legado em um canvas visual mais próximo de ferramentas como ManyChat e Make, mantendo o contrato atual do backend.",
    changes: [
      "Substituido o editor linear por um canvas visual com nos arrastaveis, minimapa, zoom, conexões desenhadas no próprio grafo e edição mais direta da jornada.",
      "Adicionado menu contextual com clique direito dentro do canvas para criar nos no ponto desejado e acessar rapidamente ações de no e conexão.",
      "Incluido inspector flutuante dentro do próprio canvas para editar selecoes sem depender de sair da área principal do fluxo.",
      "Ajustado o layout para aproveitar melhor a largura da tela, com recolhimento automático do menu lateral nas rotas de FlowBuilder, seguindo o mesmo padrão usado em Chats.",
      "Melhorada a ergonomia com barra de ações rápidas no canvas, atalhos de teclado para operações frequentes e navegação mais acessivel por foco e seleção.",
    ],
  },
  {
    version: "2026.05.09 / Campanhas, diálogos e listas",
    label: "Pacote funcional do dia",
    summary:
      "Entrega concentrada em completar o fluxo de campanhas do legado com anexos em diálogos, controle de ativacao, público seguro, assinatura coerente e refinamentos operacionais nas listas.",
    changes: [
      "Adicionado suporte a anexar arquivos em diálogos, incluindo reutilização do anexo no disparo real da campanha.",
      "Ajustado {{nome}} para usar somente o primeiro nome capitalizado e adicionadas as variáveis {{bom_dia}}, {{boa_tarde}} e {{boa_noite}}.",
      "Incluido seletor para ativar ou desativar campanhas sem misturar essa decisão com o status operacional da campanha.",
      "Corrigido o escopo de audiência para respeitar o público salvo, mantendo lista manual ou dinâmica como base e aplicando tags da campanha como filtro adicional quando existirem.",
      "Reforcada a edição de listas manuais com resumo explícito dos contatos selecionados, evitando manter contatos ocultos na seleção antes de salvar.",
      "Restaurado no disparo da campanha o respeito a assinatura padrão do usuário vinculado a conexão usada no envio.",
      "Corrigido o envio de áudio anexado para não forcar mensagem de voz em formatos incompatíveis, reduzindo erro de reprodução para quem recebe.",
    ],
  },
  {
    version: "2026.05.09 / Diálogos e conexões",
    label: "Ajustes finos do dia",
    summary:
      "Entrega concentrada em acabamento visual dos popups compartilhados e simplificacao do modal de conexão WhatsApp no legado em produção.",
    changes: [
      "Refinado o bloco de variáveis disponíveis em Diálogos, Atalhos e Agendamentos com painel mais premium, cards clicaveis, hierarquia mais clara e fundo solido mais suave.",
      "Removida do popup Adicionar WhatsApp a opção Assinar mensagens por padrão, para o modal apenas vincular o usuário sem sobrescrever a preferencia individual de assinatura.",
    ],
  },
  {
    version: "2026.05.08 / Mensagens, conexões e listas",
    label: "Promocao do dia",
    summary:
      "Entrega focada em consolidar variáveis dinâmicas no envio real, corrigir o acesso a sessão da conexão própria e melhorar a operação de listas e chats no legado em produção.",
    changes: [
      "Centralizada a resolução de variáveis dinâmicas imediatamente antes do envio real de mensagens, legendas e automações, com suporte inicial a {{nome}}, {{telefone}}, {{email}}, {{ticket_id}}, {{responsável}}, {{fila}}, {{data_atual}} e {{hora_atual}}.",
      "Atualizados Diálogos, Atalhos e Agendamentos para exibir somente a lista real de variáveis suportadas, com inserção rápida no texto.",
      "Corrigido o acesso de sessão para usuários vinculados a uma conexão própria, incluindo serialização consistente do whatsapp vinculado na autenticação e fallback pelo whatsappId no frontend.",
      "Reforcada a tela de Conexoes para reconhecer a conexão própria também pela relação de usuários vinculados em cada conexão, restaurando as ações de sessão mesmo quando o payload de autenticação vier incompleto.",
      "Restaurado no modal de conexão o fluxo de usuário vinculado com a opção Assinar mensagens por padrão, reaproveitando a assinatura já existente no cadastro do usuário.",
      "Ajustada a seleção em lote da aba Aguardando para exibir Excluir selecionados também para perfis com permissão tickets.delete, além da permissão específica de exclusão pelo menu do ticket.",
      "Corrigido o carregamento de setores nos selects compartilhados para perfis operacionais com permissão sectors.view, evitando listas vazias ao vincular setores em usuários e conexões.",
      "Ampliadas as listas dinâmicas com filtro por responsável, preview de contatos encontrados e exclusão manual de contatos antes do disparo da campanha.",
    ],
  },
  {
    version: "2026.05.06 / Chats, cadastro e operação local",
    label: "Aprimoramentos do dia",
    summary:
      "Entrega concentrada em usabilidade do módulo de Chats, correção de cadastro de clientes e estabilizacao do ambiente legado para validação e deploy seguro.",
    changes: [
      "Corrigido o cadastro de clientes quando a validação do número do WhatsApp retornava formatos fora do filtro anterior, evitando bloqueio indevido no registro de contatos.",
      "Ampliado o modal de Novo atendimento para facilitar busca e seleção de clientes em telas operacionais.",
      "Implementada a anotação interna em composer separado, com ação de salvar/cancelar e sugestao de usuários por menção com @ durante a digitação.",
      "Reorganizado o painel lateral de Chats para ficar mais enxuto: busca, filtros, toggle de Todos e abas de Atendendo/Aguardando foram compactados para liberar mais área útil na lista e na conversa.",
      "Ajustado o comportamento do menu lateral recolhido com tooltip por item e fechamento automático ao entrar em Chats no desktop, preservando navegação mais limpa.",
      "Atualizado o ambiente local para servir a versão correta em localhost com backend local, sem alterar dados reais de produção nem a estrutura de conexões, usuários e atendimentos existentes.",
    ],
  },
  {
    version: "2026.05.05 / Operacao, atendimento e estabilidade",
    label: "Execucoes do dia",
    summary:
      "Consolidacao das entregas do dia no legado em produção, com foco em estabilidade de WhatsApp, atendimento interno e controle de acesso por setor.",
    changes: [
      "Promovidas para o legado as correções funcionais preservadas sem redesign, incluindo assinaturas padrão por usuário, notas internas no contato e retorno seguro do alias /dashboard.",
      "Ajustada a serialização e inicialização de sessões WhatsApp para reduzir falhas de reconexão e manter o fluxo de envio mais estável.",
      "Restaurado o scroll vertical da lateral Dados do contato no frontend de produção.",
      "Corrigido o roteamento das notificações de novos chats em Aguardando e Atendendo para respeitar responsável, filas do usuário e permissão de ver todos.",
      "Adicionado modo de mensagem interna no composer: quando ativado, a mensagem fica visível apenas para usuários internos e não e enviada ao cliente.",
      "Compatibilizadas permissões antigas de conexão para que atendentes possam operar suas sessões de WhatsApp por permissão de setor, sem precisar virar admin, mantendo a regra de visibilidade por proprietario salvo liberacao do administrador.",
    ],
  },
  {
    version: "2026.05.02 / Fase 1",
    label: "Base visual",
    summary:
      "Primeira camada do redesign visual com nova base de tema, estrutura e componentes compartilhados do frontend legado.",
    changes: [
      "Aplicado o redesign visual Samacom nas áreas principais do frontend, com reforco da identidade em vermelho, preto, cinza e verde operacional.",
      "Refinados shell, sidebar, cabecalhos, espacamentos, bordas, botões, modais e componentes compartilhados para padrão mais consistente.",
      "Ajustados wrappers, skeletons, cabeçalho de conversa, informações do ticket e estrutura geral da aplicação para preparar a nova linguagem visual.",
    ],
  },
  {
    version: "2026.05.02 / Fase 1B",
    label: "Reforco visual",
    summary:
      "A segunda onda intensificou o impacto do redesign e expandiu o padrão visual para as telas administrativas e de operação.",
    changes: [
      "Padronizado o visual de várias telas no modelo de Clientes, incluindo Atalhos, Tags, Usuarios, Diálogos, Filas, Flows, Tarefas, Agendamentos, Arquivos, Campanhas, Integracoes e outras listas administrativas.",
      "Ajustado o Kanban para o novo padrão de cabeçalho com busca, filtros e ação principal em duas linhas.",
      "Refinados arredondamentos, pesos, densidade visual e hierarquia entre botões primários e secundários em modais e tabelas.",
      "Corrigido erro de tela branca após login ao restaurar o import de clsx em MainListItems.",
    ],
  },
  {
    version: "2026.05.02 / Chats",
    label: "Melhoria funcional",
    summary:
      "O módulo de Chats recebeu ajuste funcional para operação em lote e acabamento visual mais coerente com o restante do sistema.",
    changes: [
      "Implementada seleção em lote na aba Aguardando dos Chats, com selecionar todos, aceitar selecionados e excluir selecionados.",
      "Removidos restos de azul em áreas críticas de Chats, tabs, switches, ações da conversa e destaques do composer, alinhando a paleta aprovada.",
      "Reorganizado o cabeçalho do gerenciador de tickets para ficar mais próximo do modelo aprovado em Clientes.",
    ],
  },
  {
    version: "2026.05.02 / Navegacao e conteúdo",
    label: "Estrutura",
    summary:
      "A arquitetura de navegação foi simplificada e o rodape do usuário passou a concentrar itens institucionais e de conta.",
    changes: [
      "Criado bloco de conta no rodape do menu lateral com email, perfil e atalhos rápidos para Informativos, Notas da versão, Perfil, Tema, Manual e LGPD.",
      "Movidos IA, API Admin e Integracoes do menu principal para abas internas de Configuracoes, preservando o conteúdo real de cada módulo.",
      "Renomeado Ajustes para Configuracoes e reorganizada a navegação para reduzir poluição no menu principal.",
      "Criada a página LGPD com conteúdo adaptado para o contexto do SamaChat e, agora, adicionadas as paginas Manual do sistema e Notas da versão.",
      "Detalhado o Manual com orientação por módulo e fluxo por perfil: atendente, gestor e administrador.",
    ],
  },
];

const useStyles = makeStyles(theme => ({
  content: {
    padding: theme.spacing(0, 2, 2),
    overflowY: "auto",
    minHeight: 0,
    flex: 1,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0, 1, 1),
    },
  },
  metaBlock: {
    marginTop: theme.spacing(0.5),
  },
  headerBlock: {
    flex: "1 1 100%",
    minWidth: 0,
    marginRight: "auto",
    textAlign: "left",
  },
  metaLine: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.5,
    marginTop: theme.spacing(0.5),
  },
  introCard: {
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
    backgroundColor: "#ffffff",
    backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  noticeLabel: {
    color: "#111111",
    fontWeight: 700,
    marginBottom: theme.spacing(0.75),
  },
  noticeText: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  sectionCard: {
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(1.5),
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1.25),
  },
  sectionLabel: {
    color: "#111111",
    fontWeight: 700,
    marginBottom: theme.spacing(1),
  },
  paragraph: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
    marginBottom: theme.spacing(1),
  },
}));

const ReleaseNotes = () => {
  const classes = useStyles();

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerBlock}>
          <PageBackButton fallbackTo="/dashboard" />
          <Title>Notas da versão</Title>
          <div className={classes.metaBlock}>
            <Typography className={classes.metaLine}>Histórico de atualizações do frontend e da operação</Typography>
          </div>
        </div>
        <div />
      </MainHeader>

      <div className={classes.content}>
        <Paper className={classes.introCard}>
          <Typography className={classes.noticeLabel}>Sobre esta página</Typography>
          <Typography className={classes.noticeText}>
            Esta área registra as alterações relevantes do sistema. Sempre que houver uma entrega importante,
            ela deve ser adicionada aqui para facilitar consulta, treinamento e rastreabilidade das mudanças.
          </Typography>
        </Paper>

        {releases.map(release => (
          <Paper key={release.version} className={classes.sectionCard}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Versão {release.version}
            </Typography>
            <Typography className={classes.sectionLabel}>{release.label}</Typography>
            <Typography className={classes.paragraph}>{release.summary}</Typography>
            {release.changes.map(change => (
              <Typography key={change} className={classes.paragraph}>
                - {change}
              </Typography>
            ))}
          </Paper>
        ))}
      </div>
    </MainContainer>
  );
};

export default ReleaseNotes;