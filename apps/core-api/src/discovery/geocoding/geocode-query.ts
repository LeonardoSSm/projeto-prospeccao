export interface GeocodeQueryInput {
  addressLine?: string | null;
  city: string;
  state?: string | null;
  country?: string | null;
}

// String de busca pro Nominatim (free-form `q=`) — não usamos os campos
// estruturados (street=/city=/...) porque o endereço do CNPJ já vem
// pré-formatado em `addressLine` (logradouro + número).
export function buildGeocodeQuery(input: GeocodeQueryInput): string {
  return [input.addressLine, input.city, input.state, input.country ?? "Brasil"]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}
