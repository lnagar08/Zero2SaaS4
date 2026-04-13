import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";

export default async function CustomersPage() {
  await requireSuperAdmin();

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
                <td style={{padding:"14px 20px"}}>{org.subscription?.currentPeriodEnd ? `${org.subscription.currentPeriodEnd.toLocaleDateString('en-US', {
                  day: "numeric",
                  month: "short",
                  year: "2-digit"
                })}` : "—"}</td>
                <td style={{padding:"14px 20px"}}><a href={"/admin/customers/"+org.id} style={{color:"#6366f1",fontSize:14}}>View →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}