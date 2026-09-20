import { HttpStatus, Injectable } from "@nestjs/common";
import type { Proposal } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { PrismaService } from "../prisma/prisma.service";
import type { ApproveProposalDto } from "./dto/approve-proposal.dto";
import { renderProposalDraft } from "./proposal-template";
import type { DiagnosisOutput } from "./providers/llm-provider.interface";

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  async generateDraft(organizationId: string, leadId: string): Promise<Proposal> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, { title: "Lead não encontrado", errorCode: "LEAD_NOT_FOUND" });
    }

    const latestAnalysis = await this.prisma.aiAnalysis.findFirst({
      where: { leadId, organizationId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });
    if (!latestAnalysis?.output) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        title: "Nenhum diagnóstico concluído para este lead",
        detail: "Gere um diagnóstico (POST /leads/{id}/ai-analyses) antes de criar uma proposta.",
        errorCode: "NO_DIAGNOSIS_AVAILABLE",
      });
    }

    const previousCount = await this.prisma.proposal.count({ where: { leadId } });
    const content = renderProposalDraft(
      lead.tradeName ?? lead.legalName,
      latestAnalysis.output as unknown as DiagnosisOutput,
    );

    return this.prisma.proposal.create({
      data: {
        id: this.idService.generate(),
        leadId,
        revision: previousCount + 1,
        // Sem uma etapa separada de "submeter para revisão" na API (seção 4.5),
        // o rascunho já nasce pronto para alguém aprovar/rejeitar.
        status: "PENDING_APPROVAL",
        content,
      },
    });
  }

  async findOne(organizationId: string, proposalId: string): Promise<Proposal> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, lead: { organizationId } },
    });
    if (!proposal) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Proposta não encontrada",
        errorCode: "PROPOSAL_NOT_FOUND",
      });
    }
    return proposal;
  }

  async decide(organizationId: string, proposalId: string, dto: ApproveProposalDto): Promise<Proposal> {
    const proposal = await this.findOne(organizationId, proposalId);
    if (proposal.status !== "PENDING_APPROVAL") {
      throw new AppException(HttpStatus.CONFLICT, {
        title: "Proposta não está aguardando aprovação",
        detail: `Status atual: ${proposal.status}.`,
        errorCode: "PROPOSAL_NOT_PENDING",
      });
    }

    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: dto.decision,
        approvedAt: dto.decision === "APPROVED" ? new Date() : null,
      },
    });
  }
}
