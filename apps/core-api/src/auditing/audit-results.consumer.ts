import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import amqplib, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { AuditingService } from "./auditing.service";
import type { AuditCompletedPayload, AuditFailedPayload } from "./audit-results.types";

const QUEUE = "prospector.audit.completed.v1";
const DLQ = "prospector.audit.completed.dlq.v1";

interface ResultEnvelope {
  eventType: "website.audit.completed" | "website.audit.failed";
  correlationId: string;
  payload: AuditCompletedPayload | AuditFailedPayload;
}

// Consome os resultados publicados pelo audit-worker (docs/DOCUMENTATION.md seção
// 4.14) e aplica no domínio via AuditingService. Mensagem malformada ou erro de
// aplicação vai para a DLQ em vez de derrubar o consumidor ou girar em loop.
@Injectable()
export class AuditResultsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditResultsConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly auditingService: AuditingService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
    try {
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(DLQ, { durable: true });
      await this.channel.assertQueue(QUEUE, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": "",
          "x-dead-letter-routing-key": DLQ,
        },
      });
      await this.channel.prefetch(5);
      await this.channel.consume(QUEUE, (message) => void this.handle(message));
      this.logger.log(`Consumindo resultados de auditoria em "${QUEUE}"`);
    } catch (error) {
      this.logger.error("Falha ao conectar consumidor de resultados de auditoria", error as Error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async handle(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) return;

    try {
      const envelope: ResultEnvelope = JSON.parse(message.content.toString());
      if (envelope.eventType === "website.audit.completed") {
        await this.auditingService.applyCompleted(
          envelope.payload as AuditCompletedPayload,
          envelope.correlationId,
        );
      } else if (envelope.eventType === "website.audit.failed") {
        await this.auditingService.applyFailed(envelope.payload as AuditFailedPayload, envelope.correlationId);
      } else {
        this.logger.warn(`Tipo de evento desconhecido ignorado: ${(envelope as { eventType?: string }).eventType}`);
      }
      this.channel.ack(message);
    } catch (error) {
      this.logger.error("Falha ao processar resultado de auditoria — enviando para DLQ", error as Error);
      this.channel.nack(message, false, false);
    }
  }
}
