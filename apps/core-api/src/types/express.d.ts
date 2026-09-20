// Campos anexados por CorrelationIdMiddleware e OrgContextMiddleware.
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      organizationId: string;
    }
  }
}

export {};
