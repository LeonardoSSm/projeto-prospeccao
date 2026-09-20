import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpStatus, ValidationPipe, type ValidationError } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppException } from "./common/exceptions/app.exception";
import { ProblemDetailsFilter } from "./common/filters/problem-details.filter";

interface Violation {
  field: string;
  code: string;
  message: string;
}

// class-validator aninha erros de DTOs internos (@ValidateNested) em `children`,
// em vez de repetir tudo em `constraints` no nível raiz — é preciso descer
// recursivamente para não perder violações de campos como `filters.minimumRating`.
function flattenValidationErrors(errors: ValidationError[], parentPath = ""): Violation[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownViolations = Object.entries(error.constraints ?? {}).map(([code, message]) => ({
      field: path,
      code: code.toUpperCase(),
      message,
    }));
    const childViolations = error.children?.length
      ? flattenValidationErrors(error.children, path)
      : [];
    return [...ownViolations, ...childViolations];
  });
}

function toValidationException(errors: ValidationError[]): AppException {
  const violations = flattenValidationErrors(errors);
  return new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
    title: "A requisição possui campos inválidos",
    detail: "Corrija os campos indicados e tente novamente.",
    errorCode: "VALIDATION_FAILED",
    violations,
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // PATCH usa JSON Merge Patch (docs/DOCUMENTATION.md seção 4.1) — sem isto, o
  // parser padrão do Express só entende Content-Type: application/json e
  // descartaria o corpo de um PATCH enviado com o content-type correto.
  app.useBodyParser("json", { type: ["application/json", "application/merge-patch+json"] });

  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: toValidationException,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Prospector Core API")
    .setDescription("API de descoberta, auditoria, score e CRM de leads")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
}

bootstrap();
