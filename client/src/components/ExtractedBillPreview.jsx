export default function ExtractedBillPreview({ data, onCreateExpense }) {
  if (!data) return null;

  return (
    <div className="p-6 rounded-2xl mt-6 space-y-4">
      <h3 className="text-lg font-semibold">Extracted Details</h3>

      <div className="space-y-2 text-sm">
        <p><strong>Vendor:</strong> {data.vendor}</p>
        <p><strong>Total:</strong> ₹ {data.total}</p>
        <p><strong>Date:</strong> {data.date}</p>
      </div>

      <button
        onClick={onCreateExpense}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-primary-foreground font-semibold py-2 rounded-xl"
      >
        Create Expense
      </button>
    </div>
  );
}
