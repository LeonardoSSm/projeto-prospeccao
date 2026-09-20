import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

// Estágios do funil. WON/LOST são terminais — usados também pelo índice parcial
// idx_leads_next_action (docs/DOCUMENTATION.md seção 3.3: só cobre leads ainda
// ativos, "crm_stage NOT IN ('WON', 'LOST')").
export const CRM_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

export class UpdateCrmDto {
  @IsOptional()
  @IsIn(CRM_STAGES)
  stage?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsISO8601()
  nextActionAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
