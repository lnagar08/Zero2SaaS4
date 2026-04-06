import type { Metadata } from "next";
import "@/app/globals.css"
import { Sidebar } from "@/components/layout/Sidebar";
import { FirmBanner } from "@/components/layout/FirmBanner";
export const metadata: Metadata = {
  title: "MatterGuardian — Guard every matter. Keep them in flow.",
  description: "Workflow management for flat-fee transaction law firms",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <Sidebar />
        <main className="ml-[240px] min-h-screen">
          <FirmBanner />
          <div className="px-8 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
