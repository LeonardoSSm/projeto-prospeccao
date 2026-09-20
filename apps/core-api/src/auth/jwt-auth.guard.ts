import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { User } from "@prisma/client";
import type { Request } from "express";
import { AppException } from "../common/exceptions/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { JwtVerifierService, type OidcClaims } from "./jwt-verifier.service";

// Guard global (registrado via APP_GUARD em auth.module.ts) que substitui o
// antigo OrgContextMiddleware: em vez de confiar num header X-Organization-Id
// enviado pelo cliente, valida o Bearer token OIDC e deriva organizationId da
// Membership ativa do usuário autenticado — nenhum outro código precisou
// mudar (CurrentOrganizationId continua lendo request.organizationId).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerifier: JwtVerifierService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (!token) {
      throw new AppException(HttpStatus.UNAUTHORIZED, {
        title: "Autenticação obrigatória",
        detail: "Envie o header Authorization: Bearer <token>.",
        errorCode: "AUTH_TOKEN_MISSING",
      });
    }

    let claims: OidcClaims;
    try {
      claims = await this.jwtVerifier.verify(token);
    } catch {
      throw new AppException(HttpStatus.UNAUTHORIZED, {
        title: "Token inválido",
        detail: "O token informado é inválido, expirou ou não pôde ser verificado.",
        errorCode: "AUTH_TOKEN_INVALID",
      });
    }

    const user = await this.resolveUser(claims);
    if (!user) {
      throw new AppException(HttpStatus.FORBIDDEN, {
        title: "Usuário não provisionado",
        detail: "Este usuário está autenticado, mas não existe no Prospector.",
        errorCode: "AUTH_USER_NOT_PROVISIONED",
      });
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { id: "asc" },
    });
    if (!membership) {
      throw new AppException(HttpStatus.FORBIDDEN, {
        title: "Usuário sem organização ativa",
        detail: "Este usuário não possui vínculo ativo com nenhuma organização.",
        errorCode: "AUTH_NO_ACTIVE_MEMBERSHIP",
      });
    }

    request.userId = user.id;
    request.organizationId = membership.organizationId;
    request.membershipRole = membership.role;
    return true;
  }

  // Casa primeiro pelo `sub` (caminho normal, após o primeiro login). Se não
  // achar, casa por e-mail — cobre os usuários semeados por prisma/seed.ts,
  // que nascem com um oidc_subject legível (ex.: "dev-admin") em vez do sub
  // real do Keycloak — e grava o sub real, então a próxima requisição já
  // resolve direto por ele.
  private async resolveUser(claims: OidcClaims): Promise<User | null> {
    const bySubject = await this.prisma.user.findUnique({ where: { oidcSubject: claims.sub } });
    if (bySubject) return bySubject;

    if (!claims.email) return null;

    const byEmail = await this.prisma.user.findFirst({ where: { email: claims.email } });
    if (!byEmail) return null;

    return this.prisma.user.update({ where: { id: byEmail.id }, data: { oidcSubject: claims.sub } });
  }
}
