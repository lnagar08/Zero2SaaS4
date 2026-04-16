-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_stripePriceId_fkey" FOREIGN KEY ("stripePriceId") REFERENCES "Plan"("stripePriceId") ON DELETE RESTRICT ON UPDATE CASCADE;
