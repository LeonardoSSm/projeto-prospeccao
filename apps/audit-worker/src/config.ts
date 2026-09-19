export const config = {
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://localhost:5672",
  auditRequestedQueue: "prospector.audit.requested.v1",
  maxConcurrency: Number(process.env.AUDIT_MAX_CONCURRENCY ?? 2),
  timeoutMs: Number(process.env.AUDIT_TIMEOUT_MS ?? 90000),
};
