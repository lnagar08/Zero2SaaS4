// /lib/check-permission.ts
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "./tenant";

export async function hasPermission(permissionName: string) {
    const { userId } = await getCurrentOrg();
    if (!userId) return false;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { permissions: true, role: true }
    });

    // OWNER
    if (user?.role === "OWNER") return true;

    // JSON
    const perms = user?.permissions as Record<string, boolean>;
    return perms?.[permissionName] === true;
}
