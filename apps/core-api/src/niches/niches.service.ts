import { HttpStatus, Injectable } from "@nestjs/common";
import type { Niche, Prisma } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateNicheDto } from "./dto/create-niche.dto";
import type { UpdateNicheDto } from "./dto/update-niche.dto";

@Injectable()
export class NichesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  async findMany(organizationId: string, onlyActive: boolean): Promise<Niche[]> {
    return this.prisma.niche.findMany({
      where: { organizationId, ...(onlyActive ? { active: true } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async create(organizationId: string, dto: CreateNicheDto): Promise<Niche> {
    try {
      return await this.prisma.niche.create({
        data: {
          id: this.idService.generate(),
          organizationId,
          name: dto.name,
          category: dto.category,
          description: dto.description,
        },
      });
    } catch (error) {
      this.rethrowAsConflictIfUnique(error);
      throw error;
    }
  }

  async update(organizationId: string, id: string, dto: UpdateNicheDto): Promise<Niche> {
    await this.findOne(organizationId, id);

    const data: Prisma.NicheUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };

    try {
      return await this.prisma.niche.update({ where: { id }, data });
    } catch (error) {
      this.rethrowAsConflictIfUnique(error);
      throw error;
    }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id);
    await this.prisma.niche.delete({ where: { id } });
  }

  private async findOne(organizationId: string, id: string): Promise<Niche> {
    const niche = await this.prisma.niche.findFirst({ where: { id, organizationId } });
    if (!niche) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Nicho não encontrado",
        errorCode: "NICHE_NOT_FOUND",
      });
    }
    return niche;
  }

  private rethrowAsConflictIfUnique(error: unknown): void {
    const isUniqueViolation =
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";
    if (isUniqueViolation) {
      throw new AppException(HttpStatus.CONFLICT, {
        title: "Categoria já cadastrada",
        detail: "Já existe um nicho com essa categoria nesta organização.",
        errorCode: "NICHE_CATEGORY_CONFLICT",
      });
    }
  }
}
