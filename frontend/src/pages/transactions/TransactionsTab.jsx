import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";
import EditTransaction from "./EditTransaction";

export default function TransactionsTab() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", user.uid);

    // Listen for real-time updates
    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        const data = snap.data();
        const transactionMap = data?.spending || {};
        const transactionsArray = Object.entries(transactionMap).map(
          ([id, tx]) => ({
            id,
            ...tx,
          }),
        );

        // Sort descending by date
        transactionsArray.sort((a, b) => b.createdAt - a.createdAt);

        setTransactions(transactionsArray);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  function handleEdit(transaction) {
    setEditingTransaction(transaction);
    setIsEditOpen(true);
  }

  async function handleDelete(transactionId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction? This will update your monthly spending.",
    );
    if (!confirmDelete) return;

    try {
      const user = auth.currentUser;

      const response = await fetch(
        `http://localhost:5001/api/transactions/${user.uid}/${transactionId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Transaction deleted successfully!");
      } else {
        alert("Failed to delete transaction: " + data.error);
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  }

  async function handleUpdate(updatedTransaction) {
    try {
      const user = auth.currentUser;

      const response = await fetch(
        `http://localhost:5001/api/transactions/${user.uid}/${updatedTransaction.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: updatedTransaction.amount,
            category: updatedTransaction.category,
            date: updatedTransaction.date,
            description: updatedTransaction.description,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Transaction updated successfully!");
        setIsEditOpen(false);
        setEditingTransaction(null);
      } else {
        alert("Failed to update transaction: " + data.error);
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction");
    }
  }

  if (loading) {
    return <p>Loading your transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p>No transactions found.</p>;
  }

  return (
    <div>
      {transactions.map((tx) => (
        <div key={tx.id} className="mb-4 rounded border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p>
                <strong>Date: </strong>
                {tx.date}
              </p>
              <p>
                <strong>Category:</strong> {tx.category}
              </p>
              <p>
                <strong>Amount:</strong> ${tx.amount}
              </p>
              {tx.description && (
                <p>
                  <strong>Description:</strong> {tx.description}
                </p>
              )}
            </div>

            <div className="ml-4 flex flex-col space-y-2">
              <button
                onClick={() => handleEdit(tx)}
                className="rounded bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(tx.id)}
                className="rounded bg-red-500 px-4 py-2 text-sm text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {isEditOpen && editingTransaction && (
        <EditTransaction
          isOpen={isEditOpen}
          transaction={editingTransaction}
          onClose={() => {
            setIsEditOpen(false);
            setEditingTransaction(null);
          }}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
