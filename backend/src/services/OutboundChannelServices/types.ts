import Whatsapp from "../../models/Whatsapp";

export type OutboundChannelMode =
  | "STANDARD"
  | "OFFICIAL";

export type OutboundChannelContext =
  | "schedule"
  | "campaign"
  | "flow";

export interface ResolveOutboundChannelRequest {
  mode?: OutboundChannelMode | null;
  context: OutboundChannelContext;
  ownerUserId: number;
  actorProfile?: string | null;
  actorQueueIds?: number[];
  existingTicketWhatsappId?: number | null;
  officialWhatsappId?: number | null;
}

export interface ResolvedOutboundChannel {
  mode: OutboundChannelMode;
  context: OutboundChannelContext;
  ownerUserId: number;
  whatsappId: number;
  providerType: string;
  whatsapp: Whatsapp;
}
