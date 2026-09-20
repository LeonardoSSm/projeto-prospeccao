import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";

// Centraliza a geração de IDs: UUIDv7 pela aplicação (docs/DOCUMENTATION.md seção 3.1),
// nunca pelo default do banco/Prisma (que geraria UUIDv4).
@Injectable()
export class IdService {
  generate(): string {
    return uuidv7();
  }
}
