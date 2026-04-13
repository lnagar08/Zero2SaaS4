import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { FirmBanner } from "@/components/layout/FirmBanner";
import Providers from "@/components/Providers";
import { Toaster } from 'sonner';
export default async function DashboardLayout({
  
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <>
    <Providers>
      <Sidebar />
          <main className="ml-[240px] min-h-screen">
            <FirmBanner />
            <div className="px-8 py-6">
              {children}
              <Toaster richColors position="top-right" />
            </div>
          </main>
    </Providers>
          
        </>
  )
}