import { useState } from "react";
import TaxHistoryTab from "./transactions/TaxHistoryTab";
import TransactionsTab from "./transactions/TransactionsTab";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("transactions");

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Transactions & History</h1>

      {/* Tabs */}
      <div className="mb-6 flex space-x-4 border-b pb-2">
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
      {activeTab === "transactions" ? <TransactionsTab /> : <TaxHistoryTab />}
    </div>
  );
}
