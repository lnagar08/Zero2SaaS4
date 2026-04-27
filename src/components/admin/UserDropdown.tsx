"use client";
import { useState } from "react";
import { LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";

export default function UserDropdown({ email }: { email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const shortName = email.split('@')[0].substring(0, 2).toUpperCase();

  return (
    <div className="relative">
      {/* Profile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-slate-800 transition-colors border border-slate-700"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
          {shortName}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden py-1 animate-in fade-in zoom-in duration-100">
            {/* Admin Info */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 mb-1">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Super Admin</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate">{email}</p>
            </div>

            {/* Logout Action */}
            <button 
              onClick={() => {
                signOut(); // Call your signOut function here
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
