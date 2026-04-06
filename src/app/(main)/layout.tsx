import { Sidebar } from "@/components/layout/Sidebar";
import { FirmBanner } from "@/components/layout/FirmBanner";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="ml-[240px] min-h-screen">
        <FirmBanner />
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </>
  );
}
