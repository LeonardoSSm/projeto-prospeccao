// "Recomendações só podem citar evidências presentes no snapshot de entrada"
// (docs/DOCUMENTATION.md seção 5.5) — resolve um caminho tipo "audit.performance"
// dentro do snapshot e confirma que o valor existe de verdade, em vez de confiar
// cegamente na citação que o modelo devolveu.
export function evidencePathExists(snapshot: unknown, path: string): boolean {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return false;

  let current: unknown = snapshot;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined;
}
