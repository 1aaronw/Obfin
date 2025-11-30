import { deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";

export default function DangerZone() {
  const user = auth.currentUser;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;

    await deleteDoc(doc(db, "users", user.uid));
    await user.delete();

    alert("Account deleted.");
  };

  return (
    <div className="border border-red-400 p-4 rounded">
      <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>

      <button
        className="bg-red-600 text-white px-4 py-2 rounded"
        onClick={handleDelete}
      >
        Delete Account
      </button>
    </div>
  );
}