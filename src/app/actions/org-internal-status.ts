"use server"
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleOrgInternalStatus(orgId: string, currentStatus: boolean) {
  await prisma.organization.update({
    where: { id: orgId },
    data: { isInternal: !currentStatus },
  });
  revalidatePath("/admin/customers");
}
