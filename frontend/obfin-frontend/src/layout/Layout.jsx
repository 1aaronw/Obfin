import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <h2 className="text-2xl font-bold p-6 border-b border-gray-700">
          Obfin
        </h2>
        <nav className="flex flex-col space-y-2 p-4">
          <Link
            to="/dashboard"
            className="hover:bg-gray-700 p-2 rounded"
          >
            Dashboard
          </Link>
          <Link
            to="/analytics"
            className="hover:bg-gray-700 p-2 rounded"
          >
            Analytics
          </Link>
          <Link
            to="/advisor"
            className="hover:bg-gray-700 p-2 rounded"
          >
            AI Advisor
          </Link>
          <Link
            to="/transactions"
            className="hover:bg-gray-700 p-2 rounded"
          >
            Transactions
          </Link>
          <Link
            to="/settings"
            className="hover:bg-gray-700 p-2 rounded"
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <Outlet /> {/* This renders the nested page */}
      </main>
    </div>
  );
}
