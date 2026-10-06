import Contact from "../../models/Contact";
import sequelize from "../../database";
import { logger } from "../../utils/logger";
import CrmDeliveryCoordinator from "./CrmDeliveryCoordinator";
import {
  CrmM2mHttpsTransport
} from "./CrmM2mClient";
import {
  BuildCrmM2mIdentityFromMapping,
  LoadCrmIntegrationMapping
} from "./CrmIntegrationMappingService";
import {
  ResolveCrmM2mSecret
} from "./CrmM2mSecretResolver";
import EnvironmentCrmM2mSecretProvider from "./EnvironmentCrmM2mSecretProvider";
import SequelizeCrmOriginJournalRepository from "./SequelizeCrmOriginJournalRepository";
import {
  ReadCrmM2mLocalIntegrationId,
  ReadCrmM2mRuntimeFlags
} from "./CrmM2mRuntimeConfiguration";

type ExecutorState =
  | "OFF"
  | "RUNNING"
  | "WAITING_CONFIGURATION"
  | "WORKERS_DISABLED"
  | "ERROR";

interface ExecutorStatus {
  readonly state: ExecutorState;
  readonly lastTickAt: string | null;
  readonly lastResult: string | null;
  readonly lastErrorCode: string | null;
}

const intervalMs = 30000;
let status: ExecutorStatus = {
  state: "OFF",
  lastTickAt: null,
  lastResult: null,
  lastErrorCode: null
};

const safeErrorCode = (error: unknown): string =>
  error instanceof Error && /^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(error.message)
    ? error.message
    : "executor_tick_failed";

const safeResultCode = (code?: string): string | null =>
  code && /^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(code) ? code : null;

export function GetCrmM2mDeliveryExecutorStatus(): ExecutorStatus {
  return { ...status };
}

export default function StartCrmM2mDeliveryExecutor(
  workersEnabled: boolean
): () => void {
  const flags = ReadCrmM2mRuntimeFlags();
  if (!flags.executorEnabled || !flags.deliveryEnabled) {
    status = {
      state: "OFF",
      lastTickAt: null,
      lastResult: null,
      lastErrorCode: null
    };
    return () => undefined;
  }
  if (!workersEnabled) {
    status = {
      state: "WORKERS_DISABLED",
      lastTickAt: null,
      lastResult: null,
      lastErrorCode: "run_workers_disabled"
    };
    logger.error(
      { code: "CRM_M2M_EXECUTOR_REQUIRES_WORKERS" },
      "CRM M2M executor was not started"
    );
    return () => undefined;
  }

  let localIntegrationId: number | null;
  try {
    localIntegrationId = ReadCrmM2mLocalIntegrationId();
  } catch (error) {
    const code = safeErrorCode(error);
    status = {
      state: "ERROR",
      lastTickAt: null,
      lastResult: null,
      lastErrorCode: code
    };
    logger.error({ code }, "CRM M2M executor was not started");
    return () => undefined;
  }

  if (!localIntegrationId) {
    status = {
      state: "ERROR",
      lastTickAt: null,
      lastResult: null,
      lastErrorCode: "integration_id_missing"
    };
    logger.error(
      { code: "CRM_M2M_INTEGRATION_ID_MISSING" },
      "CRM M2M executor was not started"
    );
    return () => undefined;
  }
  const integrationId = localIntegrationId;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  status = {
    state: "RUNNING",
    lastTickAt: null,
    lastResult: null,
    lastErrorCode: null
  };

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => {
      void tick();
    }, intervalMs);
  };

  const tick = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      const mapping = await LoadCrmIntegrationMapping(integrationId);
      if (
        !mapping ||
        !mapping.enabled ||
        !mapping.syncEnabled
      ) {
        status = {
          ...status,
          state: "WAITING_CONFIGURATION",
          lastTickAt: new Date().toISOString(),
          lastResult: "mapping_disabled",
          lastErrorCode: null
        };
        return;
      }

      const secret = await ResolveCrmM2mSecret(
        mapping.secretReference,
        new EnvironmentCrmM2mSecretProvider()
      );
      const identity = BuildCrmM2mIdentityFromMapping(mapping);
      const repository = new SequelizeCrmOriginJournalRepository(
        sequelize,
        Contact
      );
      const coordinator = new CrmDeliveryCoordinator(repository, {
        enabled: true,
        identity,
        m2m: {
          endpoint: mapping.endpoint,
          approvedEndpoint: mapping.approvedEndpoint,
          keyId: mapping.keyId,
          secret
        },
        transport: CrmM2mHttpsTransport
      });
      const result = await coordinator.runOnce(identity);
      if (stopped) return;
      status = {
        state: "RUNNING",
        lastTickAt: new Date().toISOString(),
        lastResult: result.state,
        lastErrorCode: safeResultCode(result.code)
      };
    } catch (error) {
      const code = safeErrorCode(error);
      if (stopped) return;
      status = {
        state: "ERROR",
        lastTickAt: new Date().toISOString(),
        lastResult: null,
        lastErrorCode: code
      };
      logger.error({ code }, "CRM M2M executor tick failed");
    } finally {
      running = false;
      schedule();
    }
  };

  void tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    status = {
      state: "OFF",
      lastTickAt: status.lastTickAt,
      lastResult: status.lastResult,
      lastErrorCode: null
    };
  };
}
