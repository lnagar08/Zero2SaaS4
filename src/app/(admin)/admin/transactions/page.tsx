"use server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import { format } from "date-fns";


export default async function PlansPage() {
  await requireSuperAdmin();

  const transactions = await prisma.transaction.findMany({
  orderBy: { createdAt: "desc" },
  include: {
    organization: {
      select: {
        name: true, // Only fetch the name of the organization
      },
    },
    plan: {
      select: {
        name: true, // Only fetch the name of the plan
      },
    },
  },
});


  return (
    <div>
    <div className="flex items-center justify-between mb-2">
  <h1 className="text-[32px] font-bold">All Transactions</h1>
  
  </div>
      <p style={{color:"#64748b",marginBottom:32}}>{transactions.length} Transactions</p>
      <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Organization</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Plan Name</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Amount</th>
            <th style={{textAlign:"left",padding:"12px 20px",fontSize:13,color:"#64748b"}}>Date</th>
          </tr></thead>
          <tbody>
            {transactions.map(transaction => (
              <tr key={transaction.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"14px 20px"}}><strong>{transaction.organization?.name}</strong></td>
                <td style={{padding:"14px 20px",fontSize:14,color:"#475569"}}>{transaction.plan?.name}</td>
                <td style={{padding:"14px 20px",color:"#475569"}}>${transaction.amount}</td>
                <td style={{padding:"14px 20px",color:"#475569"}}>{format(transaction.createdAt, "MMM dd, yyyy")}</td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}