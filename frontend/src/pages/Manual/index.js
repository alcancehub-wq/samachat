import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

const sections = [
  {
    title: "1. O que e o SamaChat",
    body: [
      "O SamaChat e a central operacional da Samacon para atendimento, organizacao comercial e acompanhamento de conversas em canais integrados, com foco principal no WhatsApp.",
      "A plataforma concentra tickets, clientes, filas, automacoes, campanhas, arquivos, tarefas e configuracoes administrativas em um unico ambiente.",
    ],
  },
  {
    title: "2. Como navegar",
    body: [
      "O menu lateral mostra os modulos liberados para o seu perfil. Alguns itens podem nao aparecer se sua permissao nao incluir acesso ao recurso.",
      "No rodape do menu lateral ficam os atalhos de conta: Informativos, Notas da versao, Perfil, Tema, Manual e LGPD.",
      "Use a busca e os filtros de cada tela para localizar registros rapidamente antes de editar, excluir ou iniciar novas operacoes.",
    ],
  },
  {
    title: "3. Chats",
    body: [
      "Para que serve: concentrar os atendimentos, organizar conversas por status e distribuir o trabalho da operacao.",
      "Como usar: acompanhe as abas de tickets abertos e aguardando, filtre por fila e tags, aceite tickets pendentes, responda a conversa e finalize quando o atendimento terminar.",
      "Quando houver varios tickets aguardando, use a selecao multipla para aceitar ou excluir em lote.",
    ],
  },
  {
    title: "4. Clientes",
    body: [
      "Para que serve: manter o cadastro de contatos que entram na operacao, com telefone, tags e historico de relacionamento.",
      "Como usar: pesquise pelo nome ou numero, filtre por tags, edite um cliente selecionado, exclua contatos em lote e use importar clientes para cargas maiores.",
    ],
  },
  {
    title: "5. Atalhos",
    body: [
      "Para que serve: criar respostas rapidas para padronizar mensagens e ganhar velocidade no atendimento.",
      "Como usar: cadastre um atalho com comando curto e mensagem pronta; depois utilize o comando durante a conversa para inserir o texto com rapidez.",
    ],
  },
  {
    title: "6. Kanban",
    body: [
      "Para que serve: visualizar e mover etapas operacionais em colunas, acompanhando o progresso de demandas e oportunidades.",
      "Como usar: filtre por fila, tag e responsavel, abra uma coluna quando precisar editar a configuracao e arraste os cards para atualizar o andamento das atividades.",
    ],
  },
  {
    title: "7. Tarefas e Agendamentos",
    body: [
      "Para que serve: controlar compromissos internos, pendencias e acoes programadas da equipe.",
      "Como usar: cadastre a tarefa ou agendamento, defina datas e responsaveis, acompanhe a listagem e atualize os registros conforme a execucao real acontecer.",
    ],
  },
  {
    title: "8. Arquivos",
    body: [
      "Para que serve: centralizar arquivos trafegados na operacao, com origem, ticket relacionado e contato associado.",
      "Como usar: pesquise pelo arquivo, abra o item para visualizacao, baixe quando necessario e use os atalhos de ticket ou contato para voltar ao contexto da conversa.",
    ],
  },
  {
    title: "9. Campanhas, Dialogos e Informativos",
    body: [
      "Campanhas: servem para comunicacoes em massa com lista, dialogo e agenda definida. Use para disparos planejados e acompanhe o status da execucao.",
      "Dialogos: servem para modelar o conteudo base usado em campanhas e fluxos. Mantenha os textos revisados antes de publicar.",
      "Informativos: servem para comunicacoes internas ou mensagens institucionais exibidas na plataforma. Atualize o publico e o periodo de exibicao antes de ativar.",
    ],
  },
  {
    title: "10. Tags, Filas e Listas de contatos",
    body: [
      "Tags: ajudam a classificar clientes, tickets e campanhas. Use nomes claros e padronizados para facilitar filtros e segmentacoes.",
      "Filas: organizam a distribuicao dos atendimentos entre equipes ou setores. Ajuste cor, ordem, usuarios e mensagem inicial conforme a operacao.",
      "Listas de contatos: agrupam clientes para segmentacao manual ou dinamica e apoiam campanhas e acoes recorrentes.",
    ],
  },
  {
    title: "11. Flows e Integracoes",
    body: [
      "Flows: servem para montar fluxos automatizados. Crie, publique e depois abra o construtor para manter a logica do atendimento automatizado.",
      "Integracoes: concentram conectores externos e webhooks. Use para ligar o SamaChat a outros sistemas, monitorar eventos e analisar logs de entrega.",
    ],
  },
  {
    title: "12. Usuarios, Conexoes e Configuracoes",
    body: [
      "Usuarios: servem para cadastrar pessoas da operacao, definir perfil e associar conexoes quando necessario.",
      "Conexoes: mostram os canais conectados e o estado operacional de cada integracao de mensageria.",
      "Configuracoes: centralizam ajustes gerais da plataforma e agora tambem reunem as abas de IA, API Admin e Integracoes em um unico local.",
    ],
  },
  {
    title: "13. IA, API Admin e LGPD",
    body: [
      "IA: use para configurar recursos de inteligencia artificial, automacoes assistidas, respostas e logs quando o modulo estiver habilitado.",
      "API Admin: use para consultar parametros administrativos e dados de integracao que exigem maior controle.",
      "LGPD: consulte esta area para revisar diretrizes de privacidade, bases legais e responsabilidade sobre o uso de dados dentro do SamaChat.",
    ],
  },
  {
    title: "14. Boas praticas de operacao",
    body: [
      "Mantenha tags, filas e cadastros padronizados para nao perder rastreabilidade.",
      "Antes de excluir registros em lote, revise os itens selecionados e confirme se eles nao serao mais usados por campanhas, historicos ou integracoes.",
      "Use Perfil e Tema no rodape para ajustar sua experiencia sem alterar a configuracao global da operacao.",
    ],
  },
  {
    title: "15. Fluxo recomendado para atendentes",
    body: [
      "Comece o turno verificando a aba Aguardando em Chats e aceite apenas os tickets que realmente vai conduzir.",
      "Durante o atendimento, use Atalhos, Tags e historico do cliente para manter velocidade e contexto.",
      "Ao concluir, resolva o ticket ou devolva para pendente quando depender de retorno do cliente ou de outra equipe.",
    ],
  },
  {
    title: "16. Fluxo recomendado para gestores",
    body: [
      "Acompanhe Chats, Kanban, Tarefas e Agendamentos para identificar gargalos, filas sobrecarregadas e prazos em risco.",
      "Revise campanhas, dialogos, informativos e listas de contatos para garantir consistencia de comunicacao.",
      "Use Configuracoes, Integracoes e relatórios operacionais do proprio fluxo para ajustar processos e distribuicao da equipe.",
    ],
  },
  {
    title: "17. Fluxo recomendado para administradores",
    body: [
      "Mantenha usuarios, perfis, filas, conexoes, tokens e integracoes revisados para evitar falhas de acesso ou operacao.",
      "Valide periodicamente as areas de IA, API Admin, Integracoes e LGPD para garantir seguranca, conformidade e estabilidade.",
      "Sempre registre mudancas importantes em Notas da versao para que a equipe saiba o que foi alterado e quando a alteracao entrou em uso.",
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
  metaLine: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.5,
  },
  headerBlock: {
    flex: "1 1 100%",
    minWidth: 0,
    marginRight: "auto",
    textAlign: "left",
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
  paragraph: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
    marginBottom: theme.spacing(1),
  },
}));

const Manual = () => {
  const classes = useStyles();

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerBlock}>
          <Title>Manual do SamaChat</Title>
          <div className={classes.metaBlock}>
            <Typography className={classes.metaLine}>Ultima atualizacao: 2026-05-02</Typography>
          </div>
        </div>
        <div />
      </MainHeader>

      <div className={classes.content}>
        <Paper className={classes.introCard}>
          <Typography className={classes.noticeLabel}>Como usar este manual</Typography>
          <Typography className={classes.noticeText}>
            Este guia resume para que serve cada area principal do SamaChat e qual o fluxo recomendado de uso.
            Consulte as secoes abaixo sempre que precisar treinar equipe, revisar processo ou localizar um modulo com rapidez.
          </Typography>
        </Paper>

        {sections.map(section => (
          <Paper key={section.title} className={classes.sectionCard}>
            <Typography variant="h6" className={classes.sectionTitle}>
              {section.title}
            </Typography>
            {section.body.map(paragraph => (
              <Typography key={paragraph} className={classes.paragraph}>
                {paragraph}
              </Typography>
            ))}
          </Paper>
        ))}
      </div>
    </MainContainer>
  );
};

export default Manual;