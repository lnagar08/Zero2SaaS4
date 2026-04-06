import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";

export default async function RevenuePage() {
  await requireSuperAdmin();

  const subs = await prisma.subscription.findMany({ include: { org: true } });
  const active = subs.filter(s => s.status === "ACTIVE" || s.status === "TRIALING");

  return (
    <div>
      <h1 style={{fontSize:32,fontWeight:700,marginBottom:8}}>Revenue</h1>
      <p style={{color:"#64748b",marginBottom:32}}>{active.length} active subscriptions</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:40}}>
        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <p style={{fontSize:13,color:"#64748b",marginBottom:8}}>Active Subscriptions</p>
          <p style={{fontSize:36,fontWeight:700,color:"#22c55e"}}>{active.length}</p>
        </div>
        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <p style={{fontSize:13,color:"#64748b",marginBottom:8}}>Total Organizations</p>
          <p style={{fontSize:36,fontWeight:700,color:"#6366f1"}}>{subs.length}</p>
        </div>
        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <p style={{fontSize:13,color:"#64748b",marginBottom:8}}>Past Due</p>
          <p style={{fontSize:36,fontWeight:700,color:"#ef4444"}}>{subs.filter(s=>s.status==="PAST_DUE").length}</p>
        </div>
      </div>

      <h2 style={{fontSize:20,fontWeight:600,marginBottom:16}}>All Subscriptions</h2>
      <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Organization</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Status</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Plan</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Current Period</th>
          </tr></thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"14px 20px",fontWeight:500}}>{s.org.name}</td>
                <td style={{padding:"14px 20px",fontSize:13}}>{s.status}</td>
                <td style={{padding:"14px 20px",fontSize:13,color:"#64748b"}}>{s.stripePriceId}</td>
                <td style={{padding:"14px 20px",fontSize:13,color:"#94a3b8"}}>{s.currentPeriodStart.toLocaleDateString()} — {s.currentPeriodEnd.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}