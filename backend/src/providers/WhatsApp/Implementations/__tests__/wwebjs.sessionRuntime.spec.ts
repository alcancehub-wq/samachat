import {
  ensureSessionListed,
  registerReadySession,
  resetSessionRuntimeState,
  resolvePersistedStatusFromChangeState
} from "../wwebjsSessionRuntime";

describe("wwebjs session runtime", () => {
  const sessions: Array<{ id?: number; marker?: string }> = [];
  const readySessions = new Set<number>();

  beforeEach(() => {
    resetSessionRuntimeState(sessions, readySessions);
    jest.clearAllMocks();
  });

  it("keeps CONNECTED state as OPENING until the session becomes ready", () => {
    expect(resolvePersistedStatusFromChangeState(false, "CONNECTED")).toBe(
      "OPENING"
    );

    expect(readySessions.has(35)).toBe(false);
  });

  it("registers runtime ready sessions when the ready event is processed", () => {
    registerReadySession(sessions, readySessions, { id: 35 });

    expect(sessions).toEqual([{ id: 35 }]);
    expect(readySessions.has(35)).toBe(true);
    expect(resolvePersistedStatusFromChangeState(true, "CONNECTED")).toBe(
      "CONNECTED"
    );
  });

  it("does not mark runtime ready just because change_state reports CONNECTED", () => {
    ensureSessionListed(sessions, { id: 35 });

    expect(resolvePersistedStatusFromChangeState(false, "CONNECTED")).toBe(
      "OPENING"
    );
    expect(readySessions.has(35)).toBe(false);
  });

  it("keeps the listed session stable when ready refreshes the same session", () => {
    ensureSessionListed(sessions, { id: 35, marker: "initial" });
    registerReadySession(sessions, readySessions, { id: 35, marker: "ready" });

    expect(sessions).toEqual([{ id: 35, marker: "ready" }]);
    expect(readySessions.has(35)).toBe(true);
  });
});