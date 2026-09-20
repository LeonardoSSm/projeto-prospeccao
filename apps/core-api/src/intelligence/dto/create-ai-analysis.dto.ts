import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateAiAnalysisDto {
  @IsIn(["COMMERCIAL_DIAGNOSIS"])
  kind: string = "COMMERCIAL_DIAGNOSIS";

  @IsOptional()
  @IsString()
  language = "pt-BR";

  @IsOptional()
  @IsIn(["DIRECT_AND_PROFESSIONAL", "FRIENDLY", "FORMAL"])
  tone = "DIRECT_AND_PROFESSIONAL";

  @IsOptional()
  @IsIn(["LATEST_VERIFIED_ONLY", "ALL"])
  evidenceScope = "LATEST_VERIFIED_ONLY";
}
