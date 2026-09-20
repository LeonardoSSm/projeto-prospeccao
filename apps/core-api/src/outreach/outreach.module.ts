import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module";
import { CHANNEL_SENDER } from "./channel-sender.interface";
import { MockChannelSender } from "./mock-channel.sender";
import { OutreachController } from "./outreach.controller";
import { OutreachService } from "./outreach.service";
import { SuppressionService } from "./suppression.service";

@Module({
  imports: [JobsModule],
  controllers: [OutreachController],
  providers: [
    MockChannelSender,
    // Só o mock está implementado (ver nota em channel-sender.interface.ts) — a
    // seleção por env var fica pronta para quando um canal real for uma decisão
    // deliberada, mesmo padrão de PLACES_PROVIDER/LLM_PROVIDER.
    {
      provide: CHANNEL_SENDER,
      useFactory: (mock: MockChannelSender) => {
        const channel = process.env.OUTREACH_CHANNEL_PROVIDER ?? "mock";
        if (channel !== "mock") {
          throw new Error(`OUTREACH_CHANNEL_PROVIDER="${channel}" não implementado — só "mock" está disponível.`);
        }
        return mock;
      },
      inject: [MockChannelSender],
    },
    SuppressionService,
    OutreachService,
  ],
})
export class OutreachModule {}
