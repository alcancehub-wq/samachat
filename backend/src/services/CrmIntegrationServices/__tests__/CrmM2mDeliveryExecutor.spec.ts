jest.mock("../../../database", () => ({
  __esModule: true,
  default: {}
}));
jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: {}
}));
jest.mock("../../../utils/logger", () => ({
  logger: {
    error: jest.fn()
  }
}));
jest.mock("../CrmIntegrationMappingService", () => ({
  BuildCrmM2mIdentityFromMapping: jest.fn(),
  LoadCrmIntegrationMapping: jest.fn()
}));

import StartCrmM2mDeliveryExecutor, {
  GetCrmM2mDeliveryExecutorStatus
} from "../CrmM2mDeliveryExecutor";
import { logger } from "../../../utils/logger";

const runtimeFlagNames = [
  "SAMACHAT_CRM_M2M_CAPTURE_ENABLED",
  "SAMACHAT_CRM_M2M_DELIVERY_ENABLED",
  "SAMACHAT_CRM_M2M_EXECUTOR_ENABLED",
  "SAMACHAT_CRM_M2M_INTEGRATION_ID"
] as const;
let originalEnvironment: Partial<Record<(typeof runtimeFlagNames)[number], string>>;

describe("CRM M2M delivery executor gates", () => {
  beforeEach(() => {
    originalEnvironment = {};
    runtimeFlagNames.forEach(name => {
      originalEnvironment[name] = process.env[name];
      delete process.env[name];
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    runtimeFlagNames.forEach(name => {
      const value = originalEnvironment[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });

  it("stays off unless delivery and executor have separate explicit flags", () => {
    const stop = StartCrmM2mDeliveryExecutor(true);

    expect(GetCrmM2mDeliveryExecutorStatus()).toMatchObject({
      state: "OFF",
      lastErrorCode: null
    });
    expect(logger.error).not.toHaveBeenCalled();
    stop();
  });

  it("does not start from RUN_WORKERS alone or when workers are disabled", () => {
    process.env.SAMACHAT_CRM_M2M_DELIVERY_ENABLED = "true";
    process.env.SAMACHAT_CRM_M2M_EXECUTOR_ENABLED = "true";
    process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID = "7";

    const stop = StartCrmM2mDeliveryExecutor(false);

    expect(GetCrmM2mDeliveryExecutorStatus()).toMatchObject({
      state: "WORKERS_DISABLED",
      lastErrorCode: "run_workers_disabled"
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    stop();
  });

  it("reports an invalid local integration ID without starting a loop", () => {
    process.env.SAMACHAT_CRM_M2M_DELIVERY_ENABLED = "true";
    process.env.SAMACHAT_CRM_M2M_EXECUTOR_ENABLED = "true";
    process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID = "invalid";

    expect(() => StartCrmM2mDeliveryExecutor(true)).not.toThrow();
    expect(GetCrmM2mDeliveryExecutorStatus()).toMatchObject({
      state: "ERROR",
      lastErrorCode: "CRM_M2M_INTEGRATION_ID_INVALID"
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
