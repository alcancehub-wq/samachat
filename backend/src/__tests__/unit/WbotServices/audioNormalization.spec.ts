import {
  WHATSAPP_VOICE_MIMETYPE,
  shouldNormalizeAudioForWhatsApp,
  shouldSendAudioAsVoice
} from "../../../services/WbotServices/audioNormalization";

describe("audioNormalization", () => {
  it("should normalize browser-recorded webm audio before sending to WhatsApp", () => {
    expect(
      shouldNormalizeAudioForWhatsApp({
        mimetype: "audio/webm;codecs=opus",
        originalname: "recorded_123.webm"
      })
    ).toBe(true);
  });

  it("should normalize ogg/opus voice-note containers before sending to WhatsApp", () => {
    expect(
      shouldNormalizeAudioForWhatsApp({
        mimetype: "audio/ogg",
        originalname: "recorded_123.ogg"
      })
    ).toBe(true);
  });

  it("should keep regular mp3 uploads untouched", () => {
    expect(
      shouldNormalizeAudioForWhatsApp({
        mimetype: "audio/mpeg",
        originalname: "song.mp3"
      })
    ).toBe(false);
  });

  it("should still mark ogg opus variants as voice messages", () => {
    expect(
      shouldSendAudioAsVoice({
        mimetype: "audio/ogg;codecs=opus",
        filename: "recorded_123.ogg"
      })
    ).toBe(true);
  });

  it("should keep the normalized WhatsApp voice-note mimetype on generic ogg", () => {
    expect(WHATSAPP_VOICE_MIMETYPE).toBe("audio/ogg");
    expect(
      shouldSendAudioAsVoice({
        mimetype: WHATSAPP_VOICE_MIMETYPE,
        filename: "recorded_123.ogg"
      })
    ).toBe(true);
  });
});