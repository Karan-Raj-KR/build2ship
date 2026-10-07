// ============================================================
// COUNTRIES — ISO-3166-1 alpha-2 codes with human-readable names
// Used by country selector components for profile and onboarding.
// ============================================================

export interface Country {
  code: string;
  name: string;
}

// Common countries first, then alphabetical
const COUNTRY_LIST: Country[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KE", name: "Kenya" },
  { code: "KR", name: "South Korea" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

export const COUNTRIES: readonly Country[] = COUNTRY_LIST;

/**
 * Look up a country by ISO code (case-insensitive).
 * Returns the human-readable name, or the original code if not found.
 */
export function countryName(code: string | null | undefined): string {
  if (!code) return "Not specified";
  const upper = code.toUpperCase();
  const match = COUNTRY_LIST.find((c) => c.code === upper);
  return match?.name ?? code;
}

/**
 * Look up a country code from a human-readable name (case-insensitive partial match).
 * Returns the ISO code, or the original string if no match found.
 */
export function countryCode(name: string): string {
  const lower = name.toLowerCase().trim();
  const match = COUNTRY_LIST.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.code.toLowerCase() === lower,
  );
  return match?.code ?? name;
}

/**
 * Search countries by name or code (case-insensitive substring match).
 * Returns matching countries, limited to maxResults.
 */
export function searchCountries(
  query: string,
  maxResults: number = 15,
): Country[] {
  if (!query.trim()) return COUNTRY_LIST.slice(0, maxResults);
  const lower = query.toLowerCase().trim();
  return COUNTRY_LIST.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.code.toLowerCase().includes(lower),
  ).slice(0, maxResults);
}
