import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import "../animation.css";
import chartlogo from "../chart.svg";
import chatlogo from "../chat.svg";

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
    <div className="green-animated-bg flex min-h-screen flex-col items-center p-10">
      <h1 className="mb-4 text-7xl font-extrabold text-white">Obfin</h1>
      <h2 className="mb-8 text-4xl text-white">Finance Manager & Advisor</h2>
      <p className="text-7md mb-8 text-white">
        Take control of your financial future with intelligent tracking,
        insights, and personalized advice.
      </p>
      <div className="mb-12 grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div className="rounded-md bg-white/100 p-6 text-center shadow-lg backdrop-blur-md transition hover:bg-gray-100">
          <h1 className="mb-5 text-2xl">Visual Analytics</h1>
          <img
            className="mx-auto mb-8 h-20 w-20 object-scale-down"
            src={chartlogo}
            alt="Chart Logo"
          />
          <p className="">
            Track your spending patterns with charts and real-time insights
          </p>
        </div>
        <div className="rounded-md bg-white/100 p-6 text-center shadow-lg backdrop-blur-md transition hover:bg-gray-100">
          <h1 className="mb-5 text-2xl">AI Financial Advisor</h1>
          <img
            className="mx-auto mb-8 h-20 w-20 object-scale-down"
            src={chatlogo}
            alt="Chat Logo"
          />
          <p className="">Get financial advice and answers to your questions</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-green-400"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </div>
  );
}
