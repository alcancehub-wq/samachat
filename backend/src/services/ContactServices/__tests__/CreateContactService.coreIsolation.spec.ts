jest.mock("../../../models/Contact", () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));
jest.mock("../../CrmIntegrationServices/CaptureCreateContactSourceBridge", () =>
  jest.fn()
);
jest.mock("../../WebhookServices/TriggerWebhooksService", () =>
  jest.fn(async () => undefined)
);
jest.mock("../../../utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import Contact from "../../../models/Contact";
import CaptureCreateContactSourceBridge from "../../CrmIntegrationServices/CaptureCreateContactSourceBridge";
import TriggerWebhooksService from "../../WebhookServices/TriggerWebhooksService";
import { logger } from "../../../utils/logger";
import CreateContactService from "../CreateContactService";

beforeEach(() => {
  jest.clearAllMocks();
  (Contact.findOne as jest.Mock).mockResolvedValue(null);
});

it("preserves manual contact creation when the CRM bridge fails", async () => {
  const contact = {
    id: 19003,
    name: "Manual Safe",
    number: "5511999999003",
    reload: jest.fn(async () => undefined),
    get: jest.fn(() => ({
      id: 19003,
      name: "Manual Safe",
      number: "5511999999003"
    }))
  };
  (CaptureCreateContactSourceBridge as jest.Mock).mockRejectedValueOnce(
    new Error("synthetic_crm_bridge_failure")
  );
  (Contact.create as jest.Mock).mockResolvedValueOnce(contact);

  const result = await CreateContactService(
    {
      name: "Manual Safe",
      number: "5511999999003"
    },
    {
      enabled: true,
      identity: {
        integrationId: "synthetic-integration",
        organizationId: "00000000-0000-4000-8000-000000000001",
        sourceInstanceId: "synthetic-instance"
      },
      captureKey: "00000000-0000-4000-8000-000000000002",
      correlationId: "00000000-0000-4000-8000-000000000003",
      phoneE164: "+5511999999003",
      bindingStatus: "not_linked",
      context: {
        channel: "manual",
        provenance: "manual",
        fromMe: false,
        isGroup: false,
        authorized: true
      }
    } as any
  );

  expect(CaptureCreateContactSourceBridge).toHaveBeenCalledTimes(1);
  expect(Contact.create).toHaveBeenCalledTimes(1);
  expect(result).toBe(contact);
  expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  expect(logger.error).toHaveBeenCalledWith(
    expect.objectContaining({
      flow: "crm_source_bridge",
      operation: "contact_create"
    }),
    "CRM source bridge failed; preserving local contact creation"
  );
});
