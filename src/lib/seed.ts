// ============================================================
// SEED FILE — NEEDS PRISMA REWRITE
// This file previously seeded SQLite directly.
// TODO: Rewrite using Prisma client:
//
// import { prisma } from "./prisma";
//
// async function seed() {
//   const org = await prisma.organization.create({ data: { name: "Demo Firm", slug: "demo" } });
//   const user = await prisma.user.create({ data: { orgId: org.id, name: "Erik Weingold", email: "erik@demo.com", role: "OWNER" } });
//   // ... create demo matterFlows, matters, etc.
// }
//
// seed().then(() => console.log("Seeded!")).catch(console.error);
// ============================================================
export {};
