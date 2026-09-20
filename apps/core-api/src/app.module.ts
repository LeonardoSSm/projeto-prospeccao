import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { OrgContextMiddleware } from "./common/middleware/org-context.middleware";
import { CommonModule } from "./common/common.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { HealthModule } from "./health/health.module";
import { ImportsModule } from "./imports/imports.module";
import { JobsModule } from "./jobs/jobs.module";
import { LeadsModule } from "./leads/leads.module";
import { OutboxModule } from "./outbox/outbox.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    OutboxModule,
    HealthModule,
    JobsModule,
    LeadsModule,
    DiscoveryModule,
    CampaignsModule,
    ImportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, OrgContextMiddleware).forRoutes("*");
  }
}
