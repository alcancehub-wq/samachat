import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import api from "../../services/api";
import friendlyError from "./friendlyError";

const PRESET_CATEGORIES = [
  "Sobre a empresa",
  "Produtos e servicos",
  "Precos e planos",
  "Diferenciais",
  "Criterios de atendimento",
  "Perguntas frequentes",
  "Objecoes e respostas",
  "Politicas e garantias",
  "Outros"
];
const NEW_CATEGORY = "__new__";

const formatDate = value => {
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch (err) {
    return "";
  }
};

const KnowledgeBaseTab = ({ classes }) => {
  const [files, setFiles] = useState([]);
  const [maxChars, setMaxChars] = useState(90000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState("");
  const [content, setContent] = useState("");
  const fileInput = useRef(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/sdr-agent/knowledge");
      setFiles(data.files);
      setMaxChars(data.maxChars);
    } catch (err) {
      friendlyError(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Categorias para escolher: as padrao + as que o usuario ja criou.
  const categories = [
    ...PRESET_CATEGORIES,
    ...files.map(f => f.category).filter(c => c && !PRESET_CATEGORIES.includes(c))
  ].filter((c, i, all) => all.indexOf(c) === i);

  const chosenCategory = category === NEW_CATEGORY ? newCategory.trim() : category;

  const add = async () => {
    setSaving(true);
    try {
      await api.post("/sdr-agent/knowledge", { name, category: chosenCategory, content });
      toast.success("Documento adicionado a base.");
      setName("");
      setContent("");
      setNewCategory("");
      await load();
    } catch (err) {
      friendlyError(err);
    }
    setSaving(false);
  };

  const pickFile = event => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setName(prev => prev || file.name.replace(/\.[^.]+$/, ""));
      setContent(String(reader.result || ""));
    };
    reader.onerror = () => toast.error("Nao consegui ler o arquivo.");
    reader.readAsText(file, "UTF-8");
  };

  const remove = async file => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remover "${file.name}" da base de conhecimento?`)) return;
    try {
      await api.delete(`/sdr-agent/knowledge/${file.id}`);
      toast.success("Documento removido.");
      await load();
    } catch (err) {
      friendlyError(err);
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.post("/sdr-agent/knowledge/search", { query });
      setHits(data.hits);
    } catch (err) {
      friendlyError(err);
    }
    setSearching(false);
  };

  const tooLarge = content.length > maxChars;
  const canAdd = name.trim() && content.trim() && chosenCategory && !tooLarge && !saving;

  // Documentos agrupados por categoria (na ordem das categorias padrao).
  const grouped = categories
    .map(cat => ({ cat, items: files.filter(f => f.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      <Typography className={classes.hint}>
        Coloque aqui o que o agente precisa saber para responder bem. A cada mensagem do cliente, ele consulta
        a base e usa so os trechos relacionados a pergunta. Ele nao inventa o que nao estiver aqui nem no prompt.
      </Typography>

      <Paper className={classes.card} variant="outlined">
        <div className={classes.stepHeader}>
          <Typography className={classes.cardTitle}>Adicionar documento</Typography>
        </div>
        <Typography className={classes.hint}>
          De um titulo, escolha a categoria e cole o texto (ou envie um arquivo .txt, .md, .csv ou .json).
          Para PDF ou Word, copie o conteudo e cole aqui.
        </Typography>

        <div className={classes.row} style={{ marginBottom: 12 }}>
          <TextField
            className={classes.grow}
            variant="outlined"
            label="Titulo do documento"
            placeholder="Ex.: Historia da empresa"
            value={name}
            onChange={event => setName(event.target.value)}
          />
          <TextField
            select
            className={classes.grow}
            variant="outlined"
            label="Categoria"
            value={category}
            onChange={event => setCategory(event.target.value)}
          >
            {categories.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
            <MenuItem value={NEW_CATEGORY}>+ Criar nova categoria...</MenuItem>
          </TextField>
          {category === NEW_CATEGORY && (
            <TextField
              className={classes.grow}
              variant="outlined"
              label="Nome da nova categoria"
              value={newCategory}
              onChange={event => setNewCategory(event.target.value)}
            />
          )}
        </div>

        <TextField
          fullWidth
          multiline
          rows={8}
          variant="outlined"
          label="Conteudo"
          value={content}
          onChange={event => setContent(event.target.value)}
          error={tooLarge}
          helperText={`${content.length.toLocaleString("pt-BR")} / ${maxChars.toLocaleString("pt-BR")} caracteres${
            tooLarge ? " (grande demais: divida em partes)" : ""
          }`}
        />
        <div className={classes.row} style={{ marginTop: 12 }}>
          <Button variant="contained" color="primary" onClick={add} disabled={!canAdd}>
            {saving ? "Adicionando..." : "Adicionar a base"}
          </Button>
          <Button variant="outlined" onClick={() => fileInput.current.click()}>
            Enviar arquivo de texto
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.csv,.json,text/plain"
            style={{ display: "none" }}
            onChange={pickFile}
          />
        </div>
      </Paper>

      <Paper className={classes.card} variant="outlined">
        <div className={classes.stepHeader}>
          <Typography className={classes.cardTitle}>Documentos na base ({files.length})</Typography>
        </div>
        {loading && <CircularProgress size={20} />}
        {!loading && files.length === 0 && (
          <Typography className={classes.hint}>
            Nenhum documento ainda. O agente esta usando so o prompt.
          </Typography>
        )}
        {grouped.map(group => (
          <div key={group.cat}>
            <Typography className={classes.sectionLabel}>
              {group.cat} ({group.items.length})
            </Typography>
            {group.items.map(file => (
              <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography style={{ fontWeight: 600 }} noWrap>{file.name}</Typography>
                  <Typography className={classes.hint} style={{ margin: 0 }}>
                    {file.charCount.toLocaleString("pt-BR")} caracteres, {file.chunkCount} trecho(s), adicionado
                    em {formatDate(file.createdAt)}
                  </Typography>
                </div>
                <IconButton size="small" onClick={() => remove(file)} title="Remover">
                  <DeleteOutlineIcon />
                </IconButton>
              </div>
            ))}
          </div>
        ))}
      </Paper>

      <Paper className={classes.card} variant="outlined">
        <div className={classes.stepHeader}>
          <Typography className={classes.cardTitle}>Testar a busca</Typography>
        </div>
        <Typography className={classes.hint}>
          Digite uma pergunta de cliente e veja quais trechos o agente receberia.
        </Typography>
        <div className={classes.row}>
          <TextField
            className={classes.grow}
            variant="outlined"
            size="small"
            placeholder="Ex.: quanto custa? tem garantia?"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => event.key === "Enter" && search()}
          />
          <Button variant="outlined" onClick={search} disabled={searching || !query.trim() || files.length === 0}>
            {searching ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {hits && hits.length === 0 && (
          <Typography className={classes.hint} style={{ marginTop: 12 }}>
            Nenhum trecho relacionado. O agente responderia so com o prompt.
          </Typography>
        )}
        {hits &&
          hits.map((hit, index) => (
            <Paper key={index} variant="outlined" style={{ padding: 12, marginTop: 12 }}>
              <Typography className={classes.hint} style={{ margin: 0 }}>
                {hit.category} &middot; {hit.fileName} (relevancia {Math.round(hit.score * 100)}%)
              </Typography>
              <Typography style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>{hit.content}</Typography>
            </Paper>
          ))}
      </Paper>
    </>
  );
};

export default KnowledgeBaseTab;
