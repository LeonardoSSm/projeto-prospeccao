const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export async function fetchApiHealth(): Promise<{ status: string }> {
  const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "/health");
  const response = await fetch(healthUrl);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}
