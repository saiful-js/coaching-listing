/**
 * Admin feature boundary (PRD §12: cross-feature calls go through index).
 * SERVER-ONLY barrel (reaches Prisma).
 */
export { createArea, createCategory } from "./service";
export type { TaxonomyInput } from "./service";
