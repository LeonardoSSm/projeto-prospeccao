import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module";
import { AiAnalysesController } from "./ai-analyses.controller";
import { AiAnalysesService } from "./ai-analyses.service";
import { AnthropicLlmProvider } from "./providers/anthropic-llm.provider";
import { LLM_PROVIDER } from "./providers/llm-provider.interface";
import { MockLlmProvider } from "./providers/mock-llm.provider";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";

@Module({
  imports: [JobsModule],
  controllers: [AiAnalysesController, ProposalsController],
  providers: [
    MockLlmProvider,
    AnthropicLlmProvider,
    {
      provide: LLM_PROVIDER,
      // Seleção do adaptador por env var (.env.example: LLM_PROVIDER=mock), mesmo
      // padrão do PLACES_PROVIDER em discovery.module.ts. "anthropic" exige
      // LLM_API_KEY configurada — sem isso, cai para o mock em vez de falhar
      // silenciosamente em runtime na primeira chamada.
      useFactory: (mock: MockLlmProvider, anthropic: AnthropicLlmProvider) => {
        const provider = process.env.LLM_PROVIDER ?? "mock";
        if (provider === "mock") return mock;
        if (provider === "anthropic") {
          if (!process.env.LLM_API_KEY) {
            throw new Error('LLM_PROVIDER="anthropic" exige LLM_API_KEY configurada.');
          }
          return anthropic;
        }
        throw new Error(`LLM_PROVIDER="${provider}" não implementado — use "mock" ou "anthropic".`);
      },
      inject: [MockLlmProvider, AnthropicLlmProvider],
    },
    AiAnalysesService,
    ProposalsService,
  ],
})
export class IntelligenceModule {}
