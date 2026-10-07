import React, { useContext, useEffect, useState } from "react";

import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import AndroidIcon from "@material-ui/icons/Android";
import PersonIcon from "@material-ui/icons/Person";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import useSdrStatus, { invalidateSdrStatus } from "../../hooks/useSdrStatus";
import effectiveSdrMode from "../../utils/sdrMode";
import ConfirmationModal from "../ConfirmationModal";

const useStyles = makeStyles(theme => ({
	root: {
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
		flex: "none",
	},
	button: {
		padding: 6,
		backgroundColor: theme.custom ? theme.custom.softBackground : "transparent",
		border: `1px solid ${theme.palette.divider}`,
		color: theme.palette.text.secondary,
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	ai: {
		backgroundColor: "#FF1919 !important",
		borderColor: "#FF1919 !important",
		color: "#FFFFFF !important",
	},
	human: {
		backgroundColor: "#2563EB !important",
		borderColor: "#2563EB !important",
		color: "#FFFFFF !important",
	},
}));

const digits = value => String(value || "").replace(/\D/g, "");

// Dois botoes so de icone: robo (IA atende) e pessoa (humano atende). O botao
// do lado que esta atendendo fica colorido. Clicar no outro passa a conversa:
// - Humano: voce assume na hora (ja pode responder; nao ha "aceitar").
// - IA: devolve a conversa para o agente. Antes de devolver, consulta o modulo
//   Treinamento da IA NA HORA (agente ligado + prompt), sem confiar no estado
//   guardado quando a tela abriu, que pode estar desatualizado.
const SdrHandoffButtons = ({ ticket }) => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const status = useSdrStatus();
	const [busy, setBusy] = useState(false);
	const [override, setOverride] = useState(null);
	const [confirmOpen, setConfirmOpen] = useState(false);

	// Quando a conversa muda de verdade (socket), vale o que veio do servidor.
	useEffect(() => {
		setOverride(null);
	}, [ticket.status, ticket.userId, ticket.sdrAgentEnabled]);

	if (ticket.status === "closed") return null;

	const computed = effectiveSdrMode(ticket, status);
	const mode = override || computed || (ticket.userId ? "human" : null);
	const mine = ticket.status === "open" && ticket.userId === user?.id;

	const change = async next => {
		setBusy(true);
		try {
			await api.put(`/tickets/${ticket.id}/sdr-agent`, { mode: next });
			setOverride(next);
			invalidateSdrStatus();
			toast.success(
				next === "ai"
					? "A IA voltou a atender esta conversa."
					: "Voce assumiu a conversa. A IA parou de responder."
			);
		} catch (err) {
			const code = err?.response?.data?.error;
			if (code === "ERR_SDR_AGENT_DISABLED") {
				invalidateSdrStatus();
				toast.error("O agente de IA esta desligado. Ligue em Treinamento da IA > Agente e salve.");
			} else if (code === "ERR_SDR_NO_PROMPT") {
				invalidateSdrStatus();
				toast.error("O agente ainda nao tem prompt. Crie o prompt em Treinamento da IA.");
			} else {
				toastError(err);
			}
		}
		setBusy(false);
	};

	const onAi = async e => {
		e.stopPropagation();
		if (mode === "ai" || busy) return;

		// Consulta o estado atual do agente (nao o guardado).
		setBusy(true);
		let fresh = null;
		try {
			const { data } = await api.get("/sdr-agent/status");
			fresh = data;
			invalidateSdrStatus();
		} catch (err) {
			setBusy(false);
			toastError(err);
			return;
		}
		setBusy(false);

		if (!fresh.isEnabled) {
			toast.error("O agente de IA esta desligado. Ligue em Treinamento da IA > Agente e salve.");
			return;
		}
		if (!fresh.hasPrompt) {
			toast.error("O agente ainda nao tem prompt. Crie o prompt em Treinamento da IA.");
			return;
		}
		if (fresh.testMode) {
			const n = digits(ticket.contact && ticket.contact.number);
			const listed = (fresh.allowedNumbers || []).some(a => n.endsWith(a) || a.endsWith(n));
			if (!listed) {
				toast.warning(
					"O agente esta em modo teste e este numero nao esta na lista. A IA nao vai responder esta conversa ate o numero ser incluido."
				);
			}
		}

		if (ticket.userId) setConfirmOpen(true);
		else change("ai");
	};

	const onHuman = e => {
		e.stopPropagation();
		if (busy || (mode === "human" && mine)) return;
		change("human");
	};

	const aiTitle = mode === "ai" ? "A IA esta atendendo esta conversa" : "Passar a conversa para a IA";
	const humanTitle = mine
		? "Voce esta atendendo esta conversa"
		: mode === "human"
		? "Um atendente esta com esta conversa. Clique para assumir"
		: "Assumir a conversa (a IA para)";

	return (
		<span className={classes.root} onClick={e => e.stopPropagation()}>
			<span title={aiTitle}>
				<IconButton
					size="small"
					className={`${classes.button} ${mode === "ai" ? classes.ai : ""}`}
					onClick={onAi}
					disabled={busy}
					aria-label="IA"
				>
					<AndroidIcon fontSize="small" />
				</IconButton>
			</span>
			<span title={humanTitle}>
				<IconButton
					size="small"
					className={`${classes.button} ${mode === "human" ? classes.human : ""}`}
					onClick={onHuman}
					disabled={busy}
					aria-label="Humano"
				>
					<PersonIcon fontSize="small" />
				</IconButton>
			</span>

			<ConfirmationModal
				title="Devolver a conversa para a IA?"
				open={confirmOpen}
				onClose={setConfirmOpen}
				onConfirm={() => change("ai")}
			>
				A IA volta a responder este cliente e a conversa sai do nome do atendente.
			</ConfirmationModal>
		</span>
	);
};

export default SdrHandoffButtons;
