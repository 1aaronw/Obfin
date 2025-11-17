import { useState } from "react";
import TaxHistoryTab from "./transactions/TaxHistoryTab";
import TransactionsTab from "./transactions/TransactionsTab";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("transactions");

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Transactions & History</h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b pb-2 mb-6">
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

      {/* CONTENT */}
      {activeTab === "transactions" ? (
        <TransactionsTab />
      ) : (
        <TaxHistoryTab />
      )}
    </div>
  );
}