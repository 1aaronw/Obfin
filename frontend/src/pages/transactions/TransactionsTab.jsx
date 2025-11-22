import { doc, onSnapshot } from "firebase/firestore";
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
  });
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
      ))}
    </div>
  );
}
