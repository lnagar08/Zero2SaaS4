"use client";
import React from "react";
import { toast } from "sonner";

export default function PlanDelete({ id }: { id: string }) {
    const [loading, setLoading] = React.useState(false);

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this plan? This action cannot be undone.")) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Plan deleted successfully");
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || "Failed to delete plan");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Save failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button 
            onClick={handleDelete}
            disabled={loading}
            style={{
                marginLeft: 12,
                fontSize: 14,
                color: "#ef4444",
                background: "transparent",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1
            }}
        >
            {loading ? "Deleting..." : "Delete"}
        </button>
    );
}
