import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";

const checkSubscription = async () => {
    const { orgId } = await getCurrentOrg();
    const sub = await prisma.subscription.findUnique({
        where: { orgId },
    });
    if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
        return false;
    }
    return true;
};

export default checkSubscription;