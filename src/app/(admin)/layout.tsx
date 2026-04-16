import { requireSuperAdmin } from "@/lib/require-superadmin";
import { Toaster } from "sonner";
export default async function AdminLayout(
  { children }: 
  { children: React.ReactNode }) {
  await requireSuperAdmin();
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <nav style={{background:"#0f172a",color:"white",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:18,fontWeight:700}}>SuperAdmin</span>
          <a href="/admin" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Dashboard</a>
          <a href="/admin/customers" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Customers</a>
          <a href="/admin/revenue" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Revenue</a>
          <a href="/admin/plans" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Plans</a>
          <a href="/admin/transactions" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Transactions History</a>
        </div>
        <a href="/" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>← Back to App</a>
      </nav>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
        <Toaster position="top-right" richColors />
        {children}
      </div>
    </div>
  );
}