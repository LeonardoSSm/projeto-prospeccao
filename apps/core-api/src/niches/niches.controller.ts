import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CreateNicheDto } from "./dto/create-niche.dto";
import { UpdateNicheDto } from "./dto/update-niche.dto";
import { NichesService } from "./niches.service";

@ApiTags("niches")
@Controller("niches")
export class NichesController {
  constructor(private readonly nichesService: NichesService) {}

  @Get()
  findMany(
    @CurrentOrganizationId() organizationId: string,
    @Query("onlyActive") onlyActive?: string,
  ) {
    return this.nichesService.findMany(organizationId, onlyActive !== "false");
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentOrganizationId() organizationId: string, @Body() dto: CreateNicheDto) {
    return this.nichesService.create(organizationId, dto);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: UpdateNicheDto,
  ) {
    return this.nichesService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.nichesService.remove(organizationId, id);
  }
}
