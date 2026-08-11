import {
  __resetOutboundEchoGuardForTests,
  clearOutboundEchoReservationsForSession,
  reserveOutboundEcho,
  shouldSuppressOutboundEcho
} from "../wwebjsOutboundEchoGuard";

describe("wwebjs outbound echo guard", () => {
  beforeEach(() => {
    __resetOutboundEchoGuardForTests();
  });

  afterEach(() => {
    __resetOutboundEchoGuardForTests();
  });

  it("suppresses an echo that arrives before send completion", async () => {
    const reservation = reserveOutboundEcho(35);

    const suppressionPromise = shouldSuppressOutboundEcho(
      35,
      "3EB0MESSAGE01",
      1000
    );

    reservation.complete("3EB0MESSAGE01");

    await expect(suppressionPromise).resolves.toBe(true);
  });

  it("normalizes serialized and short forms of the same provider id", async () => {
    const reservation = reserveOutboundEcho(35);

    reservation.complete("true_5511999999999@c.us_3EB0MESSAGE02");

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0MESSAGE02")
    ).resolves.toBe(true);
  });

  it("suppresses repeated lifecycle events for the same media provider id", async () => {
    const reservation = reserveOutboundEcho(35);

    reservation.complete("3EB0MEDIAEVENT01");

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0MEDIAEVENT01")
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(
        35,
        "true_5511999999999@c.us_3EB0MEDIAEVENT01"
      )
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0DIFFERENTMEDIAEVENT")
    ).resolves.toBe(false);
  });

  it("does not suppress a different outbound event", async () => {
    const reservation = reserveOutboundEcho(35);

    reservation.complete("3EB0LOCALMESSAGE");

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0DIRECTPHONE")
    ).resolves.toBe(false);
  });

  it("correlates one text fallback reservation with the later real provider id", async () => {
    const correlation = {
      kind: "text" as const,
      to: "5511999999999@c.us",
      body: "mensagem de controle"
    };

    const reservation = reserveOutboundEcho(35, correlation);

    reservation.complete(
      "fallback_1786383780_unknown_5511999999999@c.us_control"
    );

    await expect(
      shouldSuppressOutboundEcho(
        35,
        "3EB0REALPROVIDERID",
        1000,
        correlation
      )
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0REALPROVIDERID")
    ).resolves.toBe(true);
  });

  it("does not correlate a text fallback when destination or body differs", async () => {
    const reservation = reserveOutboundEcho(35, {
      kind: "text",
      to: "5511999999999@c.us",
      body: "mensagem original"
    });

    reservation.complete(
      "fallback_1786383780_unknown_5511999999999@c.us_control"
    );

    await expect(
      shouldSuppressOutboundEcho(
        35,
        "3EB0DIFFERENTBODY",
        1000,
        {
          kind: "text",
          to: "5511999999999@c.us",
          body: "outra mensagem"
        }
      )
    ).resolves.toBe(false);

    await expect(
      shouldSuppressOutboundEcho(
        35,
        "3EB0DIFFERENTDESTINATION",
        1000,
        {
          kind: "text",
          to: "5511888888888@c.us",
          body: "mensagem original"
        }
      )
    ).resolves.toBe(false);
  });

  it("does not guess between concurrent identical text fallback reservations", async () => {
    const correlation = {
      kind: "text" as const,
      to: "5511999999999@c.us",
      body: "ok"
    };

    const first = reserveOutboundEcho(35, correlation);
    const second = reserveOutboundEcho(35, correlation);

    first.complete(
      "fallback_1786383780_unknown_5511999999999@c.us_first1"
    );
    second.complete(
      "fallback_1786383781_unknown_5511999999999@c.us_second"
    );

    await expect(
      shouldSuppressOutboundEcho(
        35,
        "3EB0AMBIGUOUS",
        1000,
        correlation
      )
    ).resolves.toBe(false);
  });

  it("keeps concurrent sends isolated by provider id", async () => {
    const first = reserveOutboundEcho(35);
    const second = reserveOutboundEcho(35);
    const third = reserveOutboundEcho(35);

    first.complete("3EB0FIRST");
    second.complete("3EB0SECOND");
    third.complete("3EB0THIRD");

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0SECOND")
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0FIRST")
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0THIRD")
    ).resolves.toBe(true);
  });

  it("does not merge repeated messages that have different real ids", async () => {
    const first = reserveOutboundEcho(35);
    const second = reserveOutboundEcho(35);

    first.complete("3EB0REPEATED01");
    second.complete("3EB0REPEATED02");

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0REPEATED01")
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0REPEATED02")
    ).resolves.toBe(true);

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0REPEATED03")
    ).resolves.toBe(false);
  });

  it("does not suppress when the provider send fails", async () => {
    const reservation = reserveOutboundEcho(35);

    reservation.cancel();

    await expect(
      shouldSuppressOutboundEcho(35, "3EB0FAILED")
    ).resolves.toBe(false);
  });

  it("clears pending reservations when the session is removed", async () => {
    const reservation = reserveOutboundEcho(35);

    const suppressionPromise = shouldSuppressOutboundEcho(
      35,
      "3EB0SESSIONREMOVED",
      1000
    );

    clearOutboundEchoReservationsForSession(35);
    reservation.complete("3EB0SESSIONREMOVED");

    await expect(suppressionPromise).resolves.toBe(false);
  });

  it("does not suppress an event without an id", async () => {
    const reservation = reserveOutboundEcho(35);

    reservation.complete("3EB0VALID");

    await expect(
      shouldSuppressOutboundEcho(35, "")
    ).resolves.toBe(false);
  });
});
