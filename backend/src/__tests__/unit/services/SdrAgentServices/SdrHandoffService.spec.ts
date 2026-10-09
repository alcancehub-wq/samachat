import ShowTicketService from "../../../../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../../../../services/TicketServices/UpdateTicketService";
import { isEngineReady } from "../../../../services/AiEngineServices/engines";
import { decideSdrReply } from "../../../../services/SdrAgentServices/policy";
import {
  effectivePrompt,
  getSdrAgentSettings
} from "../../../../services/SdrAgentServices/SdrAgentSettingsService";
import {
  setHandoff
} from "../../../../services/SdrAgentServices/SdrHandoffService";

jest.mock("../../../../services/TicketServices/ShowTicketService");
jest.mock("../../../../services/TicketServices/UpdateTicketService");

jest.mock("../../../../services/AiEngineServices/engines", () => ({
  isEngineReady: jest.fn()
}));

jest.mock("../../../../services/SdrAgentServices/policy", () => ({
  decideSdrReply: jest.fn()
}));

jest.mock(
  "../../../../services/SdrAgentServices/SdrAgentSettingsService",
  () => ({
    effectivePrompt: jest.fn(),
    getSdrAgentSettings: jest.fn()
  })
);

const showTicketMock = ShowTicketService as jest.Mock;
const updateTicketMock = UpdateTicketService as jest.Mock;
const isEngineReadyMock = isEngineReady as jest.Mock;
const decideSdrReplyMock = decideSdrReply as jest.Mock;
const effectivePromptMock = effectivePrompt as jest.Mock;
const getSettingsMock = getSdrAgentSettings as jest.Mock;

describe("SdrHandoffService canonical ticket state", () => {
  const accessData = {
    userId: 32,
    profile: "user"
  };

  beforeEach(() => {
    jest.clearAllMocks();

    getSettingsMock.mockResolvedValue({
      isEnabled: true,
      systemPrompt: "<system_instruction>Bia</system_instruction>",
      testMode: true,
      aiEngine: "openai"
    });

    effectivePromptMock.mockReturnValue(
      "<system_instruction>Bia</system_instruction>"
    );

    isEngineReadyMock.mockResolvedValue(true);
  });

  it("human -> AI keeps the ticket open, removes human owner and enables the agent", async () => {
    const ticket = {
      id: 3765,
      status: "open",
      userId: 32,
      queueId: 5,
      whatsappId: 56,
      sdrAgentEnabled: false,
      contact: {
        number: "5511968560273"
      },
      update: jest.fn().mockResolvedValue(undefined)
    };

    showTicketMock.mockResolvedValue(ticket);
    updateTicketMock.mockResolvedValue(undefined);
    decideSdrReplyMock.mockReturnValue({ respond: true });

    const result = await setHandoff(
      3765,
      "ai",
      32,
      accessData
    );

    expect(ticket.update).toHaveBeenCalledWith({
      sdrAgentEnabled: true
    });

    expect(updateTicketMock).toHaveBeenCalledWith({
      ticketData: {
        status: "open",
        userId: null
      },
      ticketId: 3765,
      accessData
    });

    expect(showTicketMock).toHaveBeenNthCalledWith(
      1,
      3765,
      accessData
    );

    expect(showTicketMock).toHaveBeenNthCalledWith(
      2,
      3765,
      undefined
    );

    expect(result.mode).toBe("ai");
  });

  it("AI -> human keeps the ticket open, assigns the clicking human and disables the agent", async () => {
    const ticket = {
      id: 3765,
      status: "open",
      userId: null,
      queueId: 5,
      whatsappId: 56,
      sdrAgentEnabled: true,
      contact: {
        number: "5511968560273"
      },
      update: jest.fn().mockResolvedValue(undefined)
    };

    showTicketMock.mockResolvedValue(ticket);
    updateTicketMock.mockResolvedValue(undefined);

    decideSdrReplyMock.mockReturnValue({
      respond: false,
      reason: "atendente_humano"
    });

    const result = await setHandoff(
      3765,
      "human",
      32,
      accessData
    );

    expect(ticket.update).toHaveBeenCalledWith({
      sdrAgentEnabled: false
    });

    expect(updateTicketMock).toHaveBeenCalledWith({
      ticketData: {
        status: "open",
        userId: 32
      },
      ticketId: 3765,
      accessData
    });

    expect(showTicketMock).toHaveBeenNthCalledWith(
      1,
      3765,
      accessData
    );

    expect(showTicketMock).toHaveBeenNthCalledWith(
      2,
      3765,
      undefined
    );

    expect(result.mode).toBe("human");
  });
});
