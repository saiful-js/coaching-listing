// Prisma 7 CLI config (replaces the url-in-schema approach of Prisma ≤6).
// Shapes and options follow the current Prisma 7 docs; the CLI discovers
// this file automatically.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
