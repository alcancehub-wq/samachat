import { makeStyles } from "@material-ui/core";

// Estilos compartilhados da tela de Treinamento da IA. Tudo usa as cores do
// tema (claro/escuro) para o texto ficar legivel em qualquer um dos dois.
const useStyles = makeStyles(theme => ({
  paper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto"
  },
  card: {
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(0.5)
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.875rem",
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: "1.0625rem"
  },
  hint: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1.5),
    fontSize: "0.875rem",
    lineHeight: 1.5
  },
  row: {
    display: "flex",
    gap: theme.spacing(2),
    flexWrap: "wrap"
  },
  grow: {
    flex: "1 1 220px"
  },
  infoBox: {
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.action.hover,
    fontSize: "0.875rem",
    lineHeight: 1.55,
    marginTop: theme.spacing(1.5)
  },
  warnBox: {
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    border: `1px solid ${theme.palette.warning.main}`,
    fontSize: "0.875rem",
    lineHeight: 1.55,
    marginTop: theme.spacing(1.5)
  },
  choice: {
    flex: "1 1 260px",
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    border: `2px solid ${theme.palette.divider}`,
    cursor: "pointer",
    "&:hover": {
      borderColor: theme.palette.text.secondary
    }
  },
  choiceActive: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover
  },
  checklist: {
    marginTop: theme.spacing(1.5),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.75)
  },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontSize: "0.875rem"
  },
  ok: { color: theme.palette.success.main, fontWeight: 700 },
  pending: { color: theme.palette.warning.main, fontWeight: 700 },
  promptField: {
    "& textarea": {
      fontFamily: "monospace",
      fontSize: "0.8125rem",
      lineHeight: 1.5
    }
  },
  variables: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: theme.spacing(1)
  },
  chipRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: theme.spacing(1.5)
  },
  chatBox: {
    height: "50vh",
    minHeight: 300,
    overflowY: "auto",
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5)
  },
  bubbleLead: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    padding: theme.spacing(1, 1.5),
    borderRadius: 12,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    whiteSpace: "pre-wrap"
  },
  bubbleAgent: {
    alignSelf: "flex-start",
    maxWidth: "80%",
    padding: theme.spacing(1, 1.5),
    borderRadius: 12,
    backgroundColor: theme.palette.action.hover,
    border: `1px solid ${theme.palette.divider}`,
    whiteSpace: "pre-wrap"
  },
  toolChips: {
    alignSelf: "flex-start",
    display: "flex",
    gap: 6,
    flexWrap: "wrap"
  },
  composer: {
    display: "flex",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    alignItems: "center"
  },
  empty: {
    margin: "auto",
    textAlign: "center",
    color: theme.palette.text.secondary
  },
  sectionLabel: {
    fontWeight: 700,
    fontSize: "0.8125rem",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: theme.palette.text.secondary,
    margin: theme.spacing(2.5, 0, 1)
  }
}));

export default useStyles;
