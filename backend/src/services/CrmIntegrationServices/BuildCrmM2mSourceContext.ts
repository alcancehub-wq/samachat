import { randomUUID } from "crypto";
import { MessageProvenance } from "../../providers/WhatsApp/MessageProvenance";
import {
  BuildCrmM2mIdentityFromMapping,
  LoadCrmIntegrationMapping
} from "./CrmIntegrationMappingService";
import {
  UpdateContactSourceContext
} from "./CaptureUpdateContactSourceBridge";
import { CreateContactSourceContext } from "./CaptureCreateContactSourceBridge";
import {
  NormalizeCrmM2mPhone,
  ReadCrmM2mLocalIntegrationId,
  ReadCrmM2mRuntimeFlags
} from "./CrmM2mRuntimeConfiguration";

interface SourceContextInput {
  readonly number?: string | null;
  readonly isGroup: boolean;
}

const loadCaptureContext = async (
  input: SourceContextInput,
  context: CreateContactSourceContext["context"],
  metadata?: CreateContactSourceContext["metadata"]
): Promise<CreateContactSourceContext | null> => {
  if (input.isGroup || !NormalizeCrmM2mPhone(input.number)) return null;
  if (!ReadCrmM2mRuntimeFlags().captureEnabled) return null;

  const localIntegrationId = ReadCrmM2mLocalIntegrationId();
  if (!localIntegrationId) return null;
  const mapping = await LoadCrmIntegrationMapping(localIntegrationId);
  if (!mapping || !mapping.enabled) return null;

  return {
    enabled: true,
    identity: BuildCrmM2mIdentityFromMapping(mapping),
    captureKey: randomUUID(),
    correlationId: randomUUID(),
    phoneE164: NormalizeCrmM2mPhone(input.number),
    bindingStatus: "not_linked",
    context,
    metadata
  };
};

export async function BuildManualCreateContactSourceContext(
  input: SourceContextInput
): Promise<CreateContactSourceContext | null> {
  return loadCaptureContext(input, {
    channel: "manual",
    provenance: "manual",
    fromMe: false,
    isGroup: false,
    authorized: true
  });
}

export async function BuildManualUpdateContactSourceContext(
  input: SourceContextInput & { readonly previousNumber?: string | null }
): Promise<UpdateContactSourceContext | null> {
  const context = await loadCaptureContext(input, {
    channel: "manual",
    provenance: "manual",
    fromMe: false,
    isGroup: false,
    authorized: true
  });
  return context
    ? {
        ...context,
        previousPhoneE164: NormalizeCrmM2mPhone(input.previousNumber)
      }
    : null;
}

export async function BuildRealtimeInboundContactSourceContext(
  input: SourceContextInput & {
    readonly fromMe: unknown;
    readonly messageProvenance?: MessageProvenance;
  }
): Promise<CreateContactSourceContext | null> {
  const provenance = input.messageProvenance;
  if (
    input.fromMe !== false ||
    input.isGroup ||
    !provenance ||
    provenance.kind !== "realtime" ||
    !["wwebjs", "whaileys", "cloud_api"].includes(provenance.provider)
  ) {
    return null;
  }

  return loadCaptureContext(
    input,
    {
      channel: "whatsapp_inbound",
      provenance: "realtime",
      fromMe: false,
      isGroup: false,
      authorized: true
    },
    { messageProvenance: provenance }
  );
}
