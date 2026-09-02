import AppError from "../../errors/AppError";
import { GetLastOfficialInboundTimestampService } from "./OfficialInboundCorrelationService";

const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface OfficialCustomerServiceWindow {
  isOpen: boolean;
  lastInboundAt: Date | null;
  expiresAt: Date | null;
  evidence: "META_PROVIDER_TIMESTAMP" | "NONE";
}

export const GetOfficialCustomerServiceWindowService = async ({
  ticketId,
  deliveryWhatsappId,
  now = new Date()
}: {
  ticketId: number;
  deliveryWhatsappId: number;
  now?: Date;
}): Promise<OfficialCustomerServiceWindow> => {
  const providerTimestamp = await GetLastOfficialInboundTimestampService(
    ticketId,
    deliveryWhatsappId
  );

  if (!providerTimestamp || !Number.isFinite(providerTimestamp)) {
    return { isOpen: false, lastInboundAt: null, expiresAt: null, evidence: "NONE" };
  }

  const lastInboundAt = new Date(providerTimestamp * 1000);
  const expiresAt = new Date(lastInboundAt.getTime() + CUSTOMER_SERVICE_WINDOW_MS);

  if (Number.isNaN(lastInboundAt.getTime()) || expiresAt.getTime() < now.getTime()) {
    return { isOpen: false, lastInboundAt, expiresAt, evidence: "META_PROVIDER_TIMESTAMP" };
  }

  return { isOpen: true, lastInboundAt, expiresAt, evidence: "META_PROVIDER_TIMESTAMP" };
};

export const AssertOfficialFreeTextAllowedService = async (
  input: Parameters<typeof GetOfficialCustomerServiceWindowService>[0]
): Promise<OfficialCustomerServiceWindow> => {
  const window = await GetOfficialCustomerServiceWindowService(input);

  if (!window.isOpen) {
    throw new AppError("ERR_META_OFFICIAL_TEMPLATE_REQUIRED", 400);
  }

  return window;
};