import React, { useState } from "react";
import { useHistory } from "react-router-dom";

import {
  Button,
  Chip,
  Collapse,
  MenuItem,
  Paper,
  Slider,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";

import PromptGeneratorDialog from "./PromptGeneratorDialog";

const MODELS = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini", note: "Rapido e economico. Tende a errar em contas e em conversas longas." },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini", note: "Equilibrado entre custo e qualidade." },
  { value: "gpt-4o", label: "gpt-4o", note: "Mais preciso. Boa escolha para vendas." },
  { value: "gpt-4.1", label: "gpt-4.1", note: "Entre os mais precisos. Custa mais por resposta." }
];

const VARIABLES = [
  ["{{ data_hora }}", "data e hora atuais"],
  ["{{ dia_semana }}", "dia da semana"],
  ["{{ cliente_nome }}", "nome do cliente"],
  ["{{ cliente_telefone }}", "telefone do cliente"],
  ["{{ empresa }}", "nome da empresa"]
];

const digitsOnly = value => String(value || "").replace(/\D/g, "");

const formatPhone = digits => {
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return digits;
};

const parseNumbers = text =>
  String(text || "")
    .split(/[,;\r\n]+/)
    .map(digitsOnly)
    .filter(d => d.length >= 8);

const Step = ({ classes, number, title, children }) => (
  <Paper className={classes.card} variant="outlined">
    <div className={classes.stepHeader}>
      <div className={classes.stepNumber}>{number}</div>
      <Typography className={classes.cardTitle}>{title}</Typography>
    </div>
    {children}
  </Paper>
);

const Check = ({ classes, ok, children }) => (
  <div className={classes.checkItem}>
    <span className={ok ? classes.ok : classes.pending}>{ok ? "✓" : "!"}</span>
    <span>{children}</span>
  </div>
);

