"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = exports.CONNECTIONS_REDIS = void 0;
const common_1 = require("@nestjs/common");
const baileys_1 = require("@whiskeysockets/baileys");
exports.CONNECTIONS_REDIS = 'CONNECTIONS_REDIS';
let SessionStore = class SessionStore {
    redis;
    sessionPrefix = 'samachat:sessions';
    constructor(redis) {
        this.redis = redis;
    }
    async saveSession(session) {
        const key = this.sessionKey(session.sessionId);
        await this.redis.set(key, JSON.stringify(session));
    }
    async loadSession(sessionId) {
        const key = this.sessionKey(sessionId);
        const payload = await this.redis.get(key);
        if (!payload) {
            return null;
        }
        return JSON.parse(payload);
    }
    async deleteSession(sessionId) {
        await this.redis.del(this.sessionKey(sessionId));
    }
    async deleteAuthState(sessionId) {
        await this.redis.del(this.authKey(sessionId));
    }
    async publishEvent(eventName, payload) {
        await this.redis.publish(eventName, JSON.stringify(payload));
    }
    async publishBusEvent(event, payload) {
        await this.redis.publish('samachat.events', JSON.stringify({
            event,
            payload,
        }));
    }
    async buildAuthState(sessionId, logger) {
        const stored = await this.loadAuthState(sessionId);
        const creds = stored?.creds ?? (0, baileys_1.initAuthCreds)();
        const keys = stored?.keys ?? {};
        const keyStore = {
            get: async (type, ids) => {
                const typeKeys = (keys[type] ?? {});
                const response = {};
                for (const id of ids) {
                    const value = typeKeys[id];
                    if (value !== undefined) {
                        response[id] = value;
                    }
                }
                return response;
            },
            set: async (data) => {
                const entries = Object.entries(data);
                for (const [category, categoryData] of entries) {
                    if (!categoryData)
                        continue;
                    const bucket = (keys[category] ?? {});
                    keys[category] = bucket;
                    for (const id of Object.keys(categoryData)) {
                        const value = categoryData[id];
                        if (value !== undefined && value !== null) {
                            bucket[id] = value;
                        }
                        else {
                            delete bucket[id];
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
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(keyStore, logger),
            },
            saveCreds,
        };
    }
    async loadAuthState(sessionId) {
        const payload = await this.redis.get(this.authKey(sessionId));
        if (!payload) {
            return null;
        }
        return JSON.parse(payload, baileys_1.BufferJSON.reviver);
    }
    async saveAuthState(sessionId, state) {
        await this.redis.set(this.authKey(sessionId), JSON.stringify(state, baileys_1.BufferJSON.replacer));
    }
    sessionKey(sessionId) {
        return `${this.sessionPrefix}:${sessionId}`;
    }
    authKey(sessionId) {
        return `${this.sessionPrefix}:${sessionId}:auth`;
    }
};
exports.SessionStore = SessionStore;
exports.SessionStore = SessionStore = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [Function])
], SessionStore);
