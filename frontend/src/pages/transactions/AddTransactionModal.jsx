import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";

export default function AddTransactionModal({
  isOpen,
  onClose,
  onAdd,
  onChange,
  categories = [],
}) {
  const completeButtonRef = useRef(null);
  const today = new Date().toISOString().split("T")[0];

  const [transaction, setTransaction] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      setTransaction({
        date: "",
        category: "",
        amount: "",
        description: "",
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const updated = { ...transaction, [id]: value };
    setTransaction(updated);
    onChange(updated);
  };

  const handleAmount = (e) => {
    let value = e.target.value;

    // Allow decimals
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      const updated = { ...transaction, amount: value };
      setTransaction(updated);
      onChange(updated);
    }
  };

  const handleDescription = (e) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setTransaction({ ...transaction, description: value });
      onChange({ ...transaction, description: value });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => {}}
      initialFocus={completeButtonRef}
      className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-30"
    >
      <DialogPanel className="w-96 rounded bg-white p-6">
        <DialogTitle className="mb-4 text-xl font-bold">
          Add Transaction
        </DialogTitle>

        <form className="space-y-4">
          {/* DATE */}
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              id="date"
              max={today}
              value={transaction.date}
              onChange={handleChange}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="block text-sm font-medium">Category</label>
            <select
              id="category"
              value={transaction.category}
              onChange={handleChange}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="" disabled hidden>
                Select Category
              </option>

              {categories.length === 0 && (
                <option disabled>No categories found</option>
              )}

              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* AMOUNT */}
          <div>
            <label className="block text-sm font-medium">Amount ($)</label>
            <input
              type="text"
              id="amount"
              placeholder="e.g. 28.50"
              value={transaction.amount}
              onChange={handleAmount}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              id="description"
              value={transaction.description}
              onChange={handleDescription}
              className="mt-1 w-full rounded border p-2"
              rows={2}
              placeholder="Optional note about this transaction"
            />
            <div className="mt-1 text-right text-sm text-gray-500">
              {transaction.description.length} / 100 characters
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              ref={completeButtonRef}
              type="button"
              onClick={onAdd}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              Add
            </button>
          </div>
        </form>
      </DialogPanel>
    </Dialog>
  );
}
