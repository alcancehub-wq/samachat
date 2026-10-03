import { randomBytes } from "crypto";
import { Sequelize } from "sequelize";
import AssessCrmIntegrationReadiness, {
  CrmReadinessOptions
} from "../AssessCrmIntegrationReadiness";
import { SourceBridgeTableMatches } from "../VerifyContactSourceBridgeSchema";

const identity = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  integrationId: "synthetic-integration",
  sourceInstanceId: "synthetic-instance"
};
function setup(): CrmReadinessOptions & {
  query: jest.Mock;
  transport: jest.Mock;
} {
  const query = jest.fn(async () => {
    throw new Error("SQL_FORBIDDEN_IN_PURE_TEST");
  });
  const transport = jest.fn(async () => {
    throw new Error("TRANSPORT_FORBIDDEN");
  });
  return {
    enabled: true,
    scope: "synthetic_lab",
    authorizeAssessment: () => true,
    identity,
    configuration: {
      identity,
      m2m: {
        endpoint: "https://synthetic.invalid/m2m",
        approvedEndpoint: "https://synthetic.invalid/m2m",
        keyId: "ephemeral-key",
        secret: randomBytes(32)
      },
      transport
    },
    clock: () => new Date("2026-10-03T15:00:00.000Z"),
    database: { query } as unknown as Sequelize,
    targetDatabase: "r15_readiness_lab",
    query,
    transport
  };
}
afterEach(() => jest.restoreAllMocks());
it.each([undefined, false])(
  "default disabled %s never reads or sends",
  async enabled => {
    const options = setup();
    const authorizeAssessment = jest.fn(() => true);
    const result = await AssessCrmIntegrationReadiness({
      ...options,
      enabled,
      authorizeAssessment
    });
    expect(result.status).toBe("DISABLED");
    expect(result.productionActivationAuthorized).toBe(false);
    expect(options.query).not.toHaveBeenCalled();
    expect(options.transport).not.toHaveBeenCalled();
    expect(authorizeAssessment).not.toHaveBeenCalled();
  }
);
it("HTTP body cannot authorize or enable assessment and does not change next call", async () => {
  const options = setup();
  const input = {
    ...options,
    enabled: undefined,
    authorizeAssessment: undefined,
    body: {
      enabled: true,
      productionActivationAuthorized: true,
      authorizeAssessment: true
    }
  };
  expect((await AssessCrmIntegrationReadiness(input)).status).toBe("DISABLED");
  expect(
    (await AssessCrmIntegrationReadiness({ ...input, enabled: true })).matrix
      .LOCAL_CONFIGURATION.codes
  ).toContain("READINESS_AUTHORIZATION_REQUIRED");
  expect((await AssessCrmIntegrationReadiness()).status).toBe("DISABLED");
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
});
it.each([
  [
    "organization",
    (value: CrmReadinessOptions): CrmReadinessOptions => ({
      ...value,
      identity: {
        ...identity,
        organizationId: "00000000-0000-4000-8000-000000000002"
      }
    }),
    "DELIVERY_SCOPE_INVALID"
  ],
  [
    "integration",
    (value: CrmReadinessOptions): CrmReadinessOptions => ({
      ...value,
      identity: { ...identity, integrationId: "different" }
    }),
    "DELIVERY_SCOPE_INVALID"
  ],
  [
    "instance",
    (value: CrmReadinessOptions): CrmReadinessOptions => ({
      ...value,
      identity: { ...identity, sourceInstanceId: "different" }
    }),
    "DELIVERY_SCOPE_INVALID"
  ],
  [
    "identity missing",
    (value: CrmReadinessOptions): CrmReadinessOptions => ({
      ...value,
      identity: undefined
    }),
    "ORIGIN_IDENTITY_INVALID"
  ],
  [
    "scope",
    (value: CrmReadinessOptions): CrmReadinessOptions => ({
      ...value,
      scope: undefined
    }),
    "READINESS_LAB_SCOPE_REQUIRED"
  ],
  [
    "clock",
    (value: CrmReadinessOptions): CrmReadinessOptions => ({
      ...value,
      clock: () => new Date(NaN)
    }),
    "DELIVERY_CLOCK_INVALID"
  ]
] as const)("%s rejects before SQL", async (_name, change, code) => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness(change(options));
  expect(result.status).toBe("LOCAL_PREFLIGHT_BLOCKED");
  expect(result.matrix.LOCAL_CONFIGURATION.codes).toContain(code);
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
});
it.each([
  "http://synthetic.invalid/m2m",
  "https://synthetic.invalid/not-approved",
  "https://user:password@synthetic.invalid/m2m",
  "https://synthetic.invalid/m2m#fragment"
])("endpoint %s rejected without transport", async endpoint => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness({
    ...options,
    configuration: {
      ...options.configuration,
      m2m: { ...options.configuration!.m2m!, endpoint }
    }
  });
  expect(result.matrix.LOCAL_CONFIGURATION.state).toBe("BLOCKED");
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain(endpoint);
});
it.each([0, 31])("signing material %s bytes rejected", async size => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness({
    ...options,
    configuration: {
      ...options.configuration,
      m2m: { ...options.configuration!.m2m!, secret: randomBytes(size) }
    }
  });
  expect(result.matrix.LOCAL_CONFIGURATION.codes).toContain(
    "DELIVERY_CONFIGURATION_INVALID"
  );
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
});
it.each([
  { leaseMs: 14999 },
  { leaseMs: 300001 },
  { backoffMs: 29999 },
  { backoffMs: 3600001 },
  { maxOperations: 0 },
  { maxOperations: 11 },
  { leaseMs: 15000.5 }
])("invalid policy %p rejected", async policy => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness({
    ...options,
    configuration: { ...options.configuration, policy }
  });
  expect(result.matrix.LOCAL_CONFIGURATION.codes).toContain(
    "DELIVERY_POLICY_INVALID"
  );
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
});
it.each(["", "invalid key"])("key ID %s rejected", async keyId => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness({
    ...options,
    configuration: {
      ...options.configuration,
      m2m: { ...options.configuration!.m2m!, keyId }
    }
  });
  expect(result.matrix.LOCAL_CONFIGURATION.state).toBe("BLOCKED");
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
});
it("unprovisioned transport rejected without SQL", async () => {
  const options = setup();
  expect(
    (
      await AssessCrmIntegrationReadiness({
        ...options,
        configuration: { ...options.configuration, transport: undefined }
      })
    ).matrix.LOCAL_CONFIGURATION.state
  ).toBe("BLOCKED");
  expect(options.query).not.toHaveBeenCalled();
});
it("valid configuration does not invoke transport and redacts driver failure", async () => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness(options);
  expect(result.matrix.LOCAL_CONFIGURATION.state).toBe("PASS_LAB_ONLY");
  expect(result.matrix.LOCAL_SCHEMA.codes).toContain(
    "SCHEMA_METADATA_UNAVAILABLE"
  );
  expect(result.production).toBe("PRODUCTION_NOT_VERIFIED");
  expect(result.matrix.ACTIVATION_DECISION.state).toBe("FORBIDDEN");
  expect(result.matrix.M2M_REMOTE_DEPENDENCIES.state).toBe("NOT_VERIFIED");
  expect(options.transport).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain("SQL_FORBIDDEN_IN_PURE_TEST");
});
it.each([0, 1, 2])("case mode %s reuses source guard", mode => {
  expect(SourceBridgeTableMatches("Contacts", "Contacts", mode)).toBe(true);
  expect(SourceBridgeTableMatches("contacts", "Contacts", mode)).toBe(
    mode !== 0
  );
});

it("server-side authorization denial blocks before SQL and transport", async () => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness({
    ...options,
    authorizeAssessment: () => false
  });
  expect(result.matrix.LOCAL_CONFIGURATION.codes).toEqual([
    "READINESS_AUTHORIZATION_REQUIRED"
  ]);
  expect(result.matrix.IMMUTABILITY_GUARDS.state).toBe("NOT_VERIFIED");
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
  expect(result.productionActivationAuthorized).toBe(false);
});
it("authorization exceptions never leak input or authorize production", async () => {
  const options = setup();
  const result = await AssessCrmIntegrationReadiness({
    ...options,
    authorizeAssessment: () => {
      throw new Error("SYNTHETIC_PRIVATE_AUTH_DETAILS");
    }
  });
  expect(result.status).toBe("LOCAL_PREFLIGHT_BLOCKED");
  expect(JSON.stringify(result)).not.toContain(
    "SYNTHETIC_PRIVATE_AUTH_DETAILS"
  );
  expect(options.query).not.toHaveBeenCalled();
  expect(options.transport).not.toHaveBeenCalled();
  expect(result.productionActivationAuthorized).toBe(false);
});
