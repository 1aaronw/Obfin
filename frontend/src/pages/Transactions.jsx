import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import AddTransactionModal from "./transactions/AddTransactionModal";
import TaxHistoryTab from "./transactions/TaxHistoryTab";
import TransactionsTab from "./transactions/TransactionsTab";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [transaction, setTransaction] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
  });

  const [transactionsUpdated, setTransactionsUpdated] = useState(false);
  const [categories, setCategories] = useState([]); // store categories here

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    async function loadCategories() {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const cats = data.budgets?.categories || [];

        // Map to names only: ["Food", "Entertainment", ...]
        const categoryNames = cats.map((c) => c.name);

        setCategories(categoryNames);
      }
    }

    loadCategories();
  }, [user]);

  const handleChange = (updatedValues) => {
    setTransaction(updatedValues);
  };

  async function handleAddTransaction() {
    if (!transaction.amount || Number(transaction.amount) <= 0) {
      alert("Amount must be a positive number!");
      return;
    }
    if (!transaction.description) {
      alert("Description cannot be empty!");
      return;
    }
    if (!transaction.date) {
      alert("Date cannot be empty!");
      return;
    }
    if (!transaction.category) {
      alert("Category cannot be empty!");
      return;
    }

    const user = auth.currentUser;
    const month = transaction.date.substring(5, 7);
    const year = transaction.date.substring(0, 4);
    const transId = doc(collection(db, "users", user.uid, "spending")).id;

    const extractYearMonth = `${year}-${month}`;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        [`spending.${transId}`]: {
          amount: Number(transaction.amount),
          category: transaction.category,
          date: transaction.date,
          description: transaction.description,
          createdAt: Date.now(),
        },
        [`monthlyTrends.${extractYearMonth}`]: increment(
          Number(transaction.amount),
        ),
      });

      console.log("Transaction added!");
      setTransactionsUpdated((prev) => !prev);
      setIsModalOpen(false);

      setTransaction({
        date: "",
        category: "",
        amount: "",
        description: "",
      });
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
      {activeTab === "transactions" ? (
        <TransactionsTab transactionsUpdated={transactionsUpdated} />
      ) : (
        <TaxHistoryTab />
      )}

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTransaction}
        onChange={handleChange}
        categories={categories} // PASS CATEGORIES TO MODAL
      />
    </div>
  );
}
