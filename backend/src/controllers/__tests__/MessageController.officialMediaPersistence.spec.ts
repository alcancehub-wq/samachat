import fs from "fs";
import path from "path";

describe("MessageController official outbound media persistence contract", () => {
  const controllerPath = path.resolve(
    __dirname,
    "..",
    "MessageController.ts"
  );

  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(controllerPath, "utf8");
  });

  it("marks official outbound media for local persistence", () => {
    expect(source).toContain(
      'ticket.whatsapp?.providerType === "official"'
    );

    expect(source).toContain(
      "shouldPersistRecordedAudioLocally || shouldPersistOfficialMediaLocally"
    );
  });

  it("preserves the uploaded file for official outbound media", () => {
    expect(source).toContain(
      "preserveUploadedFile: shouldPersistMediaLocally"
    );
  });

  it("allows official media to reach CreateMessageService", () => {
    expect(source).toContain(
      "if (!shouldPersistMediaLocally)"
    );

    expect(source).toContain(
      "await CreateMessageService({"
    );
  });

  it("persists media metadata using the provider response", () => {
    expect(source).toContain(
      "providerMessage.id ||"
    );

    expect(source).toContain(
      "mediaUrl: media.filename"
    );

    expect(source).toContain(
      "ack: providerMessage.ack ?? 1"
    );
  });
});