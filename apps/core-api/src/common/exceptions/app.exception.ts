import { HttpException, HttpStatus } from "@nestjs/common";

interface AppExceptionBody {
  title: string;
  detail?: string;
  errorCode: string;
  violations?: Array<{ field: string; code: string; message: string }>;
}

// Exceção de domínio com forma estável, traduzida pelo ProblemDetailsFilter para
// application/problem+json (docs/DOCUMENTATION.md seção 4.4).
export class AppException extends HttpException {
  constructor(status: HttpStatus, body: AppExceptionBody) {
    super(body, status);
  }
}
