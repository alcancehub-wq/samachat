import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

const releases = [
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