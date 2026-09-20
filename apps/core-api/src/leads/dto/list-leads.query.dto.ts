import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const WEBSITE_STATUSES = ["NO_WEBSITE", "SOCIAL_ONLY", "HAS_WEBSITE", "SITE_UNREACHABLE", "UNKNOWN"];

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return Array.isArray(value) ? value : String(value).split(",");
}

export class ListLeadsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsIn(WEBSITE_STATUSES, { each: true })
  websiteStatus?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  crmStage?: string[];

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @IsOptional()
  @IsString()
  cursor?: string;
}
