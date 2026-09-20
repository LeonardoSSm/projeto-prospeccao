import { SetMetadata } from "@nestjs/common";

// Marca uma rota como isenta do JwtAuthGuard global (ver jwt-auth.guard.ts).
// Hoje só /health usa isto — endpoints de negócio sempre exigem um usuário
// autenticado e vinculado a uma organização.
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
