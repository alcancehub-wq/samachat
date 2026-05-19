import { shouldSendMediaAsDocument } from "../../../services/WbotServices/mediaDelivery";

describe("mediaDelivery", () => {
  it("should keep normalized voice notes as voice messages", () => {
    expect(
      shouldSendMediaAsDocument(
        {
          mimetype: "audio/ogg;codecs=opus",
          filename: "recorded_123.ogg"
        },
        { sendAsVoice: true }
      )
    ).toBe(false);
  });

  it("should keep uploaded audio files in native audio mode", () => {
    expect(
      shouldSendMediaAsDocument({
        mimetype: "audio/mpeg",
        filename: "call.mp3"
      })
    ).toBe(false);
  });

  it("should preserve generic attachments as documents", () => {
    expect(
      shouldSendMediaAsDocument({
        mimetype: "application/pdf",
        filename: "proposal.pdf"
      })
    ).toBe(true);
  });

  it("should keep videos in native media mode", () => {
    expect(
      shouldSendMediaAsDocument({
        mimetype: "video/mp4",
        filename: "walkthrough.mp4"
      })
    ).toBe(false);
  });
});