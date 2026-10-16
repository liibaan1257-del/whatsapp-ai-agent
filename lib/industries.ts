/** Business types with their own landing page (/for/<slug>): search engines send owners of each type here. */
export const INDUSTRIES = ["salon", "barbershop", "clinic", "dentist", "spa", "gym", "tutor", "car-repair"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export function isIndustry(value: unknown): value is Industry {
  return typeof value === "string" && (INDUSTRIES as readonly string[]).includes(value);
}
