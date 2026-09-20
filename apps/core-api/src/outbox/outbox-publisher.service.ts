import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import amqplib, { type ChannelModel, type Channel } from "amqplib";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_QUEUE = "prospector.integration-events.v1";
// Eventos com fila dedicada (docs/DOCUMENTATION.md seção 4.14) — o consumidor é um
// serviço específico (o audit-worker), não um observador genérico de barramento.
const EVENT_QUEUE_OVERRIDES: Record<string, string> = {
  "website.audit.requested": "prospector.audit.requested.v1",
};
const ALL_QUEUES = [DEFAULT_QUEUE, ...new Set(Object.values(EVENT_QUEUE_OVERRIDES))];

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 20;

// Publica eventos PENDING do outbox no RabbitMQ. Poll simples por enquanto — evolui
// para LISTEN/NOTIFY ou um scheduler dedicado se a fila de outbox_events crescer o
// suficiente para justificar (seção 2.9).
@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private timer?: NodeJS.Timeout;
  private polling = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
    try {
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();
      for (const queue of ALL_QUEUES) {
        await this.channel.assertQueue(queue, { durable: true });
      }
      this.timer = setInterval(() => void this.publishPending(), POLL_INTERVAL_MS);
      this.logger.log(`Outbox publisher conectado a ${url}, publicando em [${ALL_QUEUES.join(", ")}]`);
    } catch (error) {
      this.logger.error("Falha ao conectar outbox publisher ao RabbitMQ", error as Error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async publishPending(): Promise<void> {
    if (this.polling || !this.channel) return;
    this.polling = true;
    try {
      const pending = await this.prisma.outboxEvent.findMany({
        where: { status: "PENDING", availableAt: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });

      for (const event of pending) {
        const envelope = {
          eventId: event.id,
          eventType: event.eventType,
          eventVersion: event.eventVersion,
          occurredAt: event.createdAt.toISOString(),
          organizationId: event.organizationId,
          correlationId: event.correlationId,
          causationId: event.causationId ?? undefined,
          payload: event.payload,
        };
        const queue = EVENT_QUEUE_OVERRIDES[event.eventType] ?? DEFAULT_QUEUE;
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(envelope)), {
          persistent: true,
        });
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error("Falha ao publicar eventos pendentes do outbox", error as Error);
    } finally {
      this.polling = false;
    }
  }
}
