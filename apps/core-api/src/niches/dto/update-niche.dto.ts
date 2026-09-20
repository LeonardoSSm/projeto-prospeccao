import { IsBoolean, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateNicheDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: "category deve conter apenas letras maiúsculas, números e underscore",
  })
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
