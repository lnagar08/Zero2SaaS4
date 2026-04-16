"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isInvited, setIsInvited] = useState(false);
  const [email, setEmail] = useState("");
  const [loadingToken, setLoadingToken] = useState(!!token);

  const [form, setForm] = useState({ firmName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(""); 
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ ...form, token }) 
      });

      const data = await res.json();
      if (!res.ok) { 
        setError(data.error || "Signup failed"); 
        return; 
      }
      router.push("/login?registered=true");
    } catch { 
      setError("Something went wrong."); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    if (token) {
      const verifyInvite = async () => {
        try {
          const res = await fetch(`/api/team/invite/verify?token=${token}`);
          if (res.ok) {
            const data = await res.json();
            setIsInvited(true);
            setForm({...form, email: data.email});
          } else {
           setError("Invalid or expired token");
          }
        } catch (err: any) {
          setError(err.error || "Failed to save branding");
        } finally {
          setLoadingToken(false);
        }
      };
      verifyInvite();
    }
  }, [token]);

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"}}>
      <div style={{width:420,background:"white",borderRadius:16,padding:40,boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
        {loadingToken ? (
          <p style={{textAlign:"center",fontSize:14,color:"#94a3b8",marginBottom:24}}>Verifying invitation...</p>
        ) : isInvited ? (
          <div style={{textAlign:"center"}}>
            <h1 style={{fontSize:28,fontWeight:700,marginBottom:8,color:"#0f172a"}}>You're invited!</h1>
            <p style={{fontSize:16,color:"#94a3b8",marginBottom:24}}>Create an account to join our team's workspace</p>
            
          </div>
        ) : ( 
          <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:28,fontWeight:700,marginBottom:8,textAlign:"center"}}>Create your account</h1>
          <p style={{textAlign:"center",fontSize:14,color:"#94a3b8",marginBottom:24}}>Start your free 14-day trial</p>
          </div>
         )}
          <div>
            
            {error && <div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",color:"#dc2626",fontSize:13,marginBottom:16,fontWeight:500}}>{error}</div>}
            <form onSubmit={handleSubmit}>
              {isInvited && token && <input type="hidden" name="token" value={token} />}

              {!isInvited && !token && (
                <input type="text" required value={form.firmName} onChange={e=>setForm({...form,firmName:e.target.value})} placeholder="Firm name" style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:12,fontSize:15}} />
              )}
              
              <input type="text" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name" style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:12,fontSize:15}} />
              <input 
              type="email" 
              disabled={isInvited} 
              required 
              value={form.email} 
              onChange={e=>setForm({...form,email:e.target.value})} 
              placeholder="Work email" 
              style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:12,fontSize:15}} />
              <input type="password" required minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password (min 8 chars)" style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:16,fontSize:15}} />
              <button type="submit" disabled={loading} style={{width:"100%",padding:"12px",borderRadius:40,background:"#4f46e5",color:"white",border:"none",fontSize:15,fontWeight:600,cursor:loading?"wait":"pointer",opacity:loading?0.7:1}}>{loading ? "Creating..." : "Create account"}</button>
            </form>
            <p style={{textAlign:"center",marginTop:16,fontSize:14,color:"#94a3b8"}}>Already have an account? <a href="/login">Log in</a></p>
          </div>
        </div>  
      </div>
  );
}