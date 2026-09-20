import { IsIn, IsOptional, IsString } from "class-validator";

export class ApproveOutreachMessageDto {
  @IsIn(["APPROVED", "REJECTED"])
  decision!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  comment?: string;
}
