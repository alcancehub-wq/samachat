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
    version: "2026.06.10 / Operacao, atalhos e mobile",
    label: "Pacote de estabilidade e usabilidade",
    summary:
      "Entrega concentrada em estabilidade operacional dos atendimentos, governanca dos atalhos, agendamentos e melhoria da experiencia mobile em Chats.",
    changes: [
      "Corrigida a listagem de atalhos para respeitar o usuario logado, mantendo visiveis os atalhos proprios e os atalhos globais quando aplicavel.",
      "Reforcada a estrutura dos atalhos com coluna de usuario declarada de forma explicita, preparando a governanca por atendente sem quebrar registros existentes.",
      "Ajustada a mensagem interna no mobile para abrir corretamente ao tocar na linha Mensagem interna dentro do menu de acoes do composer.",
      "Aplicado fundo solido ao composer de mensagem interna no mobile, evitando mistura visual com as mensagens da conversa ao fundo.",
      "Corrigida a visibilidade de tickets transferidos para o usuario de destino e melhorado o envio de notificacoes sobre transferencias.",
      "Evitado que tickets sejam marcados como lidos automaticamente apenas por abertura ou transferencia, preservando melhor a leitura operacional.",
      "Reforcada a protecao contra duplicidade em conversas manuais, respeitando proprietario do contato, conexao e reaproveitamento seguro de tickets.",
      "Melhorada a auditoria dos agendamentos executados e endurecido o controle de horario das campanhas agendadas.",
      "Reforcadas regras de exclusao/revogacao de mensagens, incluindo fallback seguro e confirmacao antes de marcar mensagens como apagadas.",
    ],
  },
  {
    version: "2026.05.11 / FlowBuilder canvas visual",
    label: "Atualizacao do dia",
    summary:
      "Entrega focada em transformar o construtor de fluxos legado em um canvas visual mais proximo de ferramentas como ManyChat e Make, mantendo o contrato atual do backend.",
    changes: [
      "Substituido o editor linear por um canvas visual com nos arrastaveis, minimapa, zoom, conexoes desenhadas no proprio grafo e edicao mais direta da jornada.",
      "Adicionado menu contextual com clique direito dentro do canvas para criar nos no ponto desejado e acessar rapidamente acoes de no e conexao.",
      "Incluido inspector flutuante dentro do proprio canvas para editar selecoes sem depender de sair da area principal do fluxo.",
      "Ajustado o layout para aproveitar melhor a largura da tela, com recolhimento automatico do menu lateral nas rotas de FlowBuilder, seguindo o mesmo padrao usado em Chats.",
      "Melhorada a ergonomia com barra de acoes rapidas no canvas, atalhos de teclado para operacoes frequentes e navegacao mais acessivel por foco e selecao.",
    ],
  },
  {
    version: "2026.05.09 / Campanhas, dialogos e listas",
    label: "Pacote funcional do dia",
    summary:
      "Entrega concentrada em completar o fluxo de campanhas do legado com anexos em dialogos, controle de ativacao, publico seguro, assinatura coerente e refinamentos operacionais nas listas.",
    changes: [
      "Adicionado suporte a anexar arquivos em dialogos, incluindo reutilizacao do anexo no disparo real da campanha.",
      "Ajustado {{nome}} para usar somente o primeiro nome capitalizado e adicionadas as variaveis {{bom_dia}}, {{boa_tarde}} e {{boa_noite}}.",
      "Incluido seletor para ativar ou desativar campanhas sem misturar essa decisao com o status operacional da campanha.",
      "Corrigido o escopo de audiencia para respeitar o publico salvo, mantendo lista manual ou dinamica como base e aplicando tags da campanha como filtro adicional quando existirem.",
      "Reforcada a edicao de listas manuais com resumo explicito dos contatos selecionados, evitando manter contatos ocultos na selecao antes de salvar.",
      "Restaurado no disparo da campanha o respeito a assinatura padrao do usuario vinculado a conexao usada no envio.",
      "Corrigido o envio de audio anexado para nao forcar mensagem de voz em formatos incompatveis, reduzindo erro de reproducao para quem recebe.",
    ],
  },
  {
    version: "2026.05.09 / Dialogos e conexoes",
    label: "Ajustes finos do dia",
    summary:
      "Entrega concentrada em acabamento visual dos popups compartilhados e simplificacao do modal de conexao WhatsApp no legado em producao.",
    changes: [
      "Refinado o bloco de variaveis disponiveis em Dialogos, Atalhos e Agendamentos com painel mais premium, cards clicaveis, hierarquia mais clara e fundo solido mais suave.",
      "Removida do popup Adicionar WhatsApp a opcao Assinar mensagens por padrao, para o modal apenas vincular o usuario sem sobrescrever a preferencia individual de assinatura.",
    ],
  },
  {
    version: "2026.05.08 / Mensagens, conexoes e listas",
    label: "Promocao do dia",
    summary:
      "Entrega focada em consolidar variaveis dinamicas no envio real, corrigir o acesso a sessao da conexao propria e melhorar a operacao de listas e chats no legado em producao.",
    changes: [
      "Centralizada a resolucao de variaveis dinamicas imediatamente antes do envio real de mensagens, legendas e automacoes, com suporte inicial a {{nome}}, {{telefone}}, {{email}}, {{ticket_id}}, {{responsavel}}, {{fila}}, {{data_atual}} e {{hora_atual}}.",
      "Atualizados Dialogos, Atalhos e Agendamentos para exibir somente a lista real de variaveis suportadas, com insercao rapida no texto.",
      "Corrigido o acesso de sessao para usuarios vinculados a uma conexao propria, incluindo serializacao consistente do whatsapp vinculado na autenticacao e fallback pelo whatsappId no frontend.",
      "Reforcada a tela de Conexoes para reconhecer a conexao propria tambem pela relacao de usuarios vinculados em cada conexao, restaurando as acoes de sessao mesmo quando o payload de autenticacao vier incompleto.",
      "Restaurado no modal de conexao o fluxo de usuario vinculado com a opcao Assinar mensagens por padrao, reaproveitando a assinatura ja existente no cadastro do usuario.",
      "Ajustada a selecao em lote da aba Aguardando para exibir Excluir selecionados tambem para perfis com permissao tickets.delete, alem da permissao especifica de exclusao pelo menu do ticket.",
      "Corrigido o carregamento de setores nos selects compartilhados para perfis operacionais com permissao sectors.view, evitando listas vazias ao vincular setores em usuarios e conexoes.",
      "Ampliadas as listas dinamicas com filtro por responsavel, preview de contatos encontrados e exclusao manual de contatos antes do disparo da campanha.",
    ],
  },
  {
    version: "2026.05.06 / Chats, cadastro e operacao local",
    label: "Aprimoramentos do dia",
    summary:
      "Entrega concentrada em usabilidade do modulo de Chats, correcao de cadastro de clientes e estabilizacao do ambiente legado para validacao e deploy seguro.",
    changes: [
      "Corrigido o cadastro de clientes quando a validacao do numero do WhatsApp retornava formatos fora do filtro anterior, evitando bloqueio indevido no registro de contatos.",
      "Ampliado o modal de Novo atendimento para facilitar busca e selecao de clientes em telas operacionais.",
      "Implementada a anotacao interna em composer separado, com acao de salvar/cancelar e sugestao de usuarios por mencao com @ durante a digitacao.",
      "Reorganizado o painel lateral de Chats para ficar mais enxuto: busca, filtros, toggle de Todos e abas de Atendendo/Aguardando foram compactados para liberar mais area util na lista e na conversa.",
      "Ajustado o comportamento do menu lateral recolhido com tooltip por item e fechamento automatico ao entrar em Chats no desktop, preservando navegacao mais limpa.",
      "Atualizado o ambiente local para servir a versao correta em localhost com backend local, sem alterar dados reais de producao nem a estrutura de conexoes, usuarios e atendimentos existentes.",
    ],
  },
  {
    version: "2026.05.05 / Operacao, atendimento e estabilidade",
    label: "Execucoes do dia",
    summary:
      "Consolidacao das entregas do dia no legado em producao, com foco em estabilidade de WhatsApp, atendimento interno e controle de acesso por setor.",
    changes: [
      "Promovidas para o legado as correcoes funcionais preservadas sem redesign, incluindo assinaturas padrao por usuario, notas internas no contato e retorno seguro do alias /dashboard.",
      "Ajustada a serializacao e inicializacao de sessoes WhatsApp para reduzir falhas de reconexao e manter o fluxo de envio mais estavel.",
      "Restaurado o scroll vertical da lateral Dados do contato no frontend de producao.",
      "Corrigido o roteamento das notificacoes de novos chats em Aguardando e Atendendo para respeitar responsavel, filas do usuario e permissao de ver todos.",
      "Adicionado modo de mensagem interna no composer: quando ativado, a mensagem fica visivel apenas para usuarios internos e nao e enviada ao cliente.",
      "Compatibilizadas permissoes antigas de conexao para que atendentes possam operar suas sessoes de WhatsApp por permissao de setor, sem precisar virar admin, mantendo a regra de visibilidade por proprietario salvo liberacao do administrador.",
    ],
  },
  {
    version: "2026.05.02 / Fase 1",
    label: "Base visual",
    summary:
      "Primeira camada do redesign visual com nova base de tema, estrutura e componentes compartilhados do frontend legado.",
    changes: [
      "Aplicado o redesign visual Samacom nas areas principais do frontend, com reforco da identidade em vermelho, preto, cinza e verde operacional.",
      "Refinados shell, sidebar, cabecalhos, espacamentos, bordas, botoes, modais e componentes compartilhados para padrao mais consistente.",
      "Ajustados wrappers, skeletons, cabecalho de conversa, informacoes do ticket e estrutura geral da aplicacao para preparar a nova linguagem visual.",
    ],
  },
  {
    version: "2026.05.02 / Fase 1B",
    label: "Reforco visual",
    summary:
      "A segunda onda intensificou o impacto do redesign e expandiu o padrao visual para as telas administrativas e de operacao.",
    changes: [
      "Padronizado o visual de varias telas no modelo de Clientes, incluindo Atalhos, Tags, Usuarios, Dialogos, Filas, Flows, Tarefas, Agendamentos, Arquivos, Campanhas, Integracoes e outras listas administrativas.",
      "Ajustado o Kanban para o novo padrao de cabecalho com busca, filtros e acao principal em duas linhas.",
      "Refinados arredondamentos, pesos, densidade visual e hierarquia entre botoes primarios e secundarios em modais e tabelas.",
      "Corrigido erro de tela branca apos login ao restaurar o import de clsx em MainListItems.",
    ],
  },
  {
    version: "2026.05.02 / Chats",
    label: "Melhoria funcional",
    summary:
      "O modulo de Chats recebeu ajuste funcional para operacao em lote e acabamento visual mais coerente com o restante do sistema.",
    changes: [
      "Implementada selecao em lote na aba Aguardando dos Chats, com selecionar todos, aceitar selecionados e excluir selecionados.",
      "Removidos restos de azul em areas criticas de Chats, tabs, switches, acoes da conversa e destaques do composer, alinhando a paleta aprovada.",
      "Reorganizado o cabecalho do gerenciador de tickets para ficar mais proximo do modelo aprovado em Clientes.",
    ],
  },
  {
    version: "2026.05.02 / Navegacao e conteudo",
    label: "Estrutura",
    summary:
      "A arquitetura de navegacao foi simplificada e o rodape do usuario passou a concentrar itens institucionais e de conta.",
    changes: [
      "Criado bloco de conta no rodape do menu lateral com email, perfil e atalhos rapidos para Informativos, Notas da versao, Perfil, Tema, Manual e LGPD.",
      "Movidos IA, API Admin e Integracoes do menu principal para abas internas de Configuracoes, preservando o conteudo real de cada modulo.",
      "Renomeado Ajustes para Configuracoes e reorganizada a navegacao para reduzir poluicao no menu principal.",
      "Criada a pagina LGPD com conteudo adaptado para o contexto do SamaChat e, agora, adicionadas as paginas Manual do sistema e Notas da versao.",
      "Detalhado o Manual com orientacao por modulo e fluxo por perfil: atendente, gestor e administrador.",
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
          <Title>Notas da versao</Title>
          <div className={classes.metaBlock}>
            <Typography className={classes.metaLine}>Historico de atualizacoes do frontend e da operacao</Typography>
          </div>
        </div>
        <div />
      </MainHeader>

      <div className={classes.content}>
        <Paper className={classes.introCard}>
          <Typography className={classes.noticeLabel}>Sobre esta pagina</Typography>
          <Typography className={classes.noticeText}>
            Esta area registra as alteracoes relevantes do sistema. Sempre que houver uma entrega importante,
            ela deve ser adicionada aqui para facilitar consulta, treinamento e rastreabilidade das mudancas.
          </Typography>
        </Paper>

        {releases.map(release => (
          <Paper key={release.version} className={classes.sectionCard}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Versao {release.version}
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