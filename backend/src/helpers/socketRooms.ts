export const getScopedTicketsRoom = (
  status: string,
  whatsappId?: string | number | null
): string => {
  return whatsappId
    ? `tickets:${status}:whatsapp:${whatsappId}`
    : `tickets:${status}:all`;
};

export const getUserScopedTicketsRoom = (
  status: string,
  userId: string | number
): string => {
  return `tickets:${status}:user:${userId}`;
};

export const getScopedNotificationRoom = (
  whatsappId?: string | number | null
): string => {
  return whatsappId ? `notification:whatsapp:${whatsappId}` : "notification:all";
};

export const getUserScopedNotificationRoom = (
  userId: string | number
): string => {
  return `notification:user:${userId}`;
};

export const getScopedContactRoom = (
  whatsappId?: string | number | null
): string => {
  return whatsappId ? `contact:whatsapp:${whatsappId}` : "contact:all";
};