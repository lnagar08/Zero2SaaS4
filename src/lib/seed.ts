// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding plans...");

  const plans = [
    {
      name: "Starter",
      stripePriceId: "price_free_123",
      priceCents: 49,
      allowMatter: 5,                  
      allowTeamUser: 2,
      billingInterval: "monthly",                
    },
    {
      name: "Professional",
      stripePriceId: "price_pro_456",  
      priceCents: 99,
      allowMatter: 100,                
      allowTeamUser: 5,   
      billingInterval: "monthly",            
    },
    {
      name: "Firm",
      stripePriceId: "price_ent_789", 
      priceCents: 199,
      allowMatter: 9999,               
      allowTeamUser: 10,   
      billingInterval: "monthly",           
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { stripePriceId: plan.stripePriceId },
      update: {}, 
      create: {
        name: plan.name,
        stripePriceId: plan.stripePriceId,
        priceCents: plan.priceCents,
        allowMatter: plan.allowMatter,
        allowTeamUser: plan.allowTeamUser,
        billingInterval: plan.billingInterval,
      },
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
