import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtVerifierService } from "./jwt-verifier.service";

@Global()
@Module({
  providers: [JwtVerifierService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [JwtVerifierService],
})
export class AuthModule {}
