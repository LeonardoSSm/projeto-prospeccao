import { HttpStatus, Injectable } from "@nestjs/common";
import type { Job, Prisma } from "@prisma/client";
import { IdService } from "../common/id.service";
import { AppException } from "../common/exceptions/app.exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  async create(
    tx: Prisma.TransactionClient,
    params: { organizationId: string; type: string; payload: Record<string, unknown> },
  ): Promise<Job> {
    return tx.job.create({
      data: {
        id: this.idService.generate(),
        organizationId: params.organizationId,
        type: params.type,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  }

  async markRunning(id: string): Promise<void> {
    await this.prisma.job.update({ where: { id }, data: { status: "RUNNING" } });
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.job.update({ where: { id }, data: { status: "COMPLETED" } });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: { status: "FAILED", errorMessage, attemptCount: { increment: 1 } },
    });
  }

  async findById(organizationId: string, id: string): Promise<Job> {
    const job = await this.prisma.job.findFirst({ where: { id, organizationId } });
    if (!job) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Job não encontrado",
        errorCode: "JOB_NOT_FOUND",
      });
    }
    return job;
  }
}
