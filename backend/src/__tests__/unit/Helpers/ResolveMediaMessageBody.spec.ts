import ResolveMediaMessageBody from "../../../helpers/ResolveMediaMessageBody";

describe("ResolveMediaMessageBody", () => {
  it("falls back to the stored filename when body and original filename are empty", () => {
    expect(
      ResolveMediaMessageBody({
        body: "",
        originalFilename: "",
        storedFilename: "audio-123.mp3"
      })
    ).toBe("audio-123.mp3");
  });

  it("preserves the original media filename when it exists", () => {
    expect(
      ResolveMediaMessageBody({
        body: "",
        originalFilename: "voice-note.ogg",
        storedFilename: "voice-note.ABC12.mp3"
      })
    ).toBe("voice-note.ogg");
  });

  it("keeps a regular text body ahead of media filenames", () => {
    expect(
      ResolveMediaMessageBody({
        body: "Mensagem comum",
        originalFilename: "voice-note.ogg",
        storedFilename: "voice-note.ABC12.mp3"
      })
    ).toBe("Mensagem comum");
  });
});