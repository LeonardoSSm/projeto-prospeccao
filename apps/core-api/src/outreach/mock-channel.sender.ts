import { Injectable, Logger } from "@nestjs/common";
import { uuidv7 } from "uuidv7";
import type { ChannelSender, SendMessageRequest, SendMessageResult } from "./channel-sender.interface";

@Injectable()
export class MockChannelSender implements ChannelSender {
  readonly name = "MOCK";
  private readonly logger = new Logger(MockChannelSender.name);

  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    this.logger.log(
      `[simulado] enviando ${request.channel} para ${request.recipientValue}: "${request.content.slice(0, 60)}..."`,
    );
    return { externalMessageId: uuidv7(), sentAt: new Date() };
  }
}
