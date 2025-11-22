import { useState } from "react";
import TaxHistoryTab from "./transactions/TaxHistoryTab";
import TransactionsTab from "./transactions/TransactionsTab";
import AddTransactionModal from "./transactions/AddTransactionModal";
import { collection, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getAuth } from "firebase/auth";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [transaction, setTransaction] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
  });

  const handleChange = (updatedValues) => {
    setTransaction(updatedValues);
  };

  async function handleAddTransaction() {
    // logic to add transaction goes here
    if (transaction.amount === "" || Number(transaction.amount) < 0) {
      alert("Amount must have a positive number!");
      return;
    }
    if (transaction.description === "") {
      alert("Description can not be empty!");
      return;
    }
    if (transaction.date === "") {
      alert("Date can not be empty!");
      return;
    }
    if (transaction.category === "") {
      alert("Category can not be empty!");
      return;
    }
    const auth = getAuth();
    const user = auth.currentUser;
    const month = transaction.date.substring(5, 7);
    const year = transaction.date.substring(0, 4);
    const transId = doc(collection(db, "users", user.uid, "spending")).id; //generates a unique id
    const extractYearMonth = `${year}-${month}`;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        [`spending.${transId}`]: {
          amount: Number(transaction.amount),
          category: transaction.category,
          date: transaction.date,
          description: transaction.description,
        },
        [`monthlyTrends.${extractYearMonth}`]: increment(
          Number(transaction.amount),
        ),
      });
      console.log("Transaction added!");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving transaction", error);
      alert("Failed to add transaction.");
      setIsModalOpen(false);
    }
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
        onChange={handleChange}
      />
    </div>
  );
}
