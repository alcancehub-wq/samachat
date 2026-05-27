import {
  resolveContactLookupFromCandidates,
  resolveValidatedNumberFromCandidates
} from "../wwebjsNumberLookup";

describe("wwebjs number lookup", () => {
  it("keeps trying candidates when one candidate lookup fails", async () => {
    const lookupCandidate = jest
      .fn<
        Promise<
          | {
              user?: string | null;
              server?: string | null;
              _serialized?: string | null;
            }
          | null
          | undefined
        >,
        [string]
      >()
      .mockRejectedValueOnce(new Error("wid error"))
      .mockResolvedValueOnce({
        user: "11959207315",
        server: "c.us",
        _serialized: "11959207315@c.us"
      });

    await expect(
      resolveValidatedNumberFromCandidates(
        ["5511959207315", "11959207315"],
        lookupCandidate
      )
    ).resolves.toBe("11959207315");

    expect(lookupCandidate).toHaveBeenNthCalledWith(1, "5511959207315");
    expect(lookupCandidate).toHaveBeenNthCalledWith(2, "11959207315");
  });

  it("returns empty when every candidate resolves without a confirmed number", async () => {
    const lookupCandidate = jest
      .fn<
        Promise<
          | {
              user?: string | null;
              server?: string | null;
              _serialized?: string | null;
            }
          | null
          | undefined
        >,
        [string]
      >()
      .mockResolvedValue(null);

    await expect(
      resolveValidatedNumberFromCandidates(
        ["5511959207315", "11959207315"],
        lookupCandidate
      )
    ).resolves.toBe("");
  });

  it("preserves a sendable lid chat id when the lookup resolves a lid", async () => {
    const lookupCandidate = jest
      .fn<
        Promise<
          | {
              user?: string | null;
              server?: string | null;
              _serialized?: string | null;
            }
          | null
          | undefined
        >,
        [string]
      >()
      .mockResolvedValue({
        user: "179473865519257",
        server: "lid",
        _serialized: "179473865519257@lid"
      });

    await expect(
      resolveContactLookupFromCandidates(["5599984396105"], lookupCandidate)
    ).resolves.toEqual({
      number: "5599984396105",
      chatId: "179473865519257@lid",
      jid: "179473865519257@lid",
      lid: "179473865519257@lid",
      serializedId: "179473865519257@lid"
    });
  });

  it("rethrows the last provider error when no candidate can be confirmed", async () => {
    const firstError = new Error("wid error");
    const lastError = new Error("execution context destroyed");
    const lookupCandidate = jest
      .fn<
        Promise<
          | {
              user?: string | null;
              server?: string | null;
              _serialized?: string | null;
            }
          | null
          | undefined
        >,
        [string]
      >()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(lastError);

    await expect(
      resolveValidatedNumberFromCandidates(
        ["5511959207315", "11959207315"],
        lookupCandidate
      )
    ).rejects.toBe(lastError);
  });
});