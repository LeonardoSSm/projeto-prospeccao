import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CurrentUserId } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

// Endpoint mínimo para a interface web listar quem pode ser responsável por um
// lead (PATCH /leads/{id}/crm) — não existe uma Fase "Identity" própria no
// roadmap (0-6), então isso fica junto do necessário mínimo até um módulo de
// Identity & Access de verdade (com OIDC real, seção 5.2) existir.
@ApiTags("identity")
@Controller("members")
export class MembersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findMany(@CurrentOrganizationId() organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { role: "asc" },
    });
    return {
      items: memberships.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        email: m.user.email,
        role: m.role,
      })),
    };
  }

  // Usado pelo frontend só pra saber o próprio papel (ex.: mostrar ou não o
  // link da Central de Dados) — a garantia de verdade é sempre o AdminRoleGuard
  // no backend, isto aqui é UX, não controle de acesso.
  @Get("me")
  async me(@CurrentOrganizationId() organizationId: string, @CurrentUserId() userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId, status: "ACTIVE" },
      include: { user: true },
    });
    if (!membership) return null;
    return {
      userId: membership.userId,
      displayName: membership.user.displayName,
      email: membership.user.email,
      role: membership.role,
      organizationId,
    };
  }
}
