import fs from "fs";
import path from "path";

describe("wwebjs reconnect policy", () => {
  const providerPath = path.resolve(
    __dirname,
    "..",
    "wwebjs.ts"
  );

  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(providerPath, "utf8").replace(/\r\n/g, "\n");
  });

  it("does not schedule another reconnect while a timer is pending", () => {
    const guardPosition = source.indexOf(
      "if (reconnectTimers[whatsapp.id])"
    );

    const attemptPosition = source.indexOf(
      "const attempt = (reconnectAttempts[whatsapp.id] || 0) + 1"
    );

    expect(guardPosition).toBeGreaterThan(-1);
    expect(attemptPosition).toBeGreaterThan(guardPosition);
    expect(source).toContain("Reconnect already scheduled");
  });

  it("preserves authentication state on transient disconnected events", () => {
    expect(source).toContain(
      'await whatsapp.update({ status: "OPENING" });'
    );

    expect(source).not.toContain(
      'await whatsapp.update({ status: "OPENING", session: "" });'
    );
  });

  it("preserves reconnect attempts during automatic recreation", () => {
    expect(source).toContain(
      "options: { preserveReconnectState?: boolean } = {}"
    );

    expect(source).toContain(
      "const preserveReconnectState = options.preserveReconnectState === true"
    );

    expect(source).toContain(
      "if (!preserveReconnectState) {\n    delete reconnectAttempts[whatsappId];\n  }"
    );

    expect(source).toContain(
      "await removeSession(whatsapp.id, {\n            preserveReconnectState: true\n          });"
    );
  });
});
