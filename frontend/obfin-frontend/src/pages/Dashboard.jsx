import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';
export default function Dashboard() {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-50">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Dashboard</h1>
      <p className="text-gray-700 mb-6">
        Welcome to Obfin: Finance Manager & Advisor
      </p>
      <button
        onClick={handleSignOut}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  );
}
