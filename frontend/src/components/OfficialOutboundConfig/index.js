import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const extractParameters = component => {
  const matches = String(component?.text || "").match(/{{\d+}}/g) || [];
  return matches.map((placeholder, index) => ({
    key: `${component.type}-${index}`,
    type: component.type,
    index: index + 1,
    label: `${component.type === "HEADER" ? "Cabeçalho" : "Mensagem"} - variável ${index + 1}`,
    placeholder
  }));
};

const buildTemplateComponents = (template, values) => {
  const grouped = (template?.components || []).reduce((result, component) => {
    const parameters = extractParameters(component).map(parameter => ({
      type: "text",
      text: values[parameter.key] || ""
    }));
    if (parameters.length) result.push({ type: component.type.toLowerCase(), parameters });
    return result;
  }, []);
  return JSON.stringify(grouped);
};

const OfficialOutboundConfig = ({ value, onChange, requireQueue = true }) => {
  const [connections, setConnections] = useState([]);
  const [queues, setQueues] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState({});

  useEffect(() => {
    if (value.outboundMode !== "OFFICIAL") return;
    api.get("/meta-message-templates/authorized-connections")
      .then(connectionResponse => {
        setConnections((connectionResponse.data || []).filter(connection => connection.providerType === "official"));
      })
      .catch(toastError);
    api.get("/queue").then(response => setQueues(response.data || [])).catch(() => setQueues([]));
  }, [value.outboundMode]);

  useEffect(() => {
    if (!value.deliveryWhatsappId) {
      setTemplates([]);
      return;
    }
    api.get(`/meta-message-templates/${value.deliveryWhatsappId}`)
      .then(response => setTemplates((response.data?.data || response.data || []).filter(template => String(template.status).toUpperCase() === "APPROVED")))
      .catch(toastError);
  }, [value.deliveryWhatsappId]);

  const selectedTemplate = templates.find(template => template.name === value.templateName && template.language === value.templateLanguage);
  const parameters = (selectedTemplate?.components || []).flatMap(extractParameters);
  const update = patch => onChange({ ...value, ...patch });

  return (
    <>
      <FormControl fullWidth margin="dense" variant="outlined">
        <InputLabel>Tipo de envio</InputLabel>
        <Select value={value.outboundMode || "STANDARD"} onChange={event => update({ outboundMode: event.target.value })} label="Tipo de envio">
          <MenuItem value="STANDARD">Envio padrão</MenuItem>
          <MenuItem value="OFFICIAL">WhatsApp Oficial</MenuItem>
        </Select>
      </FormControl>
      {value.outboundMode === "OFFICIAL" && <>
        {requireQueue && <FormControl fullWidth margin="dense" variant="outlined">
          <InputLabel>Setor responsável</InputLabel>
          <Select value={value.ownerQueueId || ""} onChange={event => update({ ownerQueueId: event.target.value })} label="Setor responsável">
            <MenuItem value="">Selecione o setor responsável</MenuItem>
            {queues.map(queue => <MenuItem key={queue.id} value={queue.id}>{queue.name}</MenuItem>)}
          </Select>
        </FormControl>}
        <FormControl fullWidth margin="dense" variant="outlined" disabled={requireQueue && !value.ownerQueueId}>
          <InputLabel>Número oficial</InputLabel>
          <Select value={value.deliveryWhatsappId || ""} onChange={event => update({ deliveryWhatsappId: event.target.value, templateName: "", templateLanguage: "", templateComponents: "" })} label="Número oficial">
            <MenuItem value="">Selecione o número oficial</MenuItem>
            {connections.map(connection => <MenuItem key={connection.id} value={connection.id}>{[connection.name, connection.phoneNumber].filter(Boolean).join(" - ")}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense" variant="outlined" disabled={!value.deliveryWhatsappId}>
          <InputLabel>Modelo de mensagem</InputLabel>
          <Select value={selectedTemplate ? `${selectedTemplate.name}:${selectedTemplate.language}` : ""} onChange={event => { const template = templates.find(item => `${item.name}:${item.language}` === event.target.value); setVariables({}); update({ templateName: template?.name || "", templateLanguage: template?.language || "", templateComponents: "" }); }} label="Modelo de mensagem">
            <MenuItem value="">Selecione um modelo de mensagem</MenuItem>
            {templates.map(template => <MenuItem key={`${template.name}:${template.language}`} value={`${template.name}:${template.language}`}>{[template.name, template.category, template.language].filter(Boolean).join(" - ")}</MenuItem>)}
          </Select>
        </FormControl>
        {parameters.length > 0 && <><Typography variant="subtitle2" style={{ marginTop: 12 }}>Variáveis da mensagem</Typography>{parameters.map(parameter => <TextField key={parameter.key} label={parameter.label} fullWidth variant="outlined" margin="dense" value={variables[parameter.key] || ""} onChange={event => { const nextVariables = { ...variables, [parameter.key]: event.target.value }; setVariables(nextVariables); update({ templateComponents: buildTemplateComponents(selectedTemplate, nextVariables) }); }} required />)}</>}
        {selectedTemplate?.components?.some(component => component.text) && <><Typography variant="subtitle2" style={{ marginTop: 12 }}>Prévia da mensagem</Typography><Typography variant="body2">{selectedTemplate.components.filter(component => component.text).map(component => component.text.replace(/{{(\d+)}}/g, (_, index) => variables[`${component.type}-${Number(index) - 1}`] || `{{${index}}}`)).join("\n")}</Typography></>}
      </>}
    </>
  );
};

export default OfficialOutboundConfig;