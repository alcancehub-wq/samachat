"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const serviceName = process.env.OTEL_SERVICE_NAME || 'samachat-api';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const traceExporter = otlpEndpoint
    ? new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: otlpEndpoint })
    : new sdk_trace_base_1.ConsoleSpanExporter();
const sdk = new sdk_node_1.NodeSDK({
    resource: new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
});
sdk.start();
process.on('SIGTERM', () => {
    sdk.shutdown();
});
