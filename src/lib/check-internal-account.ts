import { prisma } from "./prisma";
import { getCurrentOrg } from "./tenant";

export async function checkInternalAccount(): Promise<boolean> {
    const { orgId } = await getCurrentOrg();
    if (!orgId) return false;

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { isInternal: true }
    });
    return org?.isInternal || false;
} 