const AgentTab = ({ classes, form, setField, change, engines, dirty, save }) => {
  const history = useHistory();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [newNumber, setNewNumber] = useState("");

  const hasPrompt = Boolean(form.systemPrompt.trim());
  const numbers = parseNumbers(form.allowedNumbers);
  const modelNote = (MODELS.find(m => m.value === form.model) || {}).note;

  const addNumber = () => {
    const digits = digitsOnly(newNumber);
    if (digits.length < 8) return;
    if (!numbers.includes(digits)) setField("allowedNumbers", [...numbers, digits].join("\n"));
    setNewNumber("");
  };

  const removeNumber = digits =>
    setField("allowedNumbers", numbers.filter(n => n !== digits).join("\n"));

  // A IA que conversa com os leads e escolha deste agente. Sem escolha, vale a
  // primeira disponivel.
  const available = engines.filter(e => e.active);
  const selected = form.aiEngine ? engines.find(e => e.id === form.aiEngine) : available[0];
  const ai = {
    connected: Boolean(selected && selected.active),
    engine: selected ? selected.id : null,
    label: selected ? selected.label : null,
    anyKey: engines.some(e => e.configured)
  };
  const aiLabel = ai.connected
    ? `IA conectada: ${ai.label}`
    : form.aiEngine
    ? `${(selected && selected.label) || form.aiEngine} escolhida, mas sem chave ligada`
    : ai.anyKey
    ? "IA com chave cadastrada, mas nenhuma ligada"
    : "Nenhuma IA configurada";

  return (
    <>
      {/* 1 --------------------------------------------------------------- */}
      <Step classes={classes} number="1" title="Ligar o agente">
        <Typography className={classes.hint}>
          Ligado, o agente responde seus clientes pelo WhatsApp seguindo as regras abaixo.
          Desligado, o chat funciona normalmente, so com a sua equipe.
        </Typography>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Switch color="primary" checked={form.isEnabled} onChange={change("isEnabled")} />
          <Typography style={{ fontWeight: 700 }}>
            {form.isEnabled ? "Agente LIGADO" : "Agente desligado"}
          </Typography>
        </div>

        <div className={classes.checklist}>
          <Check classes={classes} ok={hasPrompt}>
            Prompt mestre criado {hasPrompt ? "" : "(passo 4)"}
          </Check>
          <Check classes={classes} ok={ai.connected}>
            {aiLabel} {ai.connected ? "" : "(passo 5)"}
          </Check>
        </div>
        {form.isEnabled && (!hasPrompt || !ai.connected) && (
          <div className={classes.warnBox}>
            O agente esta ligado, mas ainda nao consegue responder: complete os itens marcados com "!" acima.
          </div>
        )}
      </Step>

      {/* 2 --------------------------------------------------------------- */}
      <Step classes={classes} number="2" title="Quem atende primeiro quando chega uma conversa nova?">
        <Typography className={classes.hint}>
          Escolha o que acontece quando um cliente manda a primeira mensagem.
        </Typography>
        <div className={classes.row}>
          {[
            {
              value: true,
              title: "A IA atende primeiro",
              text: "Toda conversa nova e atendida pelo agente. Voce assume quando quiser."
            },
            {
              value: false,
              title: "Minha equipe atende primeiro",
              text: "A IA so entra nas conversas em que voce clicar em \"IA\" dentro do atendimento."
            }
          ].map(option => (
            <div
              key={String(option.value)}
              role="button"
              tabIndex={0}
              className={`${classes.choice} ${form.autoEnableForNewTickets === option.value ? classes.choiceActive : ""}`}
              onClick={() => setField("autoEnableForNewTickets", option.value)}
              onKeyDown={e => e.key === "Enter" && setField("autoEnableForNewTickets", option.value)}
            >
              <Typography style={{ fontWeight: 700 }}>
                {form.autoEnableForNewTickets === option.value ? "● " : "○ "}
                {option.title}
              </Typography>
              <Typography className={classes.hint} style={{ margin: 0 }}>{option.text}</Typography>
            </div>
          ))}
        </div>
        <div className={classes.infoBox}>
          <b>Como assumir ou devolver uma conversa:</b> abra o atendimento em <b>Atendimentos</b> e use o
          botao <b>IA | Humano</b> no topo. Quando um atendente aceita a conversa, a IA para sozinha.
          Para a IA voltar, clique em <b>IA</b>.
        </div>
      </Step>

      {/* 3 --------------------------------------------------------------- */}
      <Step classes={classes} number="3" title="Personalize o agente">
        <Typography className={classes.hint}>Como o agente se apresenta aos clientes.</Typography>
        <div className={classes.row}>
          <TextField className={classes.grow} label="Nome do agente" variant="outlined" value={form.agentName}
            onChange={change("agentName")} placeholder="Ex.: Bia" />
          <TextField className={classes.grow} label="Nome da empresa" variant="outlined" value={form.companyName}
            onChange={change("companyName")} placeholder="Ex.: Sua Empresa" />
        </div>
      </Step>

      {/* 4 --------------------------------------------------------------- */}
      <Step classes={classes} number="4" title="Prompt mestre">
        <Typography className={classes.hint}>
          E o treinamento do agente: como ele fala, o que pergunta, o que nunca faz e como conduz o cliente
          ate o objetivo. Sem prompt, o agente nao responde.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setGeneratorOpen(true)} style={{ marginBottom: 12 }}>
          Criar novo prompt com a IA
        </Button>
        <TextField
          className={classes.promptField}
          fullWidth
          multiline
          rows={hasPrompt ? 18 : 6}
          variant="outlined"
          placeholder="Escreva o prompt aqui, cole um que voce ja tem ou clique em 'Criar novo prompt com a IA'."
          value={form.systemPrompt}
          onChange={change("systemPrompt")}
          helperText={`${form.systemPrompt.length.toLocaleString("pt-BR")} caracteres`}
        />
      </Step>

      {/* 5 --------------------------------------------------------------- */}
      <Step classes={classes} number="5" title="Inteligencia artificial">
        <Typography className={classes.hint}>
          Escolha qual IA escreve as respostas <b>deste agente</b>. Cada IA usa a <b>chave da sua conta</b>
          (cadastrada em Configuracoes &gt; APIs) e consome creditos dela.
        </Typography>
        <TextField
          select
          fullWidth
          label="IA do agente"
          variant="outlined"
          value={form.aiEngine}
          onChange={change("aiEngine")}
          style={{ marginBottom: 12 }}
          helperText={aiLabel}
        >
          <MenuItem value="">Automatica (primeira IA disponivel)</MenuItem>
          {engines.map(e => (
            <MenuItem key={e.id} value={e.id} disabled={!e.active}>
              {e.label}{e.active ? "" : e.configured ? " (desligada)" : " (sem chave)"}
            </MenuItem>
          ))}
        </TextField>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Button variant="outlined" size="small" onClick={() => history.push("/settings?secao=apis")}>
            Cadastrar ou trocar chaves (Configuracoes &gt; APIs)
          </Button>
        </div>
        {ai.engine === "openai" ? (
          <TextField
            select
            fullWidth
            label="Modelo de IA"
            variant="outlined"
            value={form.model}
            onChange={change("model")}
            helperText={modelNote || "Vazio = usa o modelo escolhido na configuracao da OpenAI"}
          >
            <MenuItem value="">Padrao da configuracao da OpenAI</MenuItem>
            {MODELS.map(m => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
            {form.model && !MODELS.some(m => m.value === form.model) && (
              <MenuItem value={form.model}>{form.model}</MenuItem>
            )}
          </TextField>
        ) : (
          ai.connected && (
            <Typography className={classes.hint}>
              O modelo do {ai.label} e escolhido em Configuracoes &gt; APIs.
            </Typography>
          )
        )}
      </Step>

      {/* 6 --------------------------------------------------------------- */}
      <Step classes={classes} number="6" title="Modo teste">
        <Typography className={classes.hint}>
          Teste o agente sem risco. Com o modo teste ligado, a IA responde <b>somente aos numeros da lista</b>:
          todos os outros clientes continuam sendo atendidos so pela sua equipe.
        </Typography>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Switch color="primary" checked={form.testMode} onChange={change("testMode")} />
          <Typography style={{ fontWeight: 700 }}>
            {form.testMode ? "Modo teste LIGADO" : "Modo teste desligado"}
          </Typography>
        </div>

        <Collapse in={form.testMode} unmountOnExit>
          <Typography className={classes.sectionLabel}>Numeros que a IA vai atender</Typography>
          <div className={classes.row} style={{ alignItems: "center" }}>
            <TextField
              className={classes.grow}
              variant="outlined"
              size="small"
              label="Telefone com DDD"
              placeholder="Ex.: 11 99999-8888"
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addNumber())}
            />
            <Button variant="outlined" onClick={addNumber} disabled={digitsOnly(newNumber).length < 8}>
              Adicionar numero
            </Button>
          </div>
          <div className={classes.chipRow}>
            {numbers.length === 0 && (
              <Typography className={classes.hint} style={{ margin: 0 }}>
                Nenhum numero ainda. Com o modo teste ligado e a lista vazia, a IA nao atende ninguem.
              </Typography>
            )}
            {numbers.map(n => (
              <Chip key={n} label={formatPhone(n)} onDelete={() => removeNumber(n)} />
            ))}
          </div>
        </Collapse>
      </Step>

      {/* 7 --------------------------------------------------------------- */}
      <Paper className={classes.card} variant="outlined">
        <div
          role="button"
          tabIndex={0}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setAdvancedOpen(open => !open)}
          onKeyDown={e => e.key === "Enter" && setAdvancedOpen(open => !open)}
        >
          <Typography className={classes.cardTitle}>Configuracoes avancadas</Typography>
          <Typography className={classes.hint} style={{ margin: 0 }}>
            {advancedOpen ? "Esconder" : "Mostrar (nao precisa mexer para comecar)"}
          </Typography>
        </div>
        <Collapse in={advancedOpen} unmountOnExit>
          <div style={{ marginTop: 16 }}>
            <Typography style={{ fontWeight: 600 }}>
              Tempo de espera antes de responder: {form.replyDelaySeconds} s
            </Typography>
            <Typography className={classes.hint}>
              O cliente costuma mandar varias mensagens curtas seguidas. O agente espera esse tempo para ler tudo
              e responder uma vez so.
            </Typography>
            <Slider min={0} max={30} step={1} value={Number(form.replyDelaySeconds)}
              onChange={(e, v) => setField("replyDelaySeconds", v)} valueLabelDisplay="auto" />

            <Typography style={{ fontWeight: 600, marginTop: 16 }}>
              Memoria da conversa: {form.maxHistoryMessages} mensagens
            </Typography>
            <Typography className={classes.hint}>
              Quantas mensagens recentes o agente relê antes de responder. Mais mensagens ajudam em conversas
              longas, mas custam mais.
            </Typography>
            <Slider min={4} max={60} step={2} value={Number(form.maxHistoryMessages)}
              onChange={(e, v) => setField("maxHistoryMessages", v)} valueLabelDisplay="auto" />

            <Typography style={{ fontWeight: 600, marginTop: 16 }}>
              Acoes por resposta: ate {form.maxToolRounds}
            </Typography>
            <Typography className={classes.hint}>
              Quantas vezes o agente pode usar o CRM (consultar horarios, agendar, avancar etapa...) antes de responder ao
              cliente. O normal e 5.
            </Typography>
            <Slider min={1} max={10} step={1} value={Number(form.maxToolRounds)}
              onChange={(e, v) => setField("maxToolRounds", v)} valueLabelDisplay="auto" />

            <Typography style={{ fontWeight: 600, marginTop: 16 }}>Criatividade</Typography>
            <Typography className={classes.hint}>
              Mais baixa = respostas mais previsiveis. Mais alta = respostas mais variadas. Em branco usa o padrao.
            </Typography>
            <TextField variant="outlined" size="small" type="number" label="0 a 2 (ex.: 0.7)"
              inputProps={{ min: 0, max: 2, step: 0.1 }} value={form.temperature} onChange={change("temperature")} />
          </div>
        </Collapse>
      </Paper>

      <PromptGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        classes={classes}
        agentName={form.agentName}
        companyName={form.companyName}
        hasPrompt={hasPrompt}
        onUse={prompt => setField("systemPrompt", prompt)}
      />
    </>
  );
};

export default AgentTab;
