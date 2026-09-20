export interface DiscoveredPlace {
  externalId: string;
  legalName: string;
  tradeName?: string;
  category: string;
  categoriesRaw: string[];
  addressLine?: string;
  city: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  websiteUrl?: string;
  rating?: number;
  reviewCount?: number;
  raw: Record<string, unknown>;
}

export interface PlacesSearchParams {
  category: string;
  city: string;
  radiusKm: number;
  maxResults: number;
}

// Porta do adaptador de descoberta (docs/DOCUMENTATION.md seção 1.6/2.4: "APIs externas
// encapsuladas por adaptadores"). Um provedor real (Google Places, etc.) implementa a
// mesma interface sem que Campaigns/Discovery/Leads precisem saber a diferença.
export interface PlacesProvider {
  readonly name: string;
  search(params: PlacesSearchParams): Promise<DiscoveredPlace[]>;
}

export const PLACES_PROVIDER = Symbol("PLACES_PROVIDER");
