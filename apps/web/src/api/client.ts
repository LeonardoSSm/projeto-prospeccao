const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errorCode?: string;
  violations?: Array<{ field: string; code: string; message: string }>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: ProblemDetails,
  ) {
    super(problem.title);
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  ifMatch?: number;
}

// Wrapper único de fetch: content-type/If-Match padronizados e erros sempre
// convertidos em ApiError com o Problem Details original (docs/DOCUMENTATION.md
// seção 4.4), em vez de cada tela tratar fetch cru.
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { ifMatch, body, headers, ...rest } = options;
  // PATCH usa JSON Merge Patch (docs/DOCUMENTATION.md seção 4.1); os demais
  // verbos usam JSON comum.
  const requestContentType = rest.method === "PATCH" ? "application/merge-patch+json" : "application/json";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": requestContentType,
      ...(ifMatch !== undefined ? { "If-Match": `"${ifMatch}"` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const responseContentType = response.headers.get("content-type") ?? "";
  const parsed = responseContentType.includes("json") ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, parsed as ProblemDetails);
  }
  return parsed as T;
}

export async function fetchApiHealth(): Promise<{ status: string }> {
  const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "/health");
  const response = await fetch(healthUrl);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}
