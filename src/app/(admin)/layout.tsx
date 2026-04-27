import { requireSuperAdmin } from "@/lib/require-superadmin";
import { Toaster } from "sonner";
import Link from 'next/link';
import UserDropdown from "@/components/admin/UserDropdown";

export default async function AdminLayout(
  { children }: 
  { children: React.ReactNode }) { 
  const user = await requireSuperAdmin();
  const adminEmail = user || "admin@pro.com";

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <nav style={{background:"#0f172a",color:"white",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:18,fontWeight:700}}>SuperAdmin</span>
          <Link href="/admin" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Dashboard</Link>
          <Link href="/admin/customers" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Customers</Link>
          <Link href="/admin/revenue" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Revenue</Link>
          <Link href="/admin/plans" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Plans</Link>
          <Link href="/admin/transactions" style={{color:"#94a3b8",textDecoration:"none",fontSize:14}}>Transactions History</Link>
        </div>
        <UserDropdown email={adminEmail} />
      </nav>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
        <Toaster position="top-right" richColors />
        {children}
      </div>
    </div>
  );
}