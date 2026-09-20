import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface Violation {
  field: string;
  code: string;
  message: string;
}

interface ProblemBody {
  title?: string;
  detail?: string;
  errorCode?: string;
  violations?: Violation[];
  message?: string | string[];
  error?: string;
}

// Traduz qualquer exceção para application/problem+json (RFC 9457), conforme
// docs/DOCUMENTATION.md seção 4.4. Nunca expõe stack trace, SQL ou segredo.
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let title = "Erro inesperado";
    let detail: string | undefined;
    let errorCode = "INTERNAL_ERROR";
    let violations: Violation[] | undefined;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const parsed: ProblemBody = typeof body === "string" ? { message: body } : (body as ProblemBody);

      if (parsed.errorCode) {
        title = parsed.title ?? exception.message;
        detail = parsed.detail;
        errorCode = parsed.errorCode;
        violations = parsed.violations;
      } else {
        title = parsed.error ?? exception.message;
        detail = Array.isArray(parsed.message) ? undefined : parsed.message;
        errorCode = (parsed.error ?? "HTTP_ERROR").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
      }
    } else {
      this.logger.error(
        `Erro não tratado em ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).type("application/problem+json").json({
      type: `https://api.prospector.local/problems/${errorCode.toLowerCase().replace(/_/g, "-")}`,
      title,
      status,
      ...(detail ? { detail } : {}),
      instance: request.originalUrl,
      errorCode,
      correlationId: request.correlationId,
      ...(violations ? { violations } : {}),
    });
  }
}
