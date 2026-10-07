import React, { useEffect, useState } from "react";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Slider,
  TextField,
  Typography
} from "@material-ui/core";

import api from "../../services/api";
import friendlyError from "./friendlyError";

const ROLES = ["SDR", "Closer", "Atendimento", "Pos-venda (CS)"];
const TONES = [
  { value: "consultivo", label: "Consultivo (faz perguntas e orienta)" },
  { value: "amigavel", label: "Amigavel" },
  { value: "informal", label: "Informal" },
  { value: "formal", label: "Formal" },
  { value: "tecnico", label: "Tecnico" }
];
const ACTIONS = ["Agendar reuniao", "Agendar demonstracao", "Enviar proposta", "Passar para um vendedor"];

const emptyForm = (agentName, companyName) => ({
  sdr_name: agentName || "",
  role: "SDR",
  company_name: companyName || "",
  paper_type: "consultor amigo",
  personality: "Profissional, consultivo, empatico e focado em entender necessidades reais",
  tone: "consultivo",
  prohibited_terms: "girias, jargoes complexos, pressao por venda",
  philosophy_name: "Venda Consultiva",
  lead_talk_percentage: 80,
  max_lines: 3,
  products: "",
  differentials: "",
  conversion_action: "Agendar reuniao",
  tools: "consulta de horarios e agendamento com o closer"
});

// "Criar novo prompt com a IA": o usuario responde perguntas simples e a IA
// escreve o prompt mestre. O resultado so substitui o prompt se ele clicar em
// "Usar este prompt".
const PromptGeneratorDialog = ({ open, onClose, classes, agentName, companyName, hasPrompt, onUse }) => {
  const [form, setForm] = useState(emptyForm(agentName, companyName));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (open) {
      setForm(prev => ({
        ...prev,
        sdr_name: prev.sdr_name || agentName || "",
        company_name: prev.company_name || companyName || ""
      }));
    }
  }, [open, agentName, companyName]);

  const set = field => event => setForm(prev => ({ ...prev, [field]: event.target.value }));

  const missing = !form.sdr_name.trim() || !form.company_name.trim() || !form.products.trim() || !form.differentials.trim();

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/sdr-agent/generate-prompt", form, { timeout: 120000 });
      setResult(data.prompt);
    } catch (err) {
      friendlyError(err);
    }
    setLoading(false);
  };

  const use = () => {
    onUse(result);
    setResult("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>Criar novo prompt com a IA</DialogTitle>
      <DialogContent dividers>
        {!result && (
          <>
            <Typography className={classes.hint}>
              Responda as perguntas abaixo, de forma simples. A IA escreve o prompt mestre do seu agente
              com base nas suas respostas. Voce poderá revisar e editar antes de usar.
              {hasPrompt && " Ao usar o novo prompt, ele substitui o que esta escrito hoje."}
            </Typography>

            <Typography className={classes.sectionLabel}>1. Quem e o agente</Typography>
            <div className={classes.row}>
              <TextField className={classes.grow} required label="Nome do agente" variant="outlined" size="small"
                value={form.sdr_name} onChange={set("sdr_name")} placeholder="Ex.: Bia" />
              <TextField className={classes.grow} required label="Nome da empresa" variant="outlined" size="small"
                value={form.company_name} onChange={set("company_name")} placeholder="Ex.: Sua Empresa" />
              <TextField select className={classes.grow} label="Funcao" variant="outlined" size="small"
                value={form.role} onChange={set("role")}>
                {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField className={classes.grow} label="Postura (como ele age)" variant="outlined" size="small"
                value={form.paper_type} onChange={set("paper_type")} placeholder="Ex.: consultor amigo" />
            </div>

            <Typography className={classes.sectionLabel}>2. Personalidade e jeito de falar</Typography>
            <TextField fullWidth multiline rows={2} label="Personalidade" variant="outlined" size="small"
              value={form.personality} onChange={set("personality")} style={{ marginBottom: 12 }} />
            <div className={classes.row}>
              <TextField select className={classes.grow} label="Tom de voz" variant="outlined" size="small"
                value={form.tone} onChange={set("tone")}>
                {TONES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField className={classes.grow} label="O que ele NUNCA deve fazer ou falar" variant="outlined" size="small"
                value={form.prohibited_terms} onChange={set("prohibited_terms")} placeholder="Ex.: girias, pressionar o cliente" />
            </div>

            <Typography className={classes.sectionLabel}>3. Estilo de venda</Typography>
            <TextField fullWidth label="Nome do metodo de venda" variant="outlined" size="small"
              value={form.philosophy_name} onChange={set("philosophy_name")} placeholder="Ex.: Venda Consultiva"
              style={{ marginBottom: 12 }} />
            <Typography variant="body2">
              Quanto o cliente deve falar na conversa: <b>{form.lead_talk_percentage}%</b>
            </Typography>
            <Slider min={50} max={90} step={5} value={form.lead_talk_percentage}
              onChange={(e, v) => setForm(prev => ({ ...prev, lead_talk_percentage: v }))} />
            <Typography variant="body2">
              Tamanho das respostas (linhas por mensagem): <b>{form.max_lines}</b>
            </Typography>
            <Slider min={2} max={6} step={1} value={form.max_lines}
              onChange={(e, v) => setForm(prev => ({ ...prev, max_lines: v }))} />

            <Typography className={classes.sectionLabel}>4. O que voce vende</Typography>
            <TextField required fullWidth multiline rows={4} label="Produtos e servicos (com valores e prazos)"
              variant="outlined" size="small" value={form.products} onChange={set("products")}
              placeholder={"- Produto A: de R$ X a R$ Y (prazo Z). Serve para...\n- Produto B: ..."}
              style={{ marginBottom: 12 }} />
            <TextField required fullWidth multiline rows={3} label="Diferenciais (por que escolher voce)"
              variant="outlined" size="small" value={form.differentials} onChange={set("differentials")}
              placeholder={"- Diferencial 1: ...\n- Diferencial 2: ..."} />

            <Typography className={classes.sectionLabel}>5. Objetivo da conversa</Typography>
            <div className={classes.row}>
              <TextField select className={classes.grow} label="Qual e o objetivo final?" variant="outlined" size="small"
                value={form.conversion_action} onChange={set("conversion_action")}>
                {ACTIONS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </TextField>
              <TextField className={classes.grow} label="Ferramentas que ele pode usar" variant="outlined" size="small"
                value={form.tools} onChange={set("tools")} helperText="Consulta de horarios, agendamento com o closer e passagem para humano ja vem prontas" />
            </div>
          </>
        )}

        {result && (
          <>
            <Typography className={classes.hint}>
              Prompt gerado. Leia, ajuste o que quiser e clique em <b>Usar este prompt</b>.
            </Typography>
            <TextField className={classes.promptField} fullWidth multiline rows={22} variant="outlined"
              value={result} onChange={event => setResult(event.target.value)} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        {loading && (
          <Typography className={classes.hint} style={{ margin: "0 auto 0 16px" }}>
            <CircularProgress size={14} /> &nbsp;Escrevendo o prompt... leva cerca de 20 segundos.
          </Typography>
        )}
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        {result ? (
          <>
            <Button onClick={() => setResult("")} disabled={loading}>Voltar e ajustar</Button>
            <Button variant="outlined" onClick={generate} disabled={loading}>Gerar de novo</Button>
            <Button variant="contained" color="primary" onClick={use}>Usar este prompt</Button>
          </>
        ) : (
          <Button variant="contained" color="primary" onClick={generate} disabled={loading || missing}>
            Gerar prompt
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PromptGeneratorDialog;
