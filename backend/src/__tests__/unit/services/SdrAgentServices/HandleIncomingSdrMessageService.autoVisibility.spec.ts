import HandleIncomingSdrMessageService from "../../../../services/SdrAgentServices/HandleIncomingSdrMessageService";
import UpdateTicketService from "../../../../services/TicketServices/UpdateTicketService";
import { getSdrAgentSettings } from "../../../../services/SdrAgentServices/SdrAgentSettingsService";
import { decideSdrReply } from "../../../../services/SdrAgentServices/policy";
import { isEngineReady } from "../../../../services/AiEngineServices/engines";

jest.mock("../../../../services/TicketServices/UpdateTicketService");
jest.mock("../../../../services/SdrAgentServices/SdrAgentSettingsService");
jest.mock("../../../../services/SdrAgentServices/policy");
jest.mock("../../../../services/AiEngineServices/engines");
jest.mock("../../../../services/SdrAgentServices/RunSdrAgentService", () => ({
  runSdrAgentForTicket: jest.fn()
}));
jest.mock("../../../../services/SdrAgentServices/scheduler", () => ({
  SdrScheduler: jest.fn().mockImplementation(() => ({
    schedule: jest.fn()
  }))
}));

const updateMock = UpdateTicketService as jest.Mock;
const settingsMock = getSdrAgentSettings as jest.Mock;
const policyMock = decideSdrReply as jest.Mock;
const engineMock = isEngineReady as jest.Mock;

const baseTicket = {
  id: 3883,
  status: "open",
  isGroup: false,
  userId: null,
  sdrAgentEnabled: null
};

const run = (ticket: any) =>
  HandleIncomingSdrMessageService({
    ticket,
    contactNumber: "554191470679",
    messageBody: "Oi",
    mediaType: "chat",
    fromMe: false
  });

describe("BIA R04 - persistencia de visibilidade automatica", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settingsMock.mockResolvedValue({ aiEngine: "openai" });
    policyMock.mockReturnValue({ respond: true });
    engineMock.mockResolvedValue(true);
    updateMock.mockResolvedValue({});
  });

  it("marca IA ativa em ticket aberto com estado null", async () => {
    await expect(run({ ...baseTicket })).resolves.toEqual({
      handled: true
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      ticketId: 3883,
      ticketData: { status: "open", userId: null },
      sdrAgentEnabled: true
    });
  });

  it("abre pendente e registra IA ativa na mesma atualizacao", async () => {
    await expect(
      run({ ...baseTicket, status: "pending" })
    ).resolves.toEqual({ handled: true });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      ticketId: 3883,
      ticketData: { status: "open", userId: null },
      sdrAgentEnabled: true
    });
  });

  it("nao atualiza ticket aberto que ja tem IA ativa", async () => {
    await expect(
      run({ ...baseTicket, sdrAgentEnabled: true })
    ).resolves.toEqual({ handled: true });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("nao reativa ticket entregue ao humano", async () => {
    policyMock.mockReturnValue({
      respond: false,
      reason: "desligado_no_ticket"
    });

    await expect(
      run({ ...baseTicket, sdrAgentEnabled: false })
    ).resolves.toEqual({
      handled: false,
      reason: "desligado_no_ticket"
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("nao altera ticket com responsavel humano", async () => {
    policyMock.mockReturnValue({
      respond: false,
      reason: "atendente_humano"
    });

    await expect(
      run({ ...baseTicket, userId: 32 })
    ).resolves.toEqual({
      handled: false,
      reason: "atendente_humano"
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("nao registra IA ativa quando motor esta indisponivel", async () => {
    engineMock.mockResolvedValue(false);

    await expect(run({ ...baseTicket })).resolves.toEqual({
      handled: false,
      reason: "nenhuma_ia_ativa"
    });

    expect(updateMock).not.toHaveBeenCalled();
  });
});