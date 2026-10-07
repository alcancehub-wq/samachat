import { toChatHistory } from "../../../../services/SdrAgentServices/conversation";
import { isAudioType } from "../../../../services/SdrAgentServices/audio";
import {
  PROVIDERS,
  defaultsFor,
  isProvider
} from "../../../../services/IntegrationSettingsServices/providers";

describe("audio do lead", () => {
  it("reconhece audio e ptt", () => {
    expect(isAudioType("audio")).toBe(true);
    expect(isAudioType("ptt")).toBe(true);
    expect(isAudioType("chat")).toBe(false);
    expect(isAudioType(null)).toBe(false);
  });

  it("usa a transcricao como se fosse o texto do lead", () => {
    const out = toChatHistory(
      [
        { id: "m1", body: "voz.ogg", fromMe: false, mediaType: "ptt" },
        { id: "m2", body: "ok", fromMe: true, mediaType: "chat" }
      ],
      new Map([["m1", "quero saber o preco"]])
    );
    expect(out).toEqual([
      { role: "user", content: "quero saber o preco" },
      { role: "assistant", content: "ok" }
    ]);
  });

  it("sem transcricao, mantem a marca de que algo foi enviado", () => {
    const out = toChatHistory([
      { id: "m1", body: "voz.ogg", fromMe: false, mediaType: "ptt" }
    ]);
    expect(out[0].content).toContain("ptt");
    expect(out[0].content).toContain("nao pode ser lido");
  });
});

describe("integracoes externas (campos)", () => {
  it("so aceita os provedores conhecidos", () => {
    expect(isProvider("elevenlabs")).toBe(true);
    expect(isProvider("gemini")).toBe(true);
    expect(isProvider("claude")).toBe(true);
    expect(isProvider("evolution")).toBe(false); // fora deste pacote
    expect(isProvider("meta")).toBe(false);
    expect(isProvider("constructor")).toBe(false);
    expect(isProvider("xyz")).toBe(false);
  });

  it("marca como segredo as chaves e tokens", () => {
    const secrets = (p: string) =>
      PROVIDERS[p].filter(f => f.secret).map(f => f.key);
    expect(secrets("elevenlabs")).toEqual(["apiKey"]);
    expect(secrets("gemini")).toEqual(["apiKey"]);
    expect(secrets("claude")).toEqual(["apiKey"]);
  });

  it("a resposta em audio nasce desligada", () => {
    expect(defaultsFor("elevenlabs").audioReply).toBe(false);
    expect(defaultsFor("elevenlabs").voiceId).toBeTruthy();
  });
});
