import { IsIn, IsString, IsUUID } from "class-validator";

export const OUTREACH_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"];

export class CreateOutreachMessageDto {
  @IsUUID()
  leadId!: string;

  @IsIn(OUTREACH_CHANNELS)
  channel!: string;

  @IsString()
  content!: string;
}
