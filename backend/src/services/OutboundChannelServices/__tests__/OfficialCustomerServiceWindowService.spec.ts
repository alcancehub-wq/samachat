jest.mock("../OfficialInboundCorrelationService", () => ({
  GetLastOfficialInboundTimestampService: jest.fn()
}));

import AppError from "../../../errors/AppError";
import { GetLastOfficialInboundTimestampService } from "../OfficialInboundCorrelationService";
import {
  AssertOfficialFreeTextAllowedService,
  GetOfficialCustomerServiceWindowService
} from "../OfficialCustomerServiceWindowService";

describe("OfficialCustomerServiceWindowService", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");
  const input = { ticketId: 10, deliveryWhatsappId: 20, now };
  const nowTimestamp = Math.floor(now.getTime() / 1000);

  afterEach(() => jest.clearAllMocks());

  it("opens only from a recent factual Meta provider timestamp", async () => {
    (GetLastOfficialInboundTimestampService as jest.Mock).mockResolvedValue(nowTimestamp - 60);
    await expect(GetOfficialCustomerServiceWindowService(input)).resolves.toMatchObject({
      isOpen: true,
      evidence: "META_PROVIDER_TIMESTAMP"
    });
    expect(GetLastOfficialInboundTimestampService).toHaveBeenCalledWith(10, 20);
  });

  it("keeps the window open exactly at the 24-hour limit", async () => {
    (GetLastOfficialInboundTimestampService as jest.Mock).mockResolvedValue(nowTimestamp - 24 * 60 * 60);
    await expect(GetOfficialCustomerServiceWindowService(input)).resolves.toMatchObject({ isOpen: true });
  });

  it("fails closed for expired, absent, or invalid evidence", async () => {
    for (const timestamp of [nowTimestamp - 24 * 60 * 60 - 1, null, Number.NaN]) {
      (GetLastOfficialInboundTimestampService as jest.Mock).mockResolvedValue(timestamp);
      await expect(GetOfficialCustomerServiceWindowService(input)).resolves.toMatchObject({ isOpen: false });
    }
  });

  it("guards free text with a controlled template-required error", async () => {
    (GetLastOfficialInboundTimestampService as jest.Mock).mockResolvedValue(null);
    await expect(AssertOfficialFreeTextAllowedService(input)).rejects.toMatchObject<AppError>({
      message: "ERR_META_OFFICIAL_TEMPLATE_REQUIRED",
      statusCode: 400
    });
  });
});