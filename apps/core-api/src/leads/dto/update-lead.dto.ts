import { IsIn, IsOptional, IsString } from "class-validator";

// UC-07 (Revisar lead): correção de dados canônicos e decisão de qualificação.
export const DATA_QUALITY_STATUSES = ["NEW", "NEEDS_REVIEW", "REVIEWED", "DISQUALIFIED"];

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(DATA_QUALITY_STATUSES)
  dataQualityStatus?: string;
}
