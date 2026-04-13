// pages/settings/team.tsx
// This page represents the "Team" tab in Settings.
// It shows current members, invite form, and pending invitations.

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ATTORNEY" | "STAFF";
};

type Invite = {
  id: string;
  email: string;
  role: "ATTORNEY" | "STAFF";
  sentAt: string;
  expiresAt: string;
  status: "pending" | "expired";
};
export default function TeamTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ATTORNEY" | "STAFF">("ATTORNEY");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  // Fetch team members and invites on load
  useEffect(() => {
    fetch("/api/team/members").then(res => res.json()).then(setMembers);
    fetch("/api/team/invite").then(res => res.json()).then(setInvites);
  }, []);


  // Handle sending invite
  const sendInvite = async () => {
    
    setLoading(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok){
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to send invite");
        return;
      }
      const data = await res.json();
      toast.success(`Invitation sent to ${email}`);
      setInvites(prev => [...prev, data.invitation]);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // handle resend invite
  const resendInvite = async (inviteId: string) => {
    setLoadingId(inviteId);
    try {
      const res = await fetch(`/api/team/invite/${inviteId}`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to resend invite");
        return;
      }
      toast.success("Invite resent successfully");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoadingId(null); 
    }
  };

  // handle revoke invite
  const revokeInvite = async (inviteId: string) => {
    
    if (!confirm("Are you sure you want to revoke this invite? This action cannot be undone.")) return;

    setRevokeId(inviteId);
    try {
      const res = await fetch(`/api/team/invite/${inviteId}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to revoke invite");
        return;
      }
      setInvites(prev => prev.filter(inv => inv.id !== inviteId));
      toast.success("Invite revoked successfully");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setRevokeId(null); 
    }
  };


  const getShortName = (name: string): string => {
    if (!name) return "";
    
    const parts = name.trim().split(' ');
    
    if (parts.length > 1) {
      // Take first letter of first and last name
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
      // Take first two letters of the single name
      return parts[0].substring(0, 2).toUpperCase();
    }
  };

    return(
        <>
        <section className="bg-white rounded-[20px] p-10 shadow-sm border border-neutral-100">
        <h2 className="text-[28px] font-semibold mb-2">Team members</h2>
        <p className="text-[17px] text-[#717A8C] mb-10 leading-relaxed max-w-[500px]">
          Manage who has access to your firm's MatterGuardian account.
        </p>

        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between gap-6 py-6 border-t border-neutral-200">
          <div className="flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-full bg-[#E6EAFF] text-[#4F46E5] flex items-center justify-center text-xl font-medium tracking-tight"
            >
              {getShortName(m.name)}
            </div>
            <div>
              <div className="text-[20px] font-medium leading-snug">{m.name}</div>
              <div className="text-[17px] text-[#717A8C] mt-1">{m.email}</div>
            </div>
          </div>
          <span
            className="bg-[#F3F4FB] text-[#4F46E5] text-[15px] font-medium px-5 py-2.5 rounded-full"
          >
            {m.role}
          </span>
        </div>
        ))}

      </section>

      <section className="bg-white rounded-[20px] p-10 shadow-sm border border-neutral-100">
        <h2 className="text-[28px] font-semibold mb-2">Invite a team member</h2>
        <p className="text-[17px] text-[#717A8C] mb-10 leading-relaxed max-w-[650px]">
          They'll receive an email with a link to create their account and join your firm.
        </p>

        <form className="grid grid-cols-[1fr_250px_auto] gap-x-6 items-end">
          <div className="space-y-2">
            <label htmlFor="email" className="text-[17px] text-[#717A8C]">Email address</label>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-[60px] px-6 text-[18px] border border-neutral-200 rounded-[12px] placeholder-[#A0AEC0] focus:ring-2 focus:ring-[#6D51E3]/30 focus:border-[#6D51E3] transition-all"
            />
          </div>
          <div className="space-y-2 relative">
            <label htmlFor="role" className ="text-[17px] text-[#717A8C]">Role</label>
            <select
              value={role} 
              onChange={e => setRole(e.target.value as any)}
              id="role"
              className="w-full h-[60px] px-6 pr-12 text-[18px] border border-neutral-200 rounded-[12px] appearance-none focus:ring-2 focus:ring-[#6D51E3]/30 focus:border-[#6D51E3] transition-all"
            >
              <option value="ATTORNEY">Attorney</option>
              <option value="STAFF">Staff</option>
            </select>
            <span
              className="absolute right-6 bottom-5 text-[#717A8C] pointer-events-none"
              >&#x25BE;</span
            >
          </div>
          <button
            onClick={sendInvite} 
            disabled={loading}
            type="submit"
            className="h-[60px] px-10 bg-[#5A38C1] text-white text-[18px] font-semibold rounded-[12px] whitespace-nowrap hover:bg-[#4E2DAF] active:bg-[#3D1E99] transition-all"
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-[20px] p-10 shadow-sm border border-neutral-100">
        <h2 className="text-[28px] font-semibold mb-2">Pending invitations</h2>
        <p className="text-[17px] text-[#717A8C] mb-10 leading-relaxed max-w-[650px]">
          Invitations that haven't been accepted yet.
        </p>

        {Array.isArray(invites) && invites.map(i => (
          <div key={i.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-8 py-6 border-t border-neutral-200">
          <div className="text-[18px]">{i.email}</div>
          <span
            className="bg-[#E1F3EC] text-[#006F4D] text-[15px] font-medium px-5 py-2.5 rounded-full"
          >
            {i.role}
          </span>
          <span className="text-[16px] text-[#717A8C]">Sent {i.sentAt}</span>
          {/*new Date(i.expiresAt) > new Date() ? (
            <span className="text-[16px] text-[#717A8C]">Pending</span>
          ) : (
            <span className="text-[16px] text-[#E03131]">Expired</span>
          )*/}
          
          <button 
            className="text-[16px] text-[#717A8C]" 
            disabled={loadingId === i.id}
            onClick={() => resendInvite(i.id)}
            >
            {loadingId === i.id ? "Sending..." : "Resend"}
          </button>
          
          <button 
          className="text-[17px] text-[#E03131] font-semibold hover:text-[#C92A2A]"
          disabled={revokeId === i.id}
          onClick={() => revokeInvite(i.id)}>
            {revokeId === i.id ? "Revoking..." : "Revoke"}
          </button>
        </div>
        ))}

      </section>
        </>
    );
}