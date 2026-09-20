import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { uuidv7 } from "uuidv7";

const HEADER = "x-correlation-id";

// docs/DOCUMENTATION.md seção 4.2: correlação ponta a ponta, gerada pelo servidor
// quando ausente no request.
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(HEADER);
    req.correlationId = incoming && incoming.trim().length > 0 ? incoming : uuidv7();
    res.setHeader("X-Correlation-ID", req.correlationId);
    next();
  }
}
