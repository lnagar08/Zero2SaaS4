"use client";
import { useState } from "react";
import { toast } from "sonner";

export default function NewPlansPage() {

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
        name: String(formData.get("name") ?? ""), 
        priceCents: Math.round(parseFloat(String(formData.get("price") ?? "0")) * 100),
        allowMatter: parseInt(String(formData.get("allowMatter") ?? "0")),
        allowTeamUser: parseInt(String(formData.get("allowTeamUser") ?? "0")),
    };

    try {
        const res = await fetch(`/api/admin/plans`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(data)
         });

         const result = await res.json();
        if (!res.ok) {
            if (result.errors) {
                const allMessages = Object.values(result.errors).flat().join(", ");
                toast.error(allMessages); 
                return;
            }
            throw new Error(result.error || "Something went wrong");
        }
        toast.success("Plan created successfully");
        setTimeout(() => {
            window.location.href = "/admin/plans";
        }, 2000);
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
        setLoading(false);
    }
    
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
  <h1 className="text-[32px] font-bold">Create New Plan</h1>
  <a 
    href="/admin/plans" 
    className="text-indigo-500 text-sm no-underline hover:underline"
  >
    ← Back
  </a>
  </div>
      
      <div className="max-w-full mx-auto p-6 bg-white shadow-md rounded-xl border border-gray-100">
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Plan Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Pro Plan, Basic"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Price in Dollars/Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (Monthly)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              name="price"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Grid for Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Matters</label>
            <input
              name="allowMatter"
              type="number"
              required
              placeholder="e.g. 10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Team Users</label>
            <input
              name="allowTeamUser"
              type="number"
              required
              placeholder="e.g. 5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}