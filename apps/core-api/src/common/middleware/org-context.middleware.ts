import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { DEV_ORGANIZATION_ID } from "../constants";

const HEADER = "x-organization-id";

// TEMPORÁRIO: sem OIDC/JWT implementado ainda (docs/DOCUMENTATION.md seção 5.2/5.3),
// o tenant vem de um header simples, com fallback para a organização semeada localmente.
// Isso deve ser substituído pelo organizationId extraído do token validado antes de
// qualquer ambiente que não seja desenvolvimento local — nenhuma outra parte do
// código deve saber a diferença quando isso acontecer.
@Injectable()
export class OrgContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.header(HEADER);
    req.organizationId = header && header.trim().length > 0 ? header : DEV_ORGANIZATION_ID;
    next();
  }
}
