import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />

        {/* Protected dashboard routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          {/* You’ll add more pages here later */}
        </Route>
      </Routes>
    </Router>
  );
}

test 

export default App;
