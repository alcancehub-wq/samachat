export type MessageProvenanceKind =
  | "realtime"
  | "history"
  | "echo"
  | "outbound"
  | "reconciliation"
  | "ack"
  | "unknown";

export type MessageProvenanceProvider =
  | "wwebjs"
  | "whaileys"
  | "cloud_api"
  | "unknown";

export interface MessageProvenance {
  readonly kind: MessageProvenanceKind;
  readonly provider: MessageProvenanceProvider;
}

interface ProvenanceEvidence {
  readonly provider: MessageProvenanceProvider;
  readonly event?: string;
  readonly fromMe?: boolean;
}

export const IdentifyMessageProvenance = ({
  provider,
  event,
  fromMe
}: ProvenanceEvidence): MessageProvenance => {
  let kind: MessageProvenanceKind = "unknown";

  if (provider === "wwebjs") {
    if (event === "reconciliation") kind = "reconciliation";
    else if (event === "sync_unread") kind = "history";
    else if (event === "message_ack") kind = "ack";
    else if (
      ["message", "message_create", "media_uploaded"].includes(event || "")
    ) {
      if (fromMe === true) kind = "outbound";
      else if (fromMe === false) kind = "realtime";
    }
  } else if (provider === "whaileys") {
    if (event === "append") kind = "history";
    else if (event === "notify") {
      if (fromMe === true) kind = "outbound";
      else if (fromMe === false) kind = "realtime";
    }
  } else if (provider === "cloud_api") {
    if (event === "smb_message_echoes") kind = "echo";
    else if (event === "history") kind = "history";
    else if (event === "statuses") kind = "ack";
    else if (event === "messages") {
      if (fromMe === true) kind = "outbound";
      else if (fromMe === false) kind = "realtime";
    }
  } else {
    return { kind: "unknown", provider: "unknown" };
  }

  return { kind, provider };
};

export const ResolveMessageProvenance = (
  context: { readonly messageProvenance?: MessageProvenance } | null | undefined
): MessageProvenance => {
  const value = context?.messageProvenance;

  if (
    !value ||
    !["wwebjs", "whaileys", "cloud_api"].includes(value.provider) ||
    ![
      "realtime",
      "history",
      "echo",
      "outbound",
      "reconciliation",
      "ack",
      "unknown"
    ].includes(value.kind)
  ) {
    return { kind: "unknown", provider: "unknown" };
  }

  return { kind: value.kind, provider: value.provider };
};
