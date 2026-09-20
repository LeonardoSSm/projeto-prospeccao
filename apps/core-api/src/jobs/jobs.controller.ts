import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { JobsService } from "./jobs.service";

@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(":id")
  findOne(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.jobsService.findById(organizationId, id);
  }
}
