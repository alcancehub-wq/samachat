import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as SdrAgentController from "../controllers/SdrAgentController";
import * as SdrKnowledgeController from "../controllers/SdrKnowledgeController";

const sdrAgentRoutes = express.Router();

const view = [isAuth, checkSectorPermission("sdrAgent.view")];
const manage = [isAuth, checkSectorPermission("sdrAgent.manage")];

sdrAgentRoutes.get("/sdr-agent/settings", ...view, SdrAgentController.showSettings);
sdrAgentRoutes.put("/sdr-agent/settings", ...manage, SdrAgentController.updateSettings);
sdrAgentRoutes.post("/sdr-agent/simulate", ...manage, SdrAgentController.simulate);
sdrAgentRoutes.post("/sdr-agent/generate-prompt", ...manage, SdrAgentController.generatePrompt);

// Quem atende cada conversa (IA ou humano). Qualquer atendente pode consultar e
// passar a conversa: faz parte do atendimento do dia a dia, nao da configuracao.
sdrAgentRoutes.get("/sdr-agent/status", isAuth, SdrAgentController.publicStatus);
sdrAgentRoutes.get("/tickets/:ticketId/sdr-agent", isAuth, SdrAgentController.showTicketHandoff);
sdrAgentRoutes.put("/tickets/:ticketId/sdr-agent", isAuth, SdrAgentController.setTicketHandoff);

// Base de conhecimento
sdrAgentRoutes.get("/sdr-agent/knowledge", ...view, SdrKnowledgeController.index);
sdrAgentRoutes.post("/sdr-agent/knowledge", ...manage, SdrKnowledgeController.store);
sdrAgentRoutes.delete("/sdr-agent/knowledge/:id", ...manage, SdrKnowledgeController.remove);
sdrAgentRoutes.post("/sdr-agent/knowledge/search", ...manage, SdrKnowledgeController.search);

export default sdrAgentRoutes;
