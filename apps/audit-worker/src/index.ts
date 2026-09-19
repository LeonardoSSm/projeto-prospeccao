import amqplib, { type ChannelModel, type Channel } from "amqplib";
import { config } from "./config";

// Fase 0: apenas prova que o worker conecta ao broker, declara a fila e
// consome com prefetch limitado. A execução real de Playwright/Lighthouse
// entra na Fase 2 (Auditoria) do roadmap.
async function main(): Promise<void> {
  const connection: ChannelModel = await amqplib.connect(config.rabbitmqUrl);
  const channel: Channel = await connection.createChannel();

  await channel.assertQueue(config.auditRequestedQueue, { durable: true });
  await channel.prefetch(config.maxConcurrency);

  console.log(
    `[audit-worker] conectado a ${config.rabbitmqUrl}, consumindo "${config.auditRequestedQueue}"`,
  );

  await channel.consume(config.auditRequestedQueue, (message) => {
    if (!message) return;
    const payload = JSON.parse(message.content.toString());
    console.log("[audit-worker] auditoria recebida (stub)", payload.eventId);
    channel.ack(message);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[audit-worker] recebido ${signal}, encerrando graciosamente`);
    await channel.close();
    await connection.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[audit-worker] falha fatal ao iniciar", error);
  process.exit(1);
});
