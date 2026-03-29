/**
 * OpenTelemetry SDK bootstrap.
 *
 * MUST be imported before any other module in server.ts so that
 * auto-instrumentation can patch libraries at load time.
 *
 * Set OTEL_ENABLED=true in env to activate.
 * Set OTEL_EXPORTER_OTLP_ENDPOINT to your collector (e.g. http://localhost:4318).
 * Defaults to console exporter when no endpoint is configured.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const ENABLED = process.env.OTEL_ENABLED === "true";

if (ENABLED) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const serviceName = process.env.OTEL_SERVICE_NAME ?? "core-app";
  const serviceVersion = process.env.npm_package_version ?? "0.0.0";

  const exporter = endpoint ? new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }) : undefined;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy fs instrumentation
        "@opentelemetry/instrumentation-fs": { enabled: false },
        // Tune HTTP to avoid tracing health-check noise
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) => req.url === "/api/health",
        },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
