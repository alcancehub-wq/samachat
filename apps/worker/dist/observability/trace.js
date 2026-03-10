"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTraceContext = extractTraceContext;
exports.injectTraceContext = injectTraceContext;
exports.getTracer = getTracer;
const api_1 = require("@opentelemetry/api");
function extractTraceContext(carrier) {
    if (!carrier) {
        return api_1.context.active();
    }
    return api_1.propagation.extract(api_1.context.active(), carrier);
}
function injectTraceContext() {
    const carrier = {};
    api_1.propagation.inject(api_1.context.active(), carrier);
    return carrier;
}
function getTracer() {
    return api_1.trace.getTracer('samachat-worker');
}
