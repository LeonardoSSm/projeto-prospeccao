import { IsIn, IsString } from "class-validator";
import { OUTREACH_CHANNELS } from "./create-outreach-message.dto";

export class SuppressContactDto {
  @IsIn(OUTREACH_CHANNELS)
  channel!: string;

  @IsString()
  reason!: string;
}
