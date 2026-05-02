import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

const sections = [
  {
    title: "1. Identificacao",
    body: [
      "Samacon Consultoria e Assessoria em Consorcios (CNPJ 42.026.466/0001-06) opera o SamaChat e atua como operadora dos dados pessoais tratados na plataforma, conforme as instrucoes do Controlador.",
    ],
  },
  {
    title: "2. Escopo do documento",
    body: [
      "Este documento consolida Politica de Privacidade, Bases Legais e Termos de Uso aplicaveis ao SamaChat, considerando a LGPD (Lei 13.709/2018). Ele se aplica ao uso da plataforma por clientes, usuarios internos, atendentes, gestores e parceiros autorizados.",
    ],
  },
  {
    title: "3. Papeis e responsabilidades",
    body: [
      "Controlador: a organizacao usuaria do SamaChat, responsavel pelas decisoes sobre o tratamento dos dados inseridos ou coletados em seus fluxos de atendimento.",
      "Operador: Samacon, que processa os dados para disponibilizar a plataforma, hospedar a operacao, manter a seguranca e executar rotinas tecnicas do servico.",
      "Encarregado (DPO): canal indicado pelo Controlador ou, quando aplicavel, pelos contatos listados neste documento.",
    ],
  },
  {
    title: "4. Coleta e tipos de dados",
    body: [
      "Dados de conta e autenticacao: nome, email, perfil de acesso, permissoes, logs de sessao e trilhas de auditoria.",
      "Dados operacionais do atendimento: contatos, numeros de telefone, filas, tags, usuarios responsaveis, historico de tickets, status e interacoes registradas na plataforma.",
      "Conteudo de comunicacoes: mensagens de texto, anexos, imagens, documentos, audios, contatos compartilhados e outras midias trocadas em canais integrados, especialmente WhatsApp.",
      "Dados tecnicos e de seguranca: enderecos IP, eventos de acesso, logs de erros, auditoria administrativa, integracoes, webhooks e registros de sincronizacao.",
      "Dados de automacao e assistencia: parametros de IA, prompts, reescritas, sugestoes, classificacoes, sumarios e logs de uso quando os modulos correspondentes estiverem ativos.",
      "O SamaChat nao exige dados sensiveis por padrao. Caso o Controlador os trate na plataforma, devera assegurar base legal adequada, minimizacao e salvaguardas compativeis com a natureza desses dados.",
    ],
  },
  {
    title: "5. Finalidades de uso",
    body: [
      "Operar o atendimento omnichannel e os recursos do SamaChat, incluindo tickets, filas, usuarios, automacoes, campanhas, respostas rapidas e historicos.",
      "Executar comunicacoes com clientes e leads em canais integrados, especialmente WhatsApp, com controle operacional e rastreabilidade.",
      "Apoiar atendimento, vendas, suporte, monitoramento de qualidade e acompanhamento gerencial.",
      "Garantir seguranca, prevencao a fraudes, integridade da conta, continuidade do servico e resiliencia operacional.",
      "Cumprir obrigacoes legais, regulatórias e contratuais, alem de permitir o exercicio regular de direitos em processos administrativos, arbitrais ou judiciais.",
    ],
  },
  {
    title: "6. Bases legais (LGPD)",
    body: [
      "O tratamento pode ocorrer com fundamento em uma ou mais hipoteses legais, conforme o caso concreto:",
      "Execucao de contrato ou de procedimentos preliminares relacionados ao contrato (art. 7, V).",
      "Cumprimento de obrigacao legal ou regulatoria (art. 7, II).",
      "Legitimo interesse do Controlador, observados os direitos e liberdades fundamentais do titular (art. 7, IX).",
      "Exercicio regular de direitos em processo judicial, administrativo ou arbitral (art. 7, VI).",
      "Consentimento, quando necessario para finalidades especificas ou integracoes que o exijam (art. 7, I).",
    ],
  },
  {
    title: "7. Compartilhamento",
    body: [
      "Os dados nao sao vendidos. O compartilhamento ocorre apenas quando necessario para a operacao do SamaChat, com provedores de infraestrutura, servicos de hospedagem, monitoramento, mensageria, IA, webhooks e integracoes autorizadas pelo Controlador.",
      "Sempre que possivel, o compartilhamento e limitado ao minimo necessario para a finalidade contratada.",
    ],
  },
  {
    title: "8. Cookies e tecnologia",
    body: [
      "A plataforma pode utilizar cookies, armazenamento local e tecnologias similares para manter sessao, autenticacao, preferencias de uso, desempenho, estabilidade e seguranca.",
      "O usuario pode ajustar permissoes no navegador, observadas as limitacoes tecnicas decorrentes dessa escolha.",
    ],
  },
  {
    title: "9. Seguranca e armazenamento",
    body: [
      "Sao adotadas medidas tecnicas e administrativas aptas a proteger os dados pessoais contra acessos nao autorizados, destruicao, perda, alteracao, comunicacao ou qualquer forma de tratamento inadequado ou ilicito.",
      "Os dados sao armazenados pelo periodo necessario ao atendimento das finalidades da plataforma, a execucao contratual, a continuidade operacional e ao cumprimento de obrigacoes legais ou regulatorias.",
    ],
  },
  {
    title: "10. Direitos do titular",
    body: [
      "O titular pode solicitar confirmacao do tratamento, acesso, correcao, anonimização quando cabivel, portabilidade, eliminacao, informacoes sobre compartilhamento e revogacao de consentimento, nos termos da LGPD.",
      "As solicitacoes devem ser encaminhadas, preferencialmente, ao administrador da organizacao Controladora, que e quem define as finalidades e os meios do tratamento no contexto de uso do SamaChat.",
    ],
  },
  {
    title: "11. Termos de uso do SamaChat",
    body: [
      "O uso da plataforma deve ser licito, relacionado a atividades empresariais legitimas e em conformidade com a legislacao aplicavel.",
      "O usuario deve fornecer informacoes corretas, manter credenciais seguras e respeitar perfis de permissao e segregacao de acesso.",
      "E proibida a reproducao, distribuicao ou uso indevido de conteudos, codigo, estrutura ou materiais da plataforma sem autorizacao da Samacon.",
      "O SamaChat e uma plataforma de apoio operacional para comunicacao, automacao e gestao de atendimentos, nao substituindo analise juridica, regulatoria ou tecnica especializada.",
    ],
  },
  {
    title: "12. Alteracoes",
    body: [
      "Este documento pode ser atualizado para refletir evolucoes da plataforma, exigencias legais ou ajustes operacionais. Recomendamos consulta periodica a esta pagina.",
    ],
  },
  {
    title: "13. Contato",
    body: [
      "Privacidade: privacidade@samacon.com.br",
      "LGPD: lgpd@samacon.com.br",
      "Telefone: (11) 97842-4212",
      "Site: www.samacon.com.br",
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

const Lgpd = () => {
  const classes = useStyles();

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerBlock}>
          <Title>LGPD e Bases Legais</Title>
          <div className={classes.metaBlock}>
            <Typography className={classes.metaLine}>Ultima atualizacao: 2025-10-01</Typography>
          </div>
        </div>
        <div />
      </MainHeader>

      <div className={classes.content}>
        <Paper className={classes.introCard}>
          <Typography className={classes.noticeLabel}>Aviso</Typography>
          <Typography className={classes.noticeText}>
            Este documento consolida Politica de Privacidade e Termos de Uso aplicaveis ao SamaChat.
            Para necessidades juridicas especificas, valide o conteudo com o juridico da sua organizacao.
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

export default Lgpd;