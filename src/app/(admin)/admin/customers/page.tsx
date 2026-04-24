import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import Link from "next/link";
import ExtendTrialWrapper from "@/components/admin/ExtendTrialWrapper";
import InternalConvertWrapper from "@/components/admin/InternalConvertWrapper";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ extendId?: string, internalId?: string }>;
}) {
  const { extendId, internalId } = await searchParams;

  await requireSuperAdmin();
  let selectedTrialEnd = null;
  if (extendId) {
    const org = await prisma.organization.findUnique({
      where: { id: extendId },
      include: { subscription: { select: { trialEnd: true } } }
    });
    selectedTrialEnd = org?.subscription?.trialEnd;
  }

  let currentInternalStatus = false;
  if (internalId) {
    const org = await prisma.organization.findUnique({
      where: { id: internalId },
      select: { isInternal: true }
    });
    currentInternalStatus = org?.isInternal || false;
  }

  const orgsData = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
      subscription: true,
      users: { where: { role: "OWNER" }, select: { name: true, email: true }, take: 1 },
    },
  });

  const priceIds = orgsData
  .map(org => org.subscription?.stripePriceId)
  .filter(Boolean) as string[];

  const plans = await prisma.plan.findMany({
    where: { stripePriceId: { in: priceIds } }
  });

  const orgs = orgsData.map(org => ({
  ...org,
  plan: plans.find(p => p.stripePriceId === org.subscription?.stripePriceId)
}));

  return (
    <div>
      <h1 style={{fontSize:32,fontWeight:700,marginBottom:8}}>All Customers</h1>
      <p style={{color:"#64748b",marginBottom:32}}>{orgs.length} organizations</p>
      <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Organization</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Owner</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Users</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Subscription</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Plan</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Valid up to</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Actions</th>
          </tr></thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"14px 20px"}}><strong>{org.name}</strong></td>
                <td style={{padding:"14px 20px",fontSize:14,color:"#475569"}}>{org.users[0]?.name || "—"}<br/><span style={{fontSize:12,color:"#94a3b8"}}>{org.users[0]?.email || ""}</span></td>
                <td style={{padding:"14px 20px",color:"#475569"}}>{org._count.users}</td>
                <td style={{padding:"14px 20px",fontSize:13}}>{org.subscription?.status || "None"}</td>
                <td style={{padding:"14px 20px"}}>{org.plan ? `${org.plan.name} - $${(org.plan.priceCents)}` : "—"}</td>
                <td style={{padding:"14px 20px"}}>

                  {(() => {
                    const sub = org.subscription;
                    if (!sub) return "—";
                    const displayDate = sub.status === "TRIALING" ? sub.trialEnd : sub.currentPeriodEnd;

                    if (!displayDate) return "—";

                    return displayDate.toLocaleDateString('en-US', {
                      day: "numeric",
                      month: "short",
                      year: "2-digit"
                    });
                  })()}
                
                </td>
                
                <td style={{padding:"14px 20px"}}>
                  <div className="flex items-center gap-4">
                    {/* Internal Account Button */}
                    {!org.subscription && (
                      <Link 
                        href={`?internalId=${org.id}`}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          org.isInternal 
                            ? "bg-purple-50 text-purple-700 border-purple-100" 
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {org.isInternal ? "Internal Account" : "Convert to Internal"}
                      </Link>
                    )}

                    {org.subscription?.status === "TRIALING" && (
                      <Link 
                        href={`?extendId=${org.id}`} 
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200"
                      >
                        Extend Trial
                      </Link>
                    )}

                    <Link href={"/admin/customers/"+org.id} style={{color:"#6366f1",fontSize:14}}>View →</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extend Trial Modal */}
      {extendId && (
        <ExtendTrialWrapper orgId={extendId} currentTrialEnd={selectedTrialEnd} />
      )}

      {internalId && (
      <InternalConvertWrapper 
        orgId={internalId} 
        initialStatus={currentInternalStatus} 
      />
    )}
    </div>
  );
}