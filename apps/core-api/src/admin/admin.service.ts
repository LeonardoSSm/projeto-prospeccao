import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { coerceValue } from "./admin-coercion";
import {
  ADMIN_MODELS,
  IMMUTABLE_FIELDS,
  getAdminModel,
  type AdminModelEntry,
  type PrismaFieldMeta,
  type PrismaModelMeta,
} from "./admin-registry";

export interface AdminModelSummary {
  key: string;
  label: string;
  group: string;
  readOnly: boolean;
  global: boolean;
  searchable: boolean;
  fields: PrismaFieldMeta[];
}

export interface AdminListResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

// Motor genérico por trás da Central de Dados: em vez de 25 controllers/services
// bespoke (um por tabela), lê a forma de cada model direto do DMMF do Prisma
// (gerado a partir do schema.prisma) e usa `this.prisma[modelKey]` — que o
// Prisma Client expõe dinamicamente para todo model — pra listar/ler/editar/
// apagar qualquer um dos 25. O preço dessa generalidade é checagem de tipo em
// tempo de execução em vez de compilação; aceitável aqui porque é uma
// ferramenta interna de ADMIN, não um caminho de escrita do domínio.
@Injectable()
export class AdminService {
  private readonly modelMetaByKey: Map<string, PrismaModelMeta>;

  constructor(private readonly prisma: PrismaService) {
    this.modelMetaByKey = new Map(
      Prisma.dmmf.datamodel.models.map((model) => [toClientKey(model.name), model as unknown as PrismaModelMeta]),
    );
  }

  listModels(): AdminModelSummary[] {
    return ADMIN_MODELS.map((entry) => this.toSummary(entry));
  }

  private toSummary(entry: AdminModelEntry): AdminModelSummary {
    const meta = this.requireMeta(entry.key);
    return {
      key: entry.key,
      label: entry.label,
      group: entry.group,
      readOnly: Boolean(entry.readOnly),
      global: !entry.scopeFilter,
      searchable: Boolean(entry.searchFields?.length),
      fields: meta.fields.filter((field) => field.kind !== "object"),
    };
  }

  async findMany(
    key: string,
    organizationId: string,
    params: { page?: number; pageSize?: number; search?: string; sortField?: string; sortDirection?: "asc" | "desc" },
  ): Promise<AdminListResult> {
    const entry = getAdminModel(key);
    const meta = this.requireMeta(key);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

    const where = this.buildWhere(entry, meta, organizationId, params.search);
    const orderBy = this.buildOrderBy(meta, params.sortField, params.sortDirection);

    const delegate = this.delegateFor(key);
    const [items, total] = await Promise.all([
      delegate.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      delegate.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(key: string, organizationId: string, id: string): Promise<Record<string, unknown>> {
    const entry = getAdminModel(key);
    const where = { id, ...(entry.scopeFilter ? entry.scopeFilter(organizationId) : {}) };
    const record = await this.delegateFor(key).findFirst({ where });
    if (!record) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Registro não encontrado",
        errorCode: "ADMIN_RECORD_NOT_FOUND",
      });
    }
    return record;
  }

