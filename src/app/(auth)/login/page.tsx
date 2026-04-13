"use client";
import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { redirect } from "next/navigation";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", { email, password, redirect: false });
    
    if (res?.error){
      setError("Invalid credentials");
    } else {
      const session = await getSession();
      if (!session) {
        redirect("/login");
      }
      if (session.user.role === "ADMIN") {
        redirect("/admin");
      } else {
        redirect("/dashboard");
      }
    }
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"}}>
      <div style={{width:400,padding:40,borderRadius:20,background:"white",boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:24,textAlign:"center"}}>Sign In</h1>
        {error && <p style={{color:"red",marginBottom:12,textAlign:"center"}}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:12,fontSize:15}} />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:16,fontSize:15}} />
          <button type="submit" style={{width:"100%",padding:"12px",borderRadius:40,background:"#4f46e5",color:"white",border:"none",fontSize:15,fontWeight:600,cursor:"pointer"}}>Sign In</button>
        </form>
        <button onClick={()=>signIn("google")} style={{width:"100%",padding:"12px",borderRadius:40,background:"#f1f5f9",color:"#334155",border:"1px solid #e2e8f0",fontSize:15,fontWeight:500,cursor:"pointer",marginTop:12}}>Continue with Google</button>
        <p style={{textAlign:"center",marginTop:16,fontSize:14,color:"#94a3b8"}}>Don't have an account? <a href="/signup">Sign up</a></p>
      </div>
    </div>
  );
}