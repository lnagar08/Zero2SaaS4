"use client";
import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from 'next/link';
export default function UpdatePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const unwrappedParams = use(params); 
  const id = unwrappedParams.id;

  useEffect(() => {
    if (id) {
      fetch(`/api/admin/plans/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setPlan(data);
          setLoading(false);
        })
        .catch((err) => {
          toast.error("Failed to load plan details");
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <p className="p-6">Loading plan details...</p>;
  if (!plan) return notFound();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
        id: id, 
        //name: String(formData.get("name")), 
        //priceCents: Math.round(parseFloat(String(formData.get("price")))),
        allowMatter: parseInt(String(formData.get("allowMatter"))),
        allowTeamUser: parseInt(String(formData.get("allowTeamUser"))),
    };

    try {
       
        const res = await fetch(`/api/admin/plans/${id}`, { 
            method: "PATCH", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(data)
         });

         const result = await res.json();
        if (!res.ok) {
            throw new Error(result.error || "Update failed");
        }
        toast.success("Plan updated successfully");
       
    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[32px] font-bold">Update Plan</h1>
        <Link href="/admin/plans" className="text-indigo-500 text-sm hover:underline">← Back</Link>
      </div>
      
      <div className="p-6 bg-white shadow-md rounded-xl border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={plan.name}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (Monthly)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                name="price"
                type="number"
                step="0.01"
                required
                defaultValue={plan.priceCents} 
                readOnly
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Matters</label>
              <input
                name="allowMatter"
                type="number"
                required
                defaultValue={plan.allowMatter}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Team Users</label>
              <input
                name="allowTeamUser"
                type="number"
                required
                defaultValue={plan.allowTeamUser}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? "Updating..." : "Update Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
