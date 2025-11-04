import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

export default function Dashboard() {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const processSpendingData = useCallback((spending) => {
    const categories = {};
    const categoryColors = {
      housing: "#3B82F6",
      utilities: "#8B5CF6",
      entertainment: "#EC4899",
      insurance: "#EF4444",
      food: "#10B981",
      transportation: "#F59E0B",
      healthcare: "#06B6D4",
      other: "#6B7280",
    };
    let total = 0;

    Object.values(spending).forEach((transaction) => {
      const category = transaction.category || "other";
      const amount = parseFloat(transaction.amount) || 0;

      categories[category] = (categories[category] || 0) + amount;
      total += amount;
    });

    const chartData = Object.entries(categories).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
      percentage: Math.round((value / total) * 100),
      color: categoryColors[name] || categoryColors.other,
    }));

    setCategoryData(chartData);
    setTotalSpent(parseFloat(total.toFixed(2)));
  }, []);

  const processBudgetData = (budgets, spending) => {
    const spendingByCategory = {};

    if (spending) {
      Object.values(spending).forEach((transaction) => {
        const category = transaction.category || "other";
        const amount = parseFloat(transaction.amount) || 0;
        spendingByCategory[category] =
          (spendingByCategory[category] || 0) + amount;
      });
    }

    const chartData = Object.entries(budgets).map(
      ([category, budgetAmount]) => ({
        category,
        actual: parseFloat((spendingByCategory[category] || 0).toFixed(2)),
        budget: parseFloat(budgetAmount),
      }),
    );

    setBudgetData(chartData);
  };

  const processTrendData = (trends) => {
    const chartData = Object.entries(trends)
      .map(([month, amount]) => ({
        month,
        spending: parseFloat(amount),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-5); // Last x months

    setTrendData(chartData);
  };

  useEffect(() => {
    const db = getFirestore();

    // IMPORTANT: Replace the 'testUser' with actual automatic google authentication document id later
    const userId = "iEQ13Kho4PfaRWY2n3d8";

    // IMPORTANT: Replace the 'testUser' with actual collection later
    const docRef = doc(db, "testUser", userId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data();

            setMonthlyIncome(data.monthlyIncome || 0);
            setSavingsGoal(data.savingsGoal || 1000);

            if (data.spending) {
              processSpendingData(data.spending);
            }
            if (data.budgets) {
              processBudgetData(data.budgets, data.spending);
            }
            if (data.monthlyTrends) {
              processTrendData(data.monthlyTrends);
            }
          } else {
            console.log("No document found");
            // Empty data default
            setCategoryData([]);
            setBudgetData([]);
            setTrendData([]);
            setTotalSpent(0);
          }

          setLoading(false);
        } catch (err) {
          console.error("Error processing data:", err);
          setError("Failed to load data");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Failed to connect to database: " + err.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [processSpendingData]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("User signed out");
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Custom label for pie chart
  const renderCustomLabel = (entry) => {
    return `${entry.name}: ${entry.percentage}%`;
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-green-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600"></div>
          <p className="text-gray-700">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-green-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-800">Error</p>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
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

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm text-gray-600">Total Spent This Month</p>
            <p className="text-3xl font-bold text-gray-900">
              ${totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm text-gray-600">Monthly Income</p>
            <p className="text-3xl font-bold text-gray-900">
              ${monthlyIncome.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm text-gray-600">
              Savings (Goal: ${savingsGoal})
            </p>
            <p
              className={`text-3xl font-bold ${monthlyIncome - totalSpent < 0 ? "text-red-600" : "text-green-600"}`}
            >
              ${(monthlyIncome - totalSpent).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Spending by Category */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Spending by Category
            </h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                No spending data available
              </div>
            )}
          </div>

          {/* Budget vs Actual */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Budget vs Actual Spending
            </h2>
            {budgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
                  <Bar dataKey="budget" fill="#9CA3AF" name="Budget" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                No budget data available
              </div>
            )}
          </div>
        </div>

        {/* Spending Trend */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Spending Trend (Last 5 Months)
          </h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", r: 4 }}
                  name="spending"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
