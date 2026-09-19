import { Test } from "@nestjs/testing";
import { HealthCheckService } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./prisma.health";

describe("HealthController", () => {
  it("delegates to HealthCheckService with the Prisma indicator", async () => {
    const check = jest.fn().mockResolvedValue({ status: "ok" });
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check } },
        { provide: PrismaHealthIndicator, useValue: { check: jest.fn() } },
      ],
    }).compile();

    const controller = module.get(HealthController);
    const result = await controller.check();

    expect(check).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "ok" });
  });
});
