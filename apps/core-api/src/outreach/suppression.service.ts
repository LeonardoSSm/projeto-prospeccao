import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { IdService } from "../common/id.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SuppressionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  // Hash determinístico do canal+valor normalizado — nunca o valor em claro
  // (docs/DOCUMENTATION.md seções 3.3 e 5.7). SHA-256 é suficiente aqui: o
  // objetivo é impedir reimportação/novo contato, não proteger senha.
  private hash(channel: string, normalizedValue: string): string {
    return createHash("sha256").update(`${channel}:${normalizedValue}`).digest("hex");
  }

  async isSuppressed(organizationId: string, channel: string, normalizedValue: string): Promise<boolean> {
    const hash = this.hash(channel, normalizedValue);
    const found = await this.prisma.contactSuppression.findUnique({
      where: { organizationId_channel_normalizedValueHash: { organizationId, channel, normalizedValueHash: hash } },
    });
    return found !== null;
  }

  async suppress(organizationId: string, channel: string, normalizedValue: string, reason: string): Promise<void> {
    const hash = this.hash(channel, normalizedValue);
    await this.prisma.contactSuppression.upsert({
      where: { organizationId_channel_normalizedValueHash: { organizationId, channel, normalizedValueHash: hash } },
      update: { reason },
      create: {
        id: this.idService.generate(),
        organizationId,
        channel,
        normalizedValueHash: hash,
        reason,
      },
    });
  }
}
