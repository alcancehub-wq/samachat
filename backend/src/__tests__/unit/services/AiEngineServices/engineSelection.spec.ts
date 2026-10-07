import { getActiveEngine } from "../../../../services/AiEngineServices/engines";
import GetOpenAISettingsService from "../../../../services/OpenAISettingsServices/GetOpenAISettingsService";
import { getIntegrationConfig } from "../../../../services/IntegrationSettingsServices/IntegrationSettingsService";

jest.mock("../../../../services/OpenAISettingsServices/GetOpenAISettingsService");
jest.mock("../../../../services/IntegrationSettingsServices/IntegrationSettingsService");

const setup = (openai: boolean, gemini: boolean, claude: boolean) => {
  (GetOpenAISettingsService as unknown as jest.Mock).mockResolvedValue({
    apiKey: openai ? "k" : "",
    isActive: openai,
    model: "gpt"
  });
  (getIntegrationConfig as jest.Mock).mockImplementation(async (p: string) => {
    const on = p === "gemini" ? gemini : claude;
    return { isActive: on, values: { apiKey: on ? "k" : "", model: "m" } };
  });
};

describe("motor de IA escolhido no agente (nao e global)", () => {
  it("usa o motor escolhido quando disponivel, mesmo com outros ligados", async () => {
    setup(true, true, true);
    expect(await getActiveEngine("claude")).toBe("claude");
    expect(await getActiveEngine("gemini")).toBe("gemini");
  });

  it("escolhido e indisponivel = nenhum (nao troca de IA em silencio)", async () => {
    setup(true, false, false);
    expect(await getActiveEngine("claude")).toBeNull();
  });

  it("sem escolha usa o primeiro disponivel", async () => {
    setup(false, true, true);
    expect(await getActiveEngine(null)).toBe("gemini");
  });

  it("nada disponivel = nenhum; valor invalido e ignorado", async () => {
    setup(false, false, false);
    expect(await getActiveEngine()).toBeNull();
    setup(true, false, false);
    expect(await getActiveEngine("xyz")).toBeNull();
  });
});
