import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditingModule } from "./auditing/auditing.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { OrgContextMiddleware } from "./common/middleware/org-context.middleware";
import { CommonModule } from "./common/common.module";
import { CrmModule } from "./crm/crm.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { HealthModule } from "./health/health.module";
import { IdentityModule } from "./identity/identity.module";
import { ImportsModule } from "./imports/imports.module";
import { IntelligenceModule } from "./intelligence/intelligence.module";
import { JobsModule } from "./jobs/jobs.module";
import { LeadsModule } from "./leads/leads.module";
import { OutboxModule } from "./outbox/outbox.module";
import { OutreachModule } from "./outreach/outreach.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ScoringModule } from "./scoring/scoring.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    OutboxModule,
    HealthModule,
    JobsModule,
    ScoringModule,
    LeadsModule,
    DiscoveryModule,
    CampaignsModule,
    ImportsModule,
    AuditingModule,
    IntelligenceModule,
    CrmModule,
    OutreachModule,
    IdentityModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, OrgContextMiddleware).forRoutes("*");
  }
}
