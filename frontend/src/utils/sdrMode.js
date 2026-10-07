const digits = value => String(value || "").replace(/\D/g, "");

// Quem esta atendendo a conversa, para mostrar "IA" ou "Humano" na lista.
// Espelha a regra do backend (policy.ts), so que sem consultar a API a cada
// conversa. Devolve null quando o agente nao se aplica (desligado, sem prompt
// ou, no modo teste, numero fora da lista): nesse caso nao mostra nada.
export const effectiveSdrMode = (ticket, status) => {
	if (!status || !status.isEnabled || !status.hasPrompt) return null;

	if (ticket.user || ticket.userId) return "human";
	if (ticket.sdrAgentEnabled === false) return "human";

	if (status.testMode) {
		const n = digits(ticket.contact && ticket.contact.number);
		const listed = (status.allowedNumbers || []).some(a => n.endsWith(a) || a.endsWith(n));
		return listed ? "ai" : null;
	}

	return ticket.sdrAgentEnabled === true || status.autoEnableForNewTickets ? "ai" : "human";
};

export default effectiveSdrMode;
