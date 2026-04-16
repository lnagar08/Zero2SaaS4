import { ShieldAlert, MoveLeft, Home } from "lucide-react";
import Link from "next/link";

export default function Unauthorized() {
  return (
    <main className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[32px] p-12 shadow-sm border border-neutral-100 text-center">
        {/* Warning Icon */}
        <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-bold text-[#1A202C] mb-4">
          Restricted Access
        </h1>

        {/* Description */}
        <p className="text-[16px] text-[#717A8C] mb-10 leading-relaxed">
          Oops! It looks like you don't have permission to access this section. 
          Please reach out to your **Team Owner** to request access.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-4 bg-[#6D51E3] text-white font-semibold rounded-2xl hover:bg-[#5a42bc] transition-all shadow-lg shadow-[#6D51E3]/20"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-4 bg-white text-[#717A8C] font-semibold rounded-2xl border border-neutral-200 hover:bg-neutral-50 transition-all"
          >
            <MoveLeft className="w-5 h-5" />
            Return Home
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-10 pt-8 border-t border-neutral-50">
          <p className="text-[14px] text-neutral-400">
            Error Code: <span className="font-mono text-red-400">403_FORBIDDEN</span>
          </p>
        </div>
      </div>
    </main>
  );
}
