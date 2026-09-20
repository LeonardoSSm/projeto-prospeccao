import { Global, Module } from "@nestjs/common";
import { IdService } from "./id.service";
import { NormalizationService } from "./normalization.service";

@Global()
@Module({
  providers: [IdService, NormalizationService],
  exports: [IdService, NormalizationService],
})
export class CommonModule {}
