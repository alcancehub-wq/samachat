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
