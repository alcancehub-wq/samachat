"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderByName = getProviderByName;
exports.resolveProviderName = resolveProviderName;
exports.getProviderForEvent = getProviderForEvent;
const config_1 = require("@samachat/config");
const QrProvider_1 = require("./providers/qr/QrProvider");
const WabaProvider_1 = require("./providers/waba/WabaProvider");
const provider_pool_1 = require("./provider-pool");
function createPool(build, size) {
    const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 1;
    const providers = Array.from({ length: safeSize }, () => build());
    return new provider_pool_1.ProviderPool(providers);
}
const providerPools = {
    qr: createPool(() => new QrProvider_1.QrProvider(), (0, config_1.getConfig)().providerPool.sizes.qr || (0, config_1.getConfig)().providerPool.defaultSize),
    waba: createPool(() => new WabaProvider_1.WabaProvider(), (0, config_1.getConfig)().providerPool.sizes.waba || (0, config_1.getConfig)().providerPool.defaultSize),
};
function getProviderByName(name) {
    return providerPools[name].next();
}
function resolveProviderName(event) {
    const { providerMode } = (0, config_1.getConfig)();
    if (providerMode === 'hybrid') {
        if (event?.provider && event.provider in providerPools) {
            return event.provider;
        }
        return 'waba';
    }
    return providerMode;
}
function getProviderForEvent(event) {
    return getProviderByName(resolveProviderName(event));
}
