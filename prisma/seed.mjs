// Database seed (PRD §7 / plan M1).
//
// Plain Node (no TS runner dependency): connects with `pg` directly and uses
// idempotent upserts, so it is safe to run repeatedly and on fresh databases
// (`npx prisma db seed` or `node prisma/seed.mjs`).
//
// Canonical source for the 7 areas (confirmed 2026-09-20, plan gate) and
// 8 categories. src/config/taxonomy.ts is display-only and must stay in sync.
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";

const areas = [
  {
    slug: "narayanganj-sadar",
    nameEn: "Narayanganj Sadar",
    nameBn: "নারায়ণগঞ্জ সদর",
  },
  { slug: "fatullah", nameEn: "Fatullah", nameBn: "ফতুল্লা" },
  { slug: "siddhirganj", nameEn: "Siddhirganj", nameBn: "সিদ্ধিরগঞ্জ" },
  { slug: "bandar", nameEn: "Bandar", nameBn: "বন্দর" },
  { slug: "sonargaon", nameEn: "Sonargaon", nameBn: "সোনারগাঁও" },
  { slug: "rupganj", nameEn: "Rupganj", nameBn: "রূপগঞ্জ" },
  { slug: "araihazar", nameEn: "Araihazar", nameBn: "আড়াইহাজার" },
];

const categories = [
  { slug: "class-1-5", nameEn: "Class 1–5", nameBn: "ক্লাস ১–৫" },
  { slug: "class-6-8", nameEn: "Class 6–8", nameBn: "ক্লাস ৬–৮" },
  { slug: "ssc", nameEn: "SSC", nameBn: "এসএসসি" },
  { slug: "hsc", nameEn: "HSC", nameBn: "এইচএসসি" },
  { slug: "admission", nameEn: "Admission", nameBn: "ভর্তি প্রস্তুতি" },
  { slug: "english-medium", nameEn: "English Medium", nameBn: "ইংলিশ মিডিয়াম" },
  {
    slug: "ielts-spoken-english",
    nameEn: "IELTS & Spoken English",
    nameBn: "আইইএলটিএস ও স্পোকেন ইংলিশ",
  },
  {
    slug: "ict-programming",
    nameEn: "ICT & Programming",
    nameBn: "আইসিটি ও প্রোগ্রামিং",
  },
];

// A8: one seeded admin account, credentials via env — never hardcoded.
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) {
  console.error(
    "Seed: ADMIN_EMAIL and ADMIN_PASSWORD must be set (see .env.example).",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  for (const [index, area] of areas.entries()) {
    await pool.query(
      `INSERT INTO "Area" (id, slug, "nameEn", "nameBn", "sortOrder")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE
         SET "nameEn" = $2, "nameBn" = $3, "sortOrder" = $4`,
      [area.slug, area.nameEn, area.nameBn, index + 1],
    );
  }
  console.log(`Seed: ${areas.length} areas upserted.`);

  for (const [index, category] of categories.entries()) {
    await pool.query(
      `INSERT INTO "Category" (id, slug, "nameEn", "nameBn", "sortOrder")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE
         SET "nameEn" = $2, "nameBn" = $3, "sortOrder" = $4`,
      [category.slug, category.nameEn, category.nameBn, index + 1],
    );
  }
  console.log(`Seed: ${categories.length} categories upserted.`);

  const passwordHash = await hashPassword(adminPassword);

  const userResult = await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
     VALUES (gen_random_uuid()::text, 'Admin', $1, true, now(), now(), 'ADMIN')
     ON CONFLICT (email) DO UPDATE
       SET role = 'ADMIN', name = 'Admin', "updatedAt" = now()
     RETURNING id`,
    [adminEmail],
  );
  const adminId = userResult.rows[0].id;

  const existingAccount = await pool.query(
    `SELECT id FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential' LIMIT 1`,
    [adminId],
  );
  if (existingAccount.rows.length > 0) {
    await pool.query(
      `UPDATE "account" SET password = $1, "updatedAt" = now() WHERE id = $2`,
      [passwordHash, existingAccount.rows[0].id],
    );
  } else {
    await pool.query(
      `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'credential', $2, $3, now(), now())`,
      [adminId, adminId, passwordHash],
    );
  }
  console.log(`Seed: admin user ready (${adminEmail}).`);

  const counts = await pool.query(
    `SELECT
       (SELECT count(*) FROM "Area") AS areas,
       (SELECT count(*) FROM "Category") AS categories,
       (SELECT count(*) FROM "user" WHERE role = 'ADMIN') AS admins`,
  );
  console.log("Seed counts:", counts.rows[0]);
} finally {
  await pool.end();
}
