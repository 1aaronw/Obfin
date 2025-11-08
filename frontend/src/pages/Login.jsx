import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("User signed in:", user);
      checkUserInFirestore(user.uid);
    } catch (error) {
      console.error("Error signing in:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUserInFirestore = async (uid) => {
    const userRef = doc(db, "users", uid);
    const userRecord = await getDoc(userRef);
    if (userRecord.exists()) {
      console.log("Returned User");
      window.location.href = "/dashboard";
    } else {
      console.log("New User");
      window.location.href = "/firsttimeuser";
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-4 text-3xl font-bold text-blue-600">Login Page</h1>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </div>
  );
}
