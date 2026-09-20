import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AppException } from "../common/exceptions/app.exception";

// A Central de Dados enxerga e edita qualquer tabela do tenant (e, pra
// algumas, o catálogo global inteiro) — é o ponto de maior "raio de
// explosão" de toda a API, então fica atrás do papel mais alto (ADMIN), não
// só autenticação (JwtAuthGuard já roda antes, globalmente).
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.membershipRole !== "ADMIN") {
      throw new AppException(HttpStatus.FORBIDDEN, {
        title: "Acesso restrito",
        detail: "A Central de Dados é exclusiva para usuários com papel ADMIN.",
        errorCode: "ADMIN_ROLE_REQUIRED",
      });
    }
    return true;
  }
}
