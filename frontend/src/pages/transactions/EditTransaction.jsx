import { useState, useEffect } from "react";

export default function EditTransaction({
  isOpen,
  transaction,
  onClose,
  onUpdate,
}) {
  const [formData, setFormData] = useState({
    id: "",
    date: "",
    category: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        id: transaction.id,
        date: transaction.date,
        category: transaction.category,
        amount: transaction.amount,
        description: transaction.description,
      });
    }
  }, [transaction]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    // Validation
    if (formData.amount === "" || Number(formData.amount) < 0) {
      alert("Amount must be a positive number!");
      return;
    }
    if (formData.description === "") {
      alert("Description cannot be empty!");
      return;
    }
    if (formData.date === "") {
      alert("Date cannot be empty!");
      return;
    }
    if (formData.category === "") {
      alert("Category cannot be empty!");
      return;
    }

    onUpdate(formData);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block font-semibold">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">Select Category</option>
              <option value="housing">Housing</option>
              <option value="food">Food</option>
              <option value="transportation">Transportation</option>
              <option value="entertainment">Entertainment</option>
              <option value="healthcare">Healthcare</option>
              <option value="utilities">Utilities</option>
              <option value="shopping">Shopping</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-semibold">Amount ($)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded bg-blue-500 py-2 text-white transition hover:bg-blue-600"
            >
              Update Transaction
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded bg-gray-300 py-2 text-gray-700 transition hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
