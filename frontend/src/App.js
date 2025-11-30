import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import AIAdvisor from "./pages/AIAdvisor";
import Dashboard from "./pages/Dashboard";
import FirstTimeUser from "./pages/FirstTimeUser";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import TaxCalculator from "./pages/TaxCalculator";
import Transactions from "./pages/Transactions";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="firsttimeuser" element={<FirstTimeUser />} />

        {/* Protected dashboard routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="advisor" element={<AIAdvisor />} />
          <Route path="tax-calculator" element={<TaxCalculator />} />
           <Route path="/settings" element={<Settings />} />
          {/* You’ll add more pages here later */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
