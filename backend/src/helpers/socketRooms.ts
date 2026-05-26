export const getScopedTicketsRoom = (
  status: string,
  whatsappId?: string | number | null
): string => {
  return whatsappId
    ? `tickets:${status}:whatsapp:${whatsappId}`
    : `tickets:${status}:all`;
};

export const getScopedNotificationRoom = (
  whatsappId?: string | number | null
): string => {
  return whatsappId ? `notification:whatsapp:${whatsappId}` : "notification:all";
};

export const getScopedContactRoom = (
  whatsappId?: string | number | null
): string => {
  return whatsappId ? `contact:whatsapp:${whatsappId}` : "contact:all";
};