import { Controller, HttpStatus, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { AppException } from "../common/exceptions/app.exception";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { ImportsService } from "./imports.service";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CSV_MIME_TYPES = ["text/csv", "text/plain", "application/vnd.ms-excel", "application/csv"];

// Validação por mimetype OU extensão: navegadores e SOs divergem muito no
// Content-Type que enviam para .csv (é comum chegar como application/octet-stream).
function isCsvFile(file: Express.Multer.File): boolean {
  return CSV_MIME_TYPES.includes(file.mimetype) || file.originalname.toLowerCase().endsWith(".csv");
}

@ApiTags("imports")
@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post("leads")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SIZE_BYTES } }))
  async importLeads(
    @CurrentOrganizationId() organizationId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        title: "Arquivo ausente",
        detail: 'Envie o CSV no campo "file" (multipart/form-data).',
        errorCode: "FILE_REQUIRED",
      });
    }
    if (!isCsvFile(file)) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        title: "Tipo de arquivo inválido",
        detail: "Apenas arquivos .csv são aceitos.",
        errorCode: "INVALID_FILE_TYPE",
      });
    }
    return this.importsService.importCsv(organizationId, file.buffer);
  }
}
