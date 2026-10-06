jest.mock("../../../models/CrmIntegrationMapping", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

import CrmIntegrationMapping from "../../../models/CrmIntegrationMapping";
import {
  BuildCrmM2mIdentityFromMapping,
  CrmIntegrationMappingInput,
  LoadCrmIntegrationMapping,
  ValidateCrmIntegrationMapping
} from "../CrmIntegrationMappingService";

const valid: CrmIntegrationMappingInput = {
  localIntegrationId: 1,
  m2mIntegrationId: "samachat-crm-primary",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "samachat-production-primary",
  endpoint: "https://crm.example.invalid/functions/v1/samachat-m2m",
  approvedEndpoint: "https://crm.example.invalid/functions/v1/samachat-m2m",
  keyId: "samachat.crm.primary.v1",
  secretReference: "vault://samachat/crm/m2m/primary",
  enabled: false,
  syncEnabled: false,
  commercialAdmissionEnabled: false,
  commercialPipelineName: null,
  commercialStageName: null,
  commercialOwnerEmail: null,
  mappingVersion: 1
};

const findByPk = CrmIntegrationMapping.findByPk as jest.Mock;

beforeEach(() => {
  findByPk.mockReset();
});

it("valid mapping remains explicitly disabled", () => {
  const value = ValidateCrmIntegrationMapping(valid);

  expect(value.enabled).toBe(false);
  expect(value.localIntegrationId).toBe(1);
  expect(value.secretReference).toBe(valid.secretReference);
});

it("builds exactly the existing M2M identity contract", () => {
  const value = ValidateCrmIntegrationMapping(valid);

  expect(BuildCrmM2mIdentityFromMapping(value)).toEqual({
    integrationId: valid.m2mIntegrationId,
    organizationId: valid.organizationId,
    sourceInstanceId: valid.sourceInstanceId
  });
});

it.each([
  ["local id zero", { localIntegrationId: 0 }],
  ["integration id empty", { m2mIntegrationId: "" }],
  ["organization invalid", { organizationId: "not-a-uuid" }],
  ["source empty", { sourceInstanceId: "" }],
  ["source untrimmed", { sourceInstanceId: " bad " }],
  ["http endpoint", {
    endpoint: "http://crm.example.invalid/m2m",
    approvedEndpoint: "http://crm.example.invalid/m2m"
  }],
  ["endpoint credentials", {
    endpoint: "https://user:pass@crm.example.invalid/m2m",
    approvedEndpoint: "https://user:pass@crm.example.invalid/m2m"
  }],
  ["endpoint fragment", {
    endpoint: "https://crm.example.invalid/m2m#fragment",
    approvedEndpoint: "https://crm.example.invalid/m2m#fragment"
  }],
  ["endpoint not pinned", {
    approvedEndpoint: "https://other.example.invalid/m2m"
  }],
  ["webhook.site", {
    endpoint: "https://webhook.site/test",
    approvedEndpoint: "https://webhook.site/test"
  }],
  ["lead webhook", {
    endpoint: "https://crm.example.invalid/functions/v1/lead-webhook",
    approvedEndpoint: "https://crm.example.invalid/functions/v1/lead-webhook"
  }],
  ["bad key id", { keyId: "bad key id" }],
  ["empty secret reference", { secretReference: "" }],
  ["mapping version zero", { mappingVersion: 0 }],
  ["mapping version fractional", { mappingVersion: 1.5 }]
])("%s fails closed", (_name, patch) => {
  expect(() =>
    ValidateCrmIntegrationMapping({
      ...valid,
      ...patch
    } as CrmIntegrationMappingInput)
  ).toThrow("CRM_MAPPING_INVALID");
});

it("invalid loader id fails before database lookup", async () => {
  await expect(
    LoadCrmIntegrationMapping(0)
  ).rejects.toThrow("CRM_MAPPING_INTEGRATION_ID_INVALID");

  expect(findByPk).not.toHaveBeenCalled();
});

it("missing mapping returns null", async () => {
  findByPk.mockResolvedValue(null);

  await expect(
    LoadCrmIntegrationMapping(1)
  ).resolves.toBeNull();

  expect(findByPk).toHaveBeenCalledTimes(1);
});

it("loader returns only the typed mapping snapshot", async () => {
  findByPk.mockResolvedValue({
    integrationId: 1,
    m2mIntegrationId: valid.m2mIntegrationId,
    organizationId: valid.organizationId,
    sourceInstanceId: valid.sourceInstanceId,
    endpoint: valid.endpoint,
    approvedEndpoint: valid.approvedEndpoint,
    keyId: valid.keyId,
    secretReference: valid.secretReference,
    m2mEnabled: false,
    syncEnabled: false,
    commercialAdmissionEnabled: false,
    commercialPipelineName: null,
    commercialStageName: null,
    commercialOwnerEmail: null,
    mappingVersion: 1
  });

  const value = await LoadCrmIntegrationMapping(1);

  expect(value).toEqual(
    ValidateCrmIntegrationMapping(valid)
  );

  const options = findByPk.mock.calls[0][1];

  expect(options.attributes).toContain("secretReference");
  expect(options.attributes).not.toContain("apiKey");
  expect(options.attributes).not.toContain("secret");
});

it("persisted invalid mapping fails closed", async () => {
  findByPk.mockResolvedValue({
    integrationId: 1,
    m2mIntegrationId: valid.m2mIntegrationId,
    organizationId: "invalid",
    sourceInstanceId: valid.sourceInstanceId,
    endpoint: valid.endpoint,
    approvedEndpoint: valid.approvedEndpoint,
    keyId: valid.keyId,
    secretReference: valid.secretReference,
    m2mEnabled: false,
    syncEnabled: false,
    commercialAdmissionEnabled: false,
    commercialPipelineName: null,
    commercialStageName: null,
    commercialOwnerEmail: null,
    mappingVersion: 1
  });

  await expect(
    LoadCrmIntegrationMapping(1)
  ).rejects.toThrow("CRM_MAPPING_INVALID");
});
