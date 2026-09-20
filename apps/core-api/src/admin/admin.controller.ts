import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { AdminRoleGuard } from "./admin-role.guard";
import { AdminService } from "./admin.service";

// Tudo aqui embaixo de /admin fica atrás do AdminRoleGuard — ver o comentário
// no guard sobre por que isto exige mais que só estar autenticado.
@ApiTags("admin")
@UseGuards(AdminRoleGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("models")
  listModels() {
    return { items: this.adminService.listModels() };
  }

  @Get("models/:key")
  findMany(
    @CurrentOrganizationId() organizationId: string,
    @Param("key") key: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("sortField") sortField?: string,
    @Query("sortDirection") sortDirection?: "asc" | "desc",
  ) {
    return this.adminService.findMany(key, organizationId, {
      page: page ? Number.parseInt(page, 10) : undefined,
      pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
      search,
      sortField,
      sortDirection,
    });
  }

  @Get("models/:key/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("key") key: string,
    @Param("id") id: string,
  ) {
    return this.adminService.findOne(key, organizationId, id);
  }

  @Patch("models/:key/:id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("key") key: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.update(key, organizationId, id, body);
  }

  @Delete("models/:key/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("key") key: string,
    @Param("id") id: string,
  ) {
    return this.adminService.remove(key, organizationId, id);
  }
}
