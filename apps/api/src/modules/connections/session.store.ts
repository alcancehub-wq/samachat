import { Inject, Injectable } from '@nestjs/common';
import {
  BufferJSON,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  type AuthenticationCreds,
  type SignalDataTypeMap,
  type SignalKeyStore,
} from '@whiskeysockets/baileys';
import type { Logger } from '@samachat/logger';
import type IORedis from 'ioredis';
import type { ConnectionSession } from './types';

export const CONNECTIONS_REDIS = 'CONNECTIONS_REDIS';

interface StoredAuthState {
  creds: AuthenticationCreds;
  keys: Record<string, Record<string, unknown>>;
}

@Injectable()
export class SessionStore {
  private readonly sessionPrefix = 'samachat:sessions';

  constructor(@Inject(CONNECTIONS_REDIS) private readonly redis: IORedis) {}

  async saveSession(session: ConnectionSession) {
    const key = this.sessionKey(session.sessionId);
    await this.redis.set(key, JSON.stringify(session));
  }

  async loadSession(sessionId: string): Promise<ConnectionSession | null> {
    const key = this.sessionKey(sessionId);
    const payload = await this.redis.get(key);
    if (!payload) {
      return null;
    }
    return JSON.parse(payload) as ConnectionSession;
  }

  async deleteSession(sessionId: string) {
    await this.redis.del(this.sessionKey(sessionId));
  }

  async deleteAuthState(sessionId: string) {
    await this.redis.del(this.authKey(sessionId));
  }

  async publishEvent(eventName: string, payload: Record<string, unknown>) {
    await this.redis.publish(eventName, JSON.stringify(payload));
  }

  async publishBusEvent(event: string, payload: Record<string, unknown>) {
    await this.redis.publish(
      'samachat.events',
      JSON.stringify({
        event,
        payload,
      }),
    );
  }

  async buildAuthState(sessionId: string, logger: Logger) {
    const stored = await this.loadAuthState(sessionId);
    const creds = stored?.creds ?? initAuthCreds();
    const keys = stored?.keys ?? {};

    const keyStore: SignalKeyStore = {
      get: async (type, ids) => {
        const typeKeys = keys[type] ?? {};
        const response: Record<string, unknown> = {};
        for (const id of ids) {
          const value = typeKeys[id];
          if (value) {
            response[id] = value;
          }
        }
        return response as SignalDataTypeMap[typeof type];
      },
      set: async (data) => {
        const entries = Object.entries(data) as [keyof SignalDataTypeMap, SignalDataTypeMap[keyof SignalDataTypeMap]][];
        for (const [category, categoryData] of entries) {
          if (!categoryData) continue;
          keys[category as string] = keys[category as string] ?? {};
          for (const id of Object.keys(categoryData)) {
            const value = categoryData[id];
            if (value) {
              keys[category as string][id] = value as unknown;
            } else {
              delete keys[category as string][id];
            }
          }
        }
        await this.saveAuthState(sessionId, { creds, keys });
      },
    };

    const saveCreds = async () => {
      await this.saveAuthState(sessionId, { creds, keys });
    };

    return {
      state: {
        creds,
        keys: makeCacheableSignalKeyStore(keyStore, logger),
      },
      saveCreds,
    };
  }

  private async loadAuthState(sessionId: string): Promise<StoredAuthState | null> {
    const payload = await this.redis.get(this.authKey(sessionId));
    if (!payload) {
      return null;
    }
    return JSON.parse(payload, BufferJSON.reviver) as StoredAuthState;
  }

  private async saveAuthState(sessionId: string, state: StoredAuthState) {
    await this.redis.set(this.authKey(sessionId), JSON.stringify(state, BufferJSON.replacer));
  }

  private sessionKey(sessionId: string) {
    return `${this.sessionPrefix}:${sessionId}`;
  }

  private authKey(sessionId: string) {
    return `${this.sessionPrefix}:${sessionId}:auth`;
  }
}
