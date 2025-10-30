import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
export default function Dashboard() {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("User signed out");
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-green-50">
      <h1 className="mb-4 text-3xl font-bold text-green-600">Dashboard</h1>
      <p className="mb-6 text-gray-700">
        Welcome to Obfin: Finance Manager & Advisor
      </p>
      <button
        onClick={handleSignOut}
        className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  );
}
