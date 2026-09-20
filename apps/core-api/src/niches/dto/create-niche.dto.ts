import { IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateNicheDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  // Mesmo formato usado por discovery.service.ts/mock-places.provider.ts:
  // categoria em maiúsculas/underscore, ex.: "DENTIST".
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: "category deve conter apenas letras maiúsculas, números e underscore",
  })
  category!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
