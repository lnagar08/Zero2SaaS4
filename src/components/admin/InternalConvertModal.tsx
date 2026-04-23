"use client"
import { useState, useTransition } from "react";
import { toggleOrgInternalStatus } from "@/app/actions/org-internal-status"; 
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function InternalConvertModal({ orgId, initialStatus, onClose }: { orgId: string, initialStatus: boolean, onClose: () => void }) {
  const [isInternal, setIsInternal] = useState(initialStatus);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      
      await toggleOrgInternalStatus(orgId, !isInternal); 
      setIsSuccess(true);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        {!isSuccess ? (
          <>
            <div className="flex justify-center mb-4">
              <ShieldCheck className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Account Type</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Toggle to mark this organization as an internal account.
            </p>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl mb-8">
              <span className="font-medium text-gray-700">Internal Status</span>
              <button
                onClick={() => setIsInternal(!isInternal)}
                className={`${
                  isInternal ? "bg-purple-600" : "bg-gray-300"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span className={`${isInternal ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-medium">Cancel</button>
              <button 
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Confirm"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Updated!</h3>
            <p className="text-gray-600 mb-8">The account has been converted successfully.</p>
            <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
