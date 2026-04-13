"use server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import { toast } from "sonner";
import PlanDelete from "@/components/admin/PlanDelete";


export default async function PlansPage() {
  await requireSuperAdmin();

  const plans = await prisma.plan.findMany({
    orderBy: { priceCents: "asc" },
  });

  return (
    <div>
    <div className="flex items-center justify-between mb-2">
  <h1 className="text-[32px] font-bold">All Plans</h1>
  <a 
    href="/admin/plans/new" 
    className="text-indigo-500 text-sm no-underline hover:underline"
  >
    + Create New Plan
  </a>
  </div>
      <p style={{color:"#64748b",marginBottom:32}}>{plans.length} plans</p>
      <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Plan Name</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Price</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Allow Teams</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Allow Matters</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Actions</th>
          </tr></thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"14px 20px"}}><strong>{plan.name}</strong></td>
                <td style={{padding:"14px 20px",fontSize:14,color:"#475569"}}>${(plan.priceCents)}</td>
                <td style={{padding:"14px 20px",color:"#475569"}}>{plan.allowTeamUser}</td>
                <td style={{padding:"14px 20px",color:"#475569"}}>{plan.allowMatter}</td>
                <td style={{padding:"14px 20px"}}>
                  <a href={`/admin/plans/${plan.id}`} style={{color:"#6366f1",fontSize:14}}>Edit</a>
                    <PlanDelete id={plan.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}