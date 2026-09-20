import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class GeographyDto {
  @IsString()
  countryCode!: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsString()
  city!: string;

  @IsInt()
  @IsPositive()
  @Max(200)
  radiusKm!: number;
}

export class FiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minimumRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumReviewCount?: number;

  @IsOptional()
  @IsArray()
  @IsIn(["ANY", "NO_WEBSITE", "HAS_WEBSITE"], { each: true })
  websitePresence?: string[];

  @IsInt()
  @IsPositive()
  @Max(500)
  maximumResults!: number;
}

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @ValidateNested()
  @Type(() => GeographyDto)
  geography!: GeographyDto;

  @ValidateNested()
  @Type(() => FiltersDto)
  filters!: FiltersDto;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  providers!: string[];
}
