import {
  BufferJSON,
  fetchLatestBaileysVersion,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  makeWASocket,
  type SignalDataTypeMap,
  type SignalKeyStore,
  type WASocket,
} from '@whiskeysockets/baileys';
import type IORedis from 'ioredis';
import { PrismaClient } from '@samachat/db';
import { getLogger } from '@samachat/logger';

const prisma = new PrismaClient();
const logger = getLogger({ service: 'worker', component: 'baileys' });
const socketCache = new Map<string, { socket: WASocket; ready: Promise<void> }>();
const SESSION_PREFIX = 'samachat:sessions';
let cachedVersion: [number, number, number] | undefined;

interface StoredAuthState {
  creds: ReturnType<typeof initAuthCreds>;
  keys: Record<string, Record<string, unknown>>;
}

interface OutboundPayload {
  tenantId?: string;
  sessionId?: string;
  jid: string;
  text: string;
  type?: string;
  mediaUrl?: string | null;
  mediaMime?: string | null;
}

async function getVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }
  const { version } = await fetchLatestBaileysVersion();
  cachedVersion = version;
  return version;
}

async function getSessionId(tenantId?: string, sessionId?: string) {
  if (sessionId) {
    return sessionId;
  }
  if (!tenantId) {
    throw new Error('Missing tenantId for Baileys send');
  }
  const session = await prisma.whatsappSession.findFirst({
    where: {
      tenant_id: tenantId,
      status: 'CONNECTED',
    },
    orderBy: { last_connected_at: 'desc' },
  });
  if (!session) {
    throw new Error('No connected WhatsApp session for tenant');
  }
  return session.session_id;
}

async function loadAuthState(redis: IORedis, sessionId: string): Promise<StoredAuthState> {
  const payload = await redis.get(`${SESSION_PREFIX}:${sessionId}:auth`);
  if (!payload) {
    return { creds: initAuthCreds(), keys: {} };
  }
  return JSON.parse(payload, BufferJSON.reviver) as StoredAuthState;
}

async function saveAuthState(redis: IORedis, sessionId: string, state: StoredAuthState) {
  await redis.set(
    `${SESSION_PREFIX}:${sessionId}:auth`,
    JSON.stringify(state, BufferJSON.replacer),
  );
}

function buildKeyStore(keys: Record<string, Record<string, unknown>>, sessionId: string, redis: IORedis) {
  const authState = { creds: initAuthCreds(), keys };
  const keyStore: SignalKeyStore = {
    get: async (type, ids) => {
      const typeKeys = (keys[type] ?? {}) as Record<string, SignalDataTypeMap[typeof type]>;
      const response: Record<string, SignalDataTypeMap[typeof type]> = {};
      for (const id of ids) {
        const value = typeKeys[id];
        if (value !== undefined) {
          response[id] = value;
        }
      }
      return response;
    },
    set: async (data) => {
      const entries = Object.entries(data) as [
        keyof SignalDataTypeMap,
        SignalDataTypeMap[keyof SignalDataTypeMap] | null | undefined,
      ][];
      for (const [category, categoryData] of entries) {
        if (!categoryData) continue;
        const bucket = (keys[category as string] ?? {}) as Record<string, unknown>;
        keys[category as string] = bucket;
        for (const id of Object.keys(categoryData as Record<string, unknown>)) {
          const value = (categoryData as Record<string, unknown>)[id];
          if (value !== undefined && value !== null) {
            bucket[id] = value;
          } else {
            delete bucket[id];
          }
        }
      }
      await saveAuthState(redis, sessionId, { creds: authState.creds, keys });
    },
  };

  return { keyStore, authState };
}

async function createSocket(redis: IORedis, sessionId: string) {
  const stored = await loadAuthState(redis, sessionId);
  const { keyStore, authState } = buildKeyStore(stored.keys, sessionId, redis);
  authState.creds = stored.creds;

  const version = await getVersion();
  const socket = makeWASocket({
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(keyStore, logger),
    },
    printQRInTerminal: false,
    logger,
    version,
    browser: ['Samachat', 'Chrome', '1.0.0'],
  });

  socket.ev.on('creds.update', () => {
    void saveAuthState(redis, sessionId, { creds: authState.creds, keys: stored.keys });
  });

  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Baileys connection timeout'));
    }, 10000);

    socket.ev.on('connection.update', (update) => {
      if (update.connection === 'open') {
        clearTimeout(timeout);
        resolve();
      }
      if (update.connection === 'close') {
        clearTimeout(timeout);
        reject(new Error('Baileys connection closed'));
      }
    });
  });

  socketCache.set(sessionId, { socket, ready });
  return { socket, ready };
}

async function getSocket(redis: IORedis, sessionId: string) {
  const cached = socketCache.get(sessionId);
  if (cached) {
    return cached;
  }
  return createSocket(redis, sessionId);
}

function buildSendPayload(payload: OutboundPayload) {
  const messageType = payload.type ?? 'text';
  switch (messageType) {
    case 'image':
      return { image: { url: payload.mediaUrl ?? '' }, caption: payload.text };
    case 'video':
      return { video: { url: payload.mediaUrl ?? '' }, caption: payload.text };
    case 'audio':
      return { audio: { url: payload.mediaUrl ?? '' }, mimetype: payload.mediaMime ?? undefined };
    case 'document':
      return {
        document: { url: payload.mediaUrl ?? '' },
        caption: payload.text,
        mimetype: payload.mediaMime ?? 'application/pdf',
      };
    default:
      return { text: payload.text };
  }
}

export async function sendBaileysOutbound(redis: IORedis, payload: OutboundPayload) {
  const sessionId = await getSessionId(payload.tenantId, payload.sessionId);
  const { socket, ready } = await getSocket(redis, sessionId);
  await ready;

  const sendPayload = buildSendPayload(payload);
  logger.info(
    { tenantId: payload.tenantId, sessionId, jid: payload.jid },
    'BAILEYS SEND',
  );
  return socket.sendMessage(payload.jid, sendPayload);
}
