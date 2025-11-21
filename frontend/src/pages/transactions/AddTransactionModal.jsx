import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useRef } from "react";

export default function AddTransactionModal({ isOpen, onClose, onAdd }) {
  const completeButtonRef = useRef(null);
  //only want the format yyyy/dd/mm
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
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
              max={today}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Category</label>
            <select className="mt-1 w-full rounded border p-2">
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
            <label className="block text-sm font-medium">Amount</label>
            <input type="number" className="mt-1 w-full rounded border p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <input type="text" className="mt-1 w-full rounded border p-2" />
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
