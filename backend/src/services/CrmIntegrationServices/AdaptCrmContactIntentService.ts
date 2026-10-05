import {
  MessageProvenance,
  ResolveMessageProvenance
} from "../../providers/WhatsApp/MessageProvenance";
import BuildCrmContactIntentService, {
  CrmContactIntentInput
} from "./BuildCrmContactIntentService";

export default function AdaptCrmContactIntentService(
  input: CrmContactIntentInput,
  metadata?: { readonly messageProvenance?: MessageProvenance } | null
) {
  if (
    input?.context?.channel === "manual" &&
    input.context.provenance === "manual"
  ) {
    return BuildCrmContactIntentService(input);
  }
  const provenance = ResolveMessageProvenance(metadata);
  const kind = provenance.kind;
  return BuildCrmContactIntentService({
    ...input,
    context: {
      ...input?.context,
      fromMe: kind === "outbound" ? true : input?.context?.fromMe,
      channel:
        kind === "reconciliation" ? "reconciliation" : input?.context?.channel,
      provenance: ["realtime", "echo", "history", "ack"].includes(kind)
        ? (kind as "realtime" | "echo" | "history" | "ack")
        : "unknown"
    }
  });
}
