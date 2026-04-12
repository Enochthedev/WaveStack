import { INTEGRATIONS, CatalogIntegration } from "./integrations";

export type { CatalogIntegration };

export function getCatalog(category?: string): CatalogIntegration[] {
  let items = INTEGRATIONS.filter((i) => i.enabled);
  if (category) items = items.filter((i) => i.category === category);
  return items;
}

export function getIntegration(slug: string): CatalogIntegration | undefined {
  return INTEGRATIONS.find((i) => i.slug === slug && i.enabled);
}

export function getCategories(): string[] {
  const cats = new Set(INTEGRATIONS.filter((i) => i.enabled).map((i) => i.category));
  return Array.from(cats).sort();
}
