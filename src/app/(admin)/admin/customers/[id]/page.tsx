import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import { notFound } from "next/navigation";
import Link from 'next/link';
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      subscription: true,
    },
  });

  const plan = await prisma.plan.findFirst({
    where: {
      stripePriceId: org?.subscription?.stripePriceId || undefined,
    },
  });
  if (!org || !plan) notFound();

  return (
    <div>
      <Link href="/admin/customers" style={{color:"#6366f1",fontSize:14,textDecoration:"none"}}>← All Customers</Link>
      <h1 style={{fontSize:32,fontWeight:700,margin:"12px 0 8px"}}>{org.name}</h1>
      <p style={{color:"#64748b",marginBottom:32}}>Slug: {org.slug} · Created: {org.createdAt.toLocaleDateString()}</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>Subscription</h2>
          {org.subscription ? (
            <div>
              <p><strong>Status:</strong> {org.subscription.status}</p>
              <p><strong>Plan:</strong> {plan.name} - ${plan.priceCents} / Month</p>
              <p><strong>Period:</strong> {org.subscription.currentPeriodStart.toLocaleDateString()} — {org.subscription.currentPeriodEnd.toLocaleDateString()}</p>
              {org.subscription.trialEnd && <p><strong>Trial ends:</strong> {org.subscription.trialEnd.toLocaleDateString()}</p>}
              {org.subscription.cancelAtPeriodEnd && <p style={{color:"#ef4444"}}><strong>Cancels at period end</strong></p>}
            </div>
          ) : <p style={{color:"#94a3b8"}}>No active subscription</p>}
        </div>

        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>Team ({org.users.length} members)</h2>
          {org.users.map(u => (
            <div key={u.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
              <div><strong>{u.name}</strong><br/><span style={{fontSize:13,color:"#94a3b8"}}>{u.email}</span></div>
              <span style={{fontSize:12,fontWeight:600,color:"#6366f1",alignSelf:"center"}}>{u.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}