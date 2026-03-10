"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderByName = getProviderByName;
exports.resolveProviderName = resolveProviderName;
exports.getProviderForEvent = getProviderForEvent;
const config_1 = require("@samachat/config");
const QrProvider_1 = require("./providers/qr/QrProvider");
const WabaProvider_1 = require("./providers/waba/WabaProvider");
const providers = {
    qr: new QrProvider_1.QrProvider(),
    waba: new WabaProvider_1.WabaProvider(),
};
function getProviderByName(name) {
    return providers[name];
}
function resolveProviderName(event) {
    const { providerMode } = (0, config_1.getConfig)();
    if (providerMode === 'hybrid') {
        if (event?.provider && event.provider in providers) {
            return event.provider;
        }
        return 'waba';
    }
    return providerMode;
}
function getProviderForEvent(event) {
    return getProviderByName(resolveProviderName(event));
}
