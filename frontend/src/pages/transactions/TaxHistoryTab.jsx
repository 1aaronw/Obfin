import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";

export default function TaxHistoryTab() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const user = auth.currentUser;
        if (!user) {
          setHistory([]);
          setLoading(false);
          return;
        }

        // Correct Firestore path
        const ref = collection(db, "users", user.uid, "taxCalculations");

        // Sort newest first
        const q = query(ref, orderBy("createdAt", "desc"));

        const snap = await getDocs(q);

        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setHistory(items);
      } catch (err) {
        console.error("Error loading tax history:", err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  if (loading) return <p>Loading tax history…</p>;

  if (!history || history.length === 0)
    return <p>No tax history yet.</p>;

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <div key={entry.id} className="p-4 border rounded bg-gray-50">
          <p><strong>Date:</strong> {entry.createdAt?.toDate().toLocaleString()}</p>
          <p><strong>Income:</strong> ${entry.income}</p>
          <p><strong>State:</strong> {entry.state}</p>
          <p><strong>Federal Tax:</strong> ${entry.federalTax}</p>
          <p><strong>State Tax:</strong> ${entry.stateTax}</p>
          <p><strong>Total Tax:</strong> ${entry.totalTax}</p>
          <p><strong>Effective Rate:</strong> {entry.effectiveRate}%</p>
        </div>
      ))}
    </div>
  );
}