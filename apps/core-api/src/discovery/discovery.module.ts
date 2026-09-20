import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module";
import { LeadsModule } from "../leads/leads.module";
import { DiscoveryService } from "./discovery.service";
import { MockPlacesProvider } from "./providers/mock-places.provider";
import { PLACES_PROVIDER } from "./providers/places-provider.interface";

@Module({
  imports: [LeadsModule, JobsModule],
  providers: [
    MockPlacesProvider,
    {
      provide: PLACES_PROVIDER,
      // Seleção do adaptador por env var (docs/DOCUMENTATION.md .env: PLACES_PROVIDER).
      // Só existe o mock por enquanto; um provedor real (ex.: Google Places) se
      // registra aqui sem que Campaigns/Leads mudem uma linha sequer.
      useFactory: (mock: MockPlacesProvider) => {
        const provider = process.env.PLACES_PROVIDER ?? "mock";
        if (provider !== "mock") {
          throw new Error(
            `PLACES_PROVIDER="${provider}" não implementado ainda — apenas "mock" está disponível nesta fase.`,
          );
        }
        return mock;
      },
      inject: [MockPlacesProvider],
    },
    DiscoveryService,
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
