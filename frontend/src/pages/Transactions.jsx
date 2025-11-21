import { useState } from "react";
import TaxHistoryTab from "./transactions/TaxHistoryTab";
import TransactionsTab from "./transactions/TransactionsTab";
import AddTransactionModal from "./transactions/AddTransactionModal";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleAddTransaction() {
    // logic to add transaction goes here
    console.log("Transaction added!");
    setIsModalOpen(false);
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Transactions & History</h1>

      {/* Tabs */}
      <div className="mb-6 flex items-center border-b pb-2">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-2 ${
              activeTab === "transactions"
                ? "border-b-2 border-blue-600 font-semibold"
                : "text-gray-500"
            }`}
          >
            Transactions
          </button>

          <button
            onClick={() => setActiveTab("tax")}
            className={`pb-2 ${
              activeTab === "tax"
                ? "border-b-2 border-blue-600 font-semibold"
                : "text-gray-500"
            }`}
          >
            Tax History
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="font-small -mt-2 ml-auto w-1/4 rounded-full bg-black py-1 text-white transition hover:bg-green-600"
        >
          Add Transaction
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === "transactions" ? <TransactionsTab /> : <TaxHistoryTab />}

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTransaction}
      />
    </div>
  );
}
