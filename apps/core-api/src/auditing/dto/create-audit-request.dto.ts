import { IsBoolean, IsIn, IsOptional, IsUrl } from "class-validator";

export class CreateAuditRequestDto {
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsIn(["MOBILE", "DESKTOP"])
  profile: string = "MOBILE";

  @IsOptional()
  @IsBoolean()
  force = false;
}
