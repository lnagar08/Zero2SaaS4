// components/settings/invoice-history.tsx
interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string | null;
  pdf: string | null;
}

export function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  // Ensure we handle empty state without TS errors
  if (!invoices || invoices.length === 0) {
    return <div className="text-sm text-muted-foreground italic">No invoice history found.</div>;
  }

  return (
    <div className="w-full">
          <div className="grid grid-cols-4 pb-4 border-b border-slate-100 text-sm font-bold text-slate-400 uppercase tracking-wider">
            <div>Date</div>
            <div>Description</div>
            <div>Amount</div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="mr-4"></span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {invoices.map((inv) => (
            <div key={inv.id} className="grid grid-cols-4 py-5 items-center text-[15px]">
              <div className="font-medium">{inv.date}</div>
              <div className="text-slate-600">{inv.description}</div>
              <div className="font-medium">${inv.amount.toFixed(2)}</div>
              <div className="flex justify-between items-center">
                <span className="bg-[#E1F3EC] text-[#006F4D] text-xs font-bold px-3 py-1 rounded-md">{inv.status}</span>
                {inv.pdf && (
                <a href={inv.pdf} target="_blank" rel="noreferrer" className="text-[#5A38C1] font-bold text-sm mr-4">PDF</a>
                )}
              </div>
            </div>
            ))}
          </div>
    </div>
  );
}
