// Campos anexados por CorrelationIdMiddleware e JwtAuthGuard.
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      organizationId: string;
      userId: string;
      membershipRole: string;
    }
  }
}

export {};
