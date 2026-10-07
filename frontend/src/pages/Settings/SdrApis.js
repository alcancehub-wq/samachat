import React from "react";

import { Paper, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import IntegrationForm from "./IntegrationForm";

const VOICES = [
  { value: "33B4UnXyTNbgLmdEDh5P", label: "Keren — feminina, brasileira (padrão)" },
  { value: "9BWtsMINqrJLrRacOk9x", label: "Aria — feminina, natural" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — feminina, suave" },
  { value: "FGY2WhTYpPnrIDTdsKH5", label: "Laura — feminina, expressiva" },
  { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda — feminina, calorosa" },
  { value: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger — masculina, confiante" },
  { value: "IKne3meq5aSn9XLyUdCD", label: "Charlie — masculina, casual" },
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — masculina, articulada" },
  { value: "bIHbv24MWmeRgasZH58o", label: "Will — masculina, amigável" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian — masculina, profunda" }
];

const VOICE_MODELS = [
  { value: "eleven_turbo_v2_5", label: "Turbo v2.5 (recomendado)" },
  { value: "eleven_turbo_v2", label: "Turbo v2" },
  { value: "eleven_multilingual_v2", label: "Multilingual v2" }
];

const ELEVENLABS_FIELDS = [
  { key: "apiKey", type: "secret", label: "Chave da API da ElevenLabs", full: true, required: true },
  { key: "voiceId", type: "select", label: "Voz", options: VOICES },
  { key: "model", type: "select", label: "Modelo", options: VOICE_MODELS },
  {
    key: "audioReply",
    type: "switch",
    label: "Responder em áudio quando o cliente mandar áudio",
    helper:
      "O agente entende o áudio (precisa da OpenAI ativa) e responde falando. Se a voz falhar, ele responde por texto."
  },
  { key: "stability", type: "slider", label: "Estabilidade", helper: "Mais alto = voz mais constante." },
  { key: "similarityBoost", type: "slider", label: "Semelhança com a voz original" },
  { key: "style", type: "slider", label: "Expressividade" },
  { key: "speakerBoost", type: "switch", label: "Reforçar a clareza da voz" }
];

const GEMINI_FIELDS = [
  { key: "apiKey", type: "secret", label: "Chave da API do Google (Gemini)", full: true, required: true },
  {
    key: "model",
    type: "select",
    label: "Modelo",
    full: true,
    options: [
      { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash — rápido e econômico (recomendado)" },
      { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro — respostas mais elaboradas" }
    ]
  }
];

const CLAUDE_FIELDS = [
  { key: "apiKey", type: "secret", label: "Chave da API da Anthropic (Claude)", full: true, required: true },
  {
    key: "model",
    type: "select",
    label: "Modelo",
    full: true,
    options: [
      { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — equilíbrio entre qualidade e custo (recomendado)" },
      { value: "claude-opus-5-5", label: "Claude Opus 5.5 — o mais capaz" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — rápido e econômico" }
    ]
  }
];

const useStyles = makeStyles(theme => ({
  note: {
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(2),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    fontSize: "0.875rem"
  },
  section: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  title: { fontWeight: 700, fontSize: "1rem" }
}));

const Section = ({ classes, title, description, children }) => (
  <Paper variant="outlined" className={classes.section}>
    <Typography className={classes.title}>{title}</Typography>
    {description && (
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
        {description}
      </Typography>
    )}
    {children}
  </Paper>
);

/*
 * Chaves das IAs e da voz usadas pelo agente SDR. Qual IA conversa com os leads
 * e escolha do agente (Treinamento da IA); aqui so se cadastram as chaves. A
 * OpenAI (e a transcricao de audio) continua na aba "IA".
 */
const SdrApis = () => {
  const classes = useStyles();
  return (
    <>
      <div className={classes.note}>
        As chaves ficam <strong>cifradas no servidor</strong> e nunca aparecem na tela depois de
        salvas: so o status em tempo real. A IA que responde aos clientes é escolhida em{" "}
        <strong>Treinamento da IA</strong>. A OpenAI e a transcrição de áudio ficam na aba IA.
      </div>
      <Section classes={classes} title="Claude (Anthropic)" description="Chave da sua conta da Anthropic.">
        <IntegrationForm provider="claude" title="Status" fields={CLAUDE_FIELDS} activeLabel="Disponibilizar o Claude ao agente" />
      </Section>
      <Section classes={classes} title="Gemini (Google)" description="Chave da sua conta do Google AI.">
        <IntegrationForm provider="gemini" title="Status" fields={GEMINI_FIELDS} activeLabel="Disponibilizar o Gemini ao agente" />
      </Section>
      <Section classes={classes} title="ElevenLabs (voz)" description="Voz que o agente usa para responder em áudio.">
        <IntegrationForm provider="elevenlabs" title="Status" fields={ELEVENLABS_FIELDS} activeLabel="Usar a ElevenLabs" />
      </Section>
    </>
  );
};

export default SdrApis;
