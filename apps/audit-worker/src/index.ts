import amqplib, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { runAudit } from "./audit/audit-runner";
import type { AuditFailedPayload, AuditRequestedPayload } from "./audit/types";
import { config } from "./config";
import { SsrfBlockedError } from "./ssrf/safe-fetch";

interface RequestEnvelope {
  eventId: string;
  eventType: string;
  correlationId: string;
  payload: AuditRequestedPayload & { retryCount?: number };
}

async function main(): Promise<void> {
  const connection: ChannelModel = await amqplib.connect(config.rabbitmqUrl);
  const channel: Channel = await connection.createChannel();

  await channel.assertQueue(config.auditDlq, { durable: true });
  await channel.assertQueue(config.auditRetryQueue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": config.auditRequestedQueue,
      "x-message-ttl": config.retryDelayMs,
    },
  });
  await channel.assertQueue(config.auditRequestedQueue, { durable: true });
  // Mesmos argumentos declarados pelo consumidor (core-api AuditResultsConsumerService) —
  // o RabbitMQ rejeita uma segunda declaração da mesma fila com argumentos diferentes,
  // não importa qual lado sobe primeiro.
  await channel.assertQueue(config.auditCompletedDlq, { durable: true });
  await channel.assertQueue(config.auditCompletedQueue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": config.auditCompletedDlq,
    },
  });
  await channel.prefetch(config.maxConcurrency);

  console.log(
    `[audit-worker] conectado a ${config.rabbitmqUrl}, consumindo "${config.auditRequestedQueue}" (concorrência=${config.maxConcurrency})`,
  );

  await channel.consume(config.auditRequestedQueue, (message) => void handle(channel, message));

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[audit-worker] recebido ${signal}, encerrando graciosamente`);
    await channel.close();
    await connection.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

async function handle(channel: Channel, message: ConsumeMessage | null): Promise<void> {
  if (!message) return;

  let envelope: RequestEnvelope;
  try {
    envelope = JSON.parse(message.content.toString());
  } catch (error) {
    console.error("[audit-worker] mensagem malformada, descartando", error);
    channel.ack(message);
    return;
  }

  const retryCount = envelope.payload.retryCount ?? 0;
  console.log(
    `[audit-worker] auditando ${envelope.payload.url} (auditRequestId=${envelope.payload.auditRequestId}, tentativa ${retryCount + 1}/${config.maxAttempts})`,
  );

  try {
    const result = await runAudit(envelope.payload);
    publishResult(channel, "website.audit.completed", envelope.correlationId, result);
    channel.ack(message);
    console.log(`[audit-worker] auditoria ${envelope.payload.auditRequestId} concluída`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const isSsrfBlocked = error instanceof SsrfBlockedError;
    console.error(`[audit-worker] falha na auditoria ${envelope.payload.auditRequestId}: ${reason}`);

    // Bloqueio de SSRF é definitivo — reprocessar não muda o resultado.
    const exhausted = retryCount >= config.maxAttempts - 1;
    if (isSsrfBlocked || exhausted) {
      const failedPayload: AuditFailedPayload = {
        auditRequestId: envelope.payload.auditRequestId,
        leadId: envelope.payload.leadId,
        reason,
      };
      publishResult(channel, "website.audit.failed", envelope.correlationId, failedPayload);
      channel.ack(message);
      return;
    }

    const retryEnvelope: RequestEnvelope = {
      ...envelope,
      payload: { ...envelope.payload, retryCount: retryCount + 1 },
    };
    channel.sendToQueue(config.auditRetryQueue, Buffer.from(JSON.stringify(retryEnvelope)), {
      persistent: true,
    });
    channel.ack(message);
  }
}

function publishResult(
  channel: Channel,
  eventType: "website.audit.completed" | "website.audit.failed",
  correlationId: string,
  payload: unknown,
): void {
  channel.sendToQueue(
    config.auditCompletedQueue,
    Buffer.from(JSON.stringify({ eventType, correlationId, payload })),
    { persistent: true },
  );
}

main().catch((error) => {
  console.error("[audit-worker] falha fatal ao iniciar", error);
  process.exit(1);
});
