import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { buildGeocodeQuery, type GeocodeQueryInput } from "./geocode-query";

// Nominatim público: no máximo 1 req/s e um User-Agent identificável, sob
// risco de banimento de IP (docs/ANALISE_FONTES_DADOS_PROSPECCAO_LOCAL.md
// seção 5). Uma fila em processo — sem persistência entre restarts do
// core-api — é suficiente pro volume do piloto: geocodificação é um
// enriquecimento best-effort, não um dado que bloqueia qualquer fluxo.
const MIN_INTERVAL_MS = 1100;
const USER_AGENT = "ProspectorPlatform/1.0 (+https://github.com/LeonardoSSm/projeto-prospeccao)";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface QueueItem {
  leadId: string;
  query: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

@Injectable()
export class NominatimGeocodingService implements OnModuleDestroy {
  private readonly logger = new Logger(NominatimGeocodingService.name);
  private readonly queue: QueueItem[] = [];
  private draining = false;
  private stopped = false;

  constructor(private readonly prisma: PrismaService) {}

  // Nunca bloqueia quem chama — a criação do lead já terminou antes disto
  // rodar. Chamado por LeadsService.upsertFromSource para todo lead novo sem
  // coordenadas (hoje, só os vindos da Receita Federal; o mock já gera
  // lat/long fake).
  enqueue(leadId: string, input: GeocodeQueryInput): void {
    const query = buildGeocodeQuery(input);
    if (!query) return;
    this.queue.push({ leadId, query });
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (!this.stopped && this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;
        await this.geocodeOne(item);
        if (this.queue.length > 0) {
          await sleep(MIN_INTERVAL_MS);
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private async geocodeOne(item: QueueItem): Promise<void> {
    try {
      const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(item.query)}`;
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) {
        throw new Error(`Nominatim respondeu HTTP ${response.status}`);
      }
      const results = (await response.json()) as NominatimResult[];
      const first = results[0];
      if (!first) {
        this.logger.debug(`Nominatim sem resultado para lead ${item.leadId}: "${item.query}"`);
        return;
      }
      await this.prisma.lead.update({
        where: { id: item.leadId },
        data: { latitude: Number(first.lat), longitude: Number(first.lon) },
      });
    } catch (error) {
      this.logger.warn(`Falha ao geocodificar lead ${item.leadId}: ${(error as Error).message}`);
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
