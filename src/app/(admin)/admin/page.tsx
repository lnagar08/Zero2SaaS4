import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";

export default async function AdminDashboard() {
  await requireSuperAdmin();

  const [totalOrgs, totalUsers, activeSubs, trialSubs, pastDueSubs] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count({
      where: { role: { not: "ADMIN" } }
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
  ]);

  const recentOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" }, take: 10,
    include: { _count: { select: { users: true } }, subscription: true },
  });

  return (
    <div>
      <h1 style={{fontSize:32,fontWeight:700,marginBottom:8}}>Platform Dashboard</h1>
      <p style={{color:"#64748b",marginBottom:32}}>Overview of all customers and subscriptions</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16,marginBottom:40}}>
        <MetricCard label="Organizations" value={totalOrgs} color="#6366f1" />
        <MetricCard label="Total Users" value={totalUsers} color="#0ea5e9" />
        <MetricCard label="Active Subs" value={activeSubs} color="#22c55e" />
        <MetricCard label="In Trial" value={trialSubs} color="#f59e0b" />
        <MetricCard label="Past Due" value={pastDueSubs} color="#ef4444" />
      </div>
 
      <h2 style={{fontSize:20,fontWeight:600,marginBottom:16}}>Recent Customers</h2>
      <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:"1px solid #e2e8f0"}}>
              <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b",fontWeight:500}}>Organization</th>
              <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b",fontWeight:500}}>Users</th>
              <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b",fontWeight:500}}>Status</th>
              <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b",fontWeight:500}}>Valid up to</th>
              <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b",fontWeight:500}}>Created</th>
            </tr>
          </thead>
          <tbody>
            {recentOrgs.map(org => (
              <tr key={org.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"14px 20px"}}><a href={"/admin/customers/"+org.id} style={{fontWeight:500,color:"#0f172a",textDecoration:"none"}}>{org.name}</a><br/><span style={{fontSize:12,color:"#94a3b8"}}>{org.slug}</span></td>
                <td style={{padding:"14px 20px",color:"#475569"}}>{org._count.users}</td>
                <td style={{padding:"14px 20px"}}><StatusBadge status={org.subscription?.status || "NO_SUB"} /></td>
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
                <td style={{padding:"14px 20px",color:"#94a3b8",fontSize:14}}>{org.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <p style={{fontSize:13,color:"#64748b",marginBottom:8}}>{label}</p>
      <p style={{fontSize:36,fontWeight:700,color,letterSpacing:-1}}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string,{bg:string,text:string,label:string}> = {
    ACTIVE: {bg:"#ecfdf5",text:"#065f46",label:"Active"},
    TRIALING: {bg:"#fffbeb",text:"#92400e",label:"Trial"},
    PAST_DUE: {bg:"#fef2f2",text:"#991b1b",label:"Past Due"},
    CANCELED: {bg:"#f1f5f9",text:"#64748b",label:"Canceled"},
    UNPAID: {bg:"#fef2f2",text:"#991b1b",label:"Unpaid"},
    NO_SUB: {bg:"#f1f5f9",text:"#94a3b8",label:"No Subscription"},
  };
  const s = styles[status] || styles.NO_SUB;
  return <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,background:s.bg,color:s.text}}>{s.label}</span>;
}