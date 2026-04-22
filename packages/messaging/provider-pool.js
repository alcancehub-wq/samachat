"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderPool = void 0;
class ProviderPool {
    providers;
    index = 0;
    constructor(providers) {
        if (!providers.length) {
            throw new Error('ProviderPool requires at least one provider');
        }
        this.providers = providers;
    }
    next() {
        const provider = this.providers[this.index % this.providers.length];
        this.index = (this.index + 1) % this.providers.length;
        return provider;
    }
    size() {
        return this.providers.length;
    }
}
exports.ProviderPool = ProviderPool;
