import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation(); // Track route changes

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  // Automatically close sidebar when route changes (on mobile/ tablets)
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 md:static md:w-64`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">Obfin</h2>
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={closeSidebar}
          >
            <X size={24} />
          </button>
        </div>

        {/* Sidebar nav */}
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

      {/* Overlay for mobile/ipad */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar for mobile */}
        <header className="flex items-center justify-between bg-white p-4 shadow-md md:hidden">
          <button onClick={toggleSidebar}>
            <Menu
              size={24}
              className="text-gray-800"
            />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {location.pathname === "/dashboard"
              ? "Dashboard"
              : location.pathname.replace("/", "").toUpperCase() || "OBFIN"}
          </h1>
        </header>

        {/* Outlet for page content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
