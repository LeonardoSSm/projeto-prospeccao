import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module";
import { LeadsModule } from "../leads/leads.module";
import { DiscoveryService } from "./discovery.service";
import { MockPlacesProvider } from "./providers/mock-places.provider";
import { PLACES_PROVIDER } from "./providers/places-provider.interface";
import { ReceitaFederalPlacesProvider } from "./providers/receita-federal-places.provider";

@Module({
  imports: [LeadsModule, JobsModule],
  providers: [
    MockPlacesProvider,
    ReceitaFederalPlacesProvider,
    {
      provide: PLACES_PROVIDER,
      // Seleção do adaptador por env var (docs/DOCUMENTATION.md .env: PLACES_PROVIDER).
      // "receita_federal" consulta o catálogo de CNPJ importado localmente por
      // apps/core-api/scripts/cnpj-import/ (sem custo, sem chave de API) — ver
      // docs/ANALISE_FONTES_DADOS_PROSPECCAO_LOCAL.md.
      useFactory: (mock: MockPlacesProvider, receitaFederal: ReceitaFederalPlacesProvider) => {
        const provider = process.env.PLACES_PROVIDER ?? "mock";
        if (provider === "receita_federal") return receitaFederal;
        if (provider !== "mock") {
          throw new Error(
            `PLACES_PROVIDER="${provider}" não implementado — use "mock" ou "receita_federal".`,
          );
        }
        return mock;
      },
      inject: [MockPlacesProvider, ReceitaFederalPlacesProvider],
    },
    DiscoveryService,
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
