export interface WwebjsIncomingEventDedupInput {
  cache: Map<string, number>;
  now: number;
  ttlMs: number;
  sessionId: number;
  eventName: string;
  messageId: string;
  from?: string;
  to?: string;
}

export const resolveWwebjsIncomingEventFamily = (
  eventName: string
): "message" | "media_uploaded" =>
  eventName === "media_uploaded" ? "media_uploaded" : "message";

export const shouldProcessWwebjsIncomingEvent = ({
  cache,
  now,
  ttlMs,
  sessionId,
  eventName,
  messageId,
  from = "",
  to = ""
}: WwebjsIncomingEventDedupInput): boolean => {
  const eventFamily = resolveWwebjsIncomingEventFamily(eventName);

  const cacheKey =
    `${sessionId}:${eventFamily}:${messageId}:${from}:${to}`;

  const seenAt = cache.get(cacheKey);

  if (seenAt !== undefined && now - seenAt <= ttlMs) {
    return false;
  }

  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }

  cache.set(cacheKey, now);

  return true;
};