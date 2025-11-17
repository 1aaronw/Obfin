import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";

export default function TransactionsTab() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchTx() {
      try {
        const txRef = collection(db, "users", user.uid, "transactions");
        const q = query(txRef, orderBy("date", "desc"));
        const snap = await getDocs(q);

        const results = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTransactions(results);
      } catch (err) {
        console.error("Error loading transactions:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTx();
  }, []);

  if (loading) {
    return <p>Loading your transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p>No transactions found.</p>;
  }

  return (
    <div>
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="p-4 border rounded mb-4 bg-white shadow-sm"
        >
          <p>
            <strong>Date:</strong>{" "}
            {tx.date?.toDate?.().toLocaleString() ?? "N/A"}
          </p>
          <p>
            <strong>Type:</strong> {tx.type}
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
      ))}
    </div>
  );
}