"use client"
import { useState, useTransition, useMemo } from "react";
import { extendTrial } from "@/app/actions/trial-extend"; 
import { format, addMonths } from "date-fns";
import { CheckCircle2 } from "lucide-react";

interface Props {
  orgId: string;
  currentTrialEnd?: Date | null;
  onClose: () => void;
}

export default function ExtendTrialModal({ orgId, currentTrialEnd, onClose }: Props) {
  const [months, setMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  // Determine the base date for extension (current trial end or today, whichever is later)
  const baseDate = useMemo(() => {
    if (!currentTrialEnd) return new Date();
    return new Date(currentTrialEnd) > new Date() ? new Date(currentTrialEnd) : new Date();
  }, [currentTrialEnd]);

  // New trial end date based on selected extension months
  const newDate = useMemo(() => addMonths(baseDate, months), [baseDate, months]);

  const handleExtend = () => {
    setError(null);
    startTransition(async () => {
      const result = await extendTrial(orgId, months);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsSuccess(true); 
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100">
        {!isSuccess ? ( 
          <>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Extend Trial Period</h3>
        <p className="text-sm text-gray-500 mb-6">
          Add additional months to this organization's current trial access.
        </p>

        {/* Date Comparison Info */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-3 border border-blue-100">
          <div className="flex justify-between text-xs">
            <span className="text-blue-600 font-medium">Current Trial Ends:</span>
            <span className="text-gray-700 font-bold">
              {currentTrialEnd ? format(new Date(currentTrialEnd), "MMM dd, yyyy") : "No Active Trial"}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
            <span className="text-blue-700 font-bold">New Trial Ends:</span>
            <span className="text-blue-800 font-extrabold underline">
              {format(newDate, "MMM dd, yyyy")}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 text-xs bg-red-50 text-red-600 rounded-lg border border-red-200 font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Extension Duration
            </label>
            <select 
              value={months} 
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
            >
              {[1, 2, 3, 6, 12].map(m => (
                <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-3 text-gray-500 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleExtend} 
              disabled={isPending}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {isPending ? "Updating..." : "Confirm"}
            </button>
          </div>
        </div>
        </>
        ) : (
            <div className="py-4 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-600 mb-8">
              The trial has been successfully extended by {months} month{months > 1 ? 's' : ''}.
            </p>
            <button 
              onClick={onClose} 
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
