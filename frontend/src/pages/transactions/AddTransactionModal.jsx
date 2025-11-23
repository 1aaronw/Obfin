import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useRef } from "react";
import { useState, useEffect } from "react";

export default function AddTransactionModal({
  isOpen,
  onClose,
  onAdd,
  onChange,
}) {
  const completeButtonRef = useRef(null);
  //only want the format yyyy/dd/mm
  const today = new Date().toISOString().split("T")[0];

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

  //only add to database if user selects the option
  const [transaction, setTransaction] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
  });

  const [errors, setErrors] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
  });

  const handleChange = (e) => {
    const { id, value } = e.target; //specific <input> element that triggered the event
    //regex expression. must start with a digit
    const updated = { ...transaction, [id]: value }; //creates a new object that copies the exisiting transaction state but updates the only the field that changed
    //update  with the new object
    setTransaction(updated);
    onChange(updated); // makes the changes propagate upwards
  };

  const handleDescription = (e) => {
    const value = e.target.value;
    if (value.length <= 50) {
      //ensures we are working with correct value
      setTransaction((prev) => ({ ...prev, description: e.target.value }));
      onChange({ ...transaction, description: value });
    }
  };
  //extracts all of the words by the spaces and splits it to an array
  const charCount = transaction.description.length;

  const overLimit = charCount > 50;

  const handleAmount = (e) => {
    const { id, value } = e.target; //spacific <input> element that triggered the event
    //regex expression. must start with a digit
    if (value === "" || /^[0-9]+$/.test(value)) {
      const updated = { ...transaction, [id]: value }; //creates a new object that copies the exisiting budget state but updates the only the field that changed
      //update the component Budget with the new object
      setTransaction(updated);
      onChange(updated); // makes the changes propagate upwards
      setErrors({ ...errors, [id]: "" }); // clear error
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
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              value={transaction.date}
              onChange={handleChange}
              id="date"
              max={today}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

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
              <option value="housing">Housing</option>
              <option value="food">Food</option>
              <option value="insurance">Insurance</option>
              <option value="utilities">Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Amount ($)</label>
            <input
              type="number"
              id="amount"
              value={transaction.amount}
              onChange={handleAmount}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <input
              type="text"
              id="description"
              onChange={handleDescription}
              value={transaction.description}
              className={`mt-1 w-full rounded border p-2 ${
                overLimit ? "border-red-500" : "border-gray-300"
              }`}
            />
            {overLimit && (
              <p className="mt-1 text-sm text-red-500">
                Description must be 100 characters or fewer.
              </p>
            )}
            <div className="mt-1 text-right text-sm">
              <span className={overLimit ? "text-red-500" : "text-gray-500"}>
                {charCount} / 50 characters
              </span>
            </div>
          </div>

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