  async update(
    key: string,
    organizationId: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const entry = getAdminModel(key);
    if (entry.readOnly) {
      throw new AppException(HttpStatus.FORBIDDEN, {
        title: "Tabela somente leitura",
        detail: `"${entry.label}" não pode ser editada pela Central de Dados.`,
        errorCode: "ADMIN_MODEL_READ_ONLY",
      });
    }

    const meta = this.requireMeta(key);
    let data: Record<string, unknown>;
    try {
      data = this.sanitizePatch(meta, patch);
    } catch (error) {
      throw new AppException(HttpStatus.BAD_REQUEST, {
        title: "Dado inválido",
        detail: error instanceof Error ? error.message : "Não foi possível interpretar os campos enviados.",
        errorCode: "ADMIN_INVALID_PATCH",
      });
    }
    const where = { id, ...(entry.scopeFilter ? entry.scopeFilter(organizationId) : {}) };

    const delegate = this.delegateFor(key);
    const result = await delegate.updateMany({ where, data });
    if (result.count === 0) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Registro não encontrado",
        errorCode: "ADMIN_RECORD_NOT_FOUND",
      });
    }
    return this.findOne(key, organizationId, id);
  }

  async remove(key: string, organizationId: string, id: string): Promise<void> {
    const entry = getAdminModel(key);
    if (entry.readOnly) {
      throw new AppException(HttpStatus.FORBIDDEN, {
        title: "Tabela somente leitura",
        detail: `"${entry.label}" não pode ser apagada pela Central de Dados.`,
        errorCode: "ADMIN_MODEL_READ_ONLY",
      });
    }

    // Apaga por id (única forma seguramente indexada em todo model), mas só
    // depois de confirmar que o registro pertence ao tenant de quem pediu —
    // sem esse findFirst, um ADMIN poderia apagar por id de outro tenant sem
    // nunca ter tido permissão de nem enxergar aquele registro.
    await this.findOne(key, organizationId, id);

    try {
      await this.delegateFor(key).delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new AppException(HttpStatus.CONFLICT, {
          title: "Não é possível apagar",
          detail: "Existem outros registros que dependem deste (chave estrangeira). Apague-os primeiro.",
          errorCode: "ADMIN_DELETE_FOREIGN_KEY",
        });
      }
      throw error;
    }
  }

  private buildWhere(
    entry: AdminModelEntry,
    meta: PrismaModelMeta,
    organizationId: string,
    search: string | undefined,
  ): Record<string, unknown> {
    const scope = entry.scopeFilter ? entry.scopeFilter(organizationId) : {};
    if (!search || !entry.searchFields?.length) return scope;

    const searchable = new Set(meta.fields.map((field) => field.name));
    const or = entry.searchFields
      .filter((field) => searchable.has(field))
      .map((field) => ({ [field]: { contains: search, mode: "insensitive" as const } }));
    if (or.length === 0) return scope;

    return { AND: [scope, { OR: or }] };
  }

  private buildOrderBy(
    meta: PrismaModelMeta,
    sortField: string | undefined,
    sortDirection: "asc" | "desc" | undefined,
  ): Record<string, "asc" | "desc"> {
    const direction = sortDirection === "asc" ? "asc" : "desc";
    const field = meta.fields.find((f) => f.kind === "scalar" && f.name === sortField);
    // `id` é UUIDv7 (docs/DOCUMENTATION.md seção 3.1: gerado pela aplicação,
    // ordenável no tempo) — funciona como "mais recente primeiro" mesmo nos
    // vários models que não têm createdAt próprio (ScoreFactor, AuditFinding...).
    return { [field ? field.name : "id"]: direction };
  }

  // Só passa adiante campos escalares (não-relação) que o Prisma não gerencia
  // sozinho — id/organizationId/createdAt/updatedAt ficam de fora mesmo que o
  // cliente mande, pra um PATCH malicioso ou só descuidado não conseguir
  // trocar o dono do registro nem os timestamps de controle.
  private sanitizePatch(meta: PrismaModelMeta, patch: Record<string, unknown>): Record<string, unknown> {
    const editable = new Map(
      meta.fields.filter((f) => f.kind === "scalar" && !f.isUpdatedAt).map((f) => [f.name, f]),
    );
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (IMMUTABLE_FIELDS.has(key)) continue;
      const field = editable.get(key);
      if (!field) continue;
      data[key] = coerceValue(field, value);
    }
    return data;
  }

  private requireMeta(key: string): PrismaModelMeta {
    const meta = this.modelMetaByKey.get(key);
    if (!meta) {
      throw new Error(`Model "${key}" não encontrado no DMMF do Prisma — registro desatualizado?`);
    }
    return meta;
  }

  // Acesso dinâmico ao delegate do model (this.prisma.lead, this.prisma.job, ...)
  // — é exatamente o que torna este service genérico em vez de 25 cópias quase
  // idênticas. `getAdminModel` já validou que `key` é uma das 25 chaves
  // conhecidas antes de qualquer chamador chegar aqui.
  private delegateFor(key: string): {
    findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
    findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
    count: (args: unknown) => Promise<number>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    delete: (args: unknown) => Promise<Record<string, unknown>>;
  } {
    return (this.prisma as unknown as Record<string, ReturnType<AdminService["delegateFor"]>>)[key];
  }
}

function toClientKey(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  );
}
