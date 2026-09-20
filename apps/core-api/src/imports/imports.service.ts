import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { AppException } from "../common/exceptions/app.exception";
import { LeadsService } from "../leads/leads.service";
import { csvRowExternalId, normalizeHeader, toLeadRow } from "./csv-row.mapper";

export interface ImportSummary {
  totalRows: number;
  accepted: number;
  duplicates: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

const PROVIDER = "CSV_IMPORT";

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private readonly leadsService: LeadsService) {}

  // Síncrono por enquanto: arquivos de campanha piloto (dezenas a poucas centenas de
  // linhas) processam em segundos. Vira job assíncrono (docs/DOCUMENTATION.md seção
  // 2.7 "importação em lote") se o volume real justificar.
  async importCsv(organizationId: string, buffer: Buffer): Promise<ImportSummary> {
    let records: Record<string, string>[];
    try {
      records = parse(buffer, {
        columns: (header: string[]) => header.map(normalizeHeader),
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        title: "CSV inválido",
        detail: (error as Error).message,
        errorCode: "CSV_PARSE_FAILED",
      });
    }

    const summary: ImportSummary = { totalRows: records.length, accepted: 0, duplicates: 0, failed: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const row = toLeadRow(records[i]);
      if (!row) {
        summary.failed += 1;
        summary.errors.push({ row: i + 2, message: "Campos obrigatórios ausentes (legalName/tradeName e city)" });
        continue;
      }

      try {
        const result = await this.leadsService.upsertFromSource({
          organizationId,
          provider: PROVIDER,
          externalId: csvRowExternalId(row),
          legalName: row.legalName,
          tradeName: row.tradeName,
          category: row.category,
          categoriesRaw: [row.category],
          addressLine: row.addressLine,
          city: row.city,
          state: row.state,
          country: row.country,
          phone: row.phone,
          whatsapp: row.whatsapp,
          instagram: row.instagram,
          websiteUrl: row.websiteUrl,
          rating: row.rating,
          reviewCount: row.reviewCount,
          rawPayload: records[i],
        });
        if (result.matchKind === "MATCH") {
          summary.duplicates += 1;
        } else {
          summary.accepted += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({ row: i + 2, message: (error as Error).message });
        this.logger.warn(`Falha ao importar linha ${i + 2}: ${(error as Error).message}`);
      }
    }

    return summary;
  }
}
