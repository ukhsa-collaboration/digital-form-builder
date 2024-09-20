// CareOBRA - Report an Outbreak Prometheus metrics config
import client from "prom-client";

export const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const pageHits = new client.Counter({
  name: "page_hits_total",
  help: "Total number of page hits",
  labelNames: ["method", "route"],
});
register.registerMetric(pageHits);

export const errorCounter = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors",
  labelNames: ["status_code"],
});
register.registerMetric(errorCounter);

export const webhookSuccessCounter = new client.Counter({
  name: "successful_submissions_total",
  help: "Total number of successful submissions",
  labelNames: ["reference"],
});
register.registerMetric(webhookSuccessCounter);

export const webhookFailureCounter = new client.Counter({
  name: "failed_submissions_total",
  help: "Total number of failed submissions",
  labelNames: ["reference"],
});
register.registerMetric(webhookFailureCounter);
