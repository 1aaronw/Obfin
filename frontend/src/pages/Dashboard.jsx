import { signOut, getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth } from "../firebase/firebase";

// separate chat box component to prevent re-renders to charts
function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const COOLDOWN_MS = 10000; // 10 seconds

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const now = Date.now();
    if (now - lastMessageTime < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastMessageTime)) / 1000);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: `Please wait ${remaining} second(s) before sending another message.`,
        },
      ]);
      return;
    }

    const userMessage = currentMessage.trim();
    setCurrentMessage("");
    setMessages((prev) => [...prev, { type: "user", text: userMessage }]);
    setChatLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setMessages((prev) => [
        ...prev,
        { type: "error", text: "Please sign in to use the Finance Assistant." },
      ]);
      setChatLoading(false);
      return;
    }

    const uid = user.uid;
    console.log("Dashboard chat - sending with uid:", uid);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/gemini/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage, uid }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: data.response,
            model: data.model,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            text: data.error || "Failed to get response",
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: "Network error: Unable to connect to chatbot",
        },
      ]);
    }

    setChatLoading(false);
    setLastMessageTime(Date.now());
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* floating chat button */}
      <button
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-green-600 p-4 text-white shadow-lg transition-colors hover:bg-green-700"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>

      {/* chat window */}
      {showChatbot && (
        <div className="fixed bottom-24 right-6 z-50 flex h-96 w-96 max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
          {/* chat header */}
          <div className="flex items-center justify-between rounded-t-lg bg-green-600 p-4 text-white">
            <div>
              <h3 className="font-semibold">Finance Assistant</h3>
            </div>
            <button
              onClick={() => setShowChatbot(false)}
              className="text-white hover:text-gray-200"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* chat messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500">
                Ask me anything about your finances!
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === "user"
                      ? "bg-green-600 text-white"
                      : message.type === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                  {message.model && (
                    <p className="mt-1 text-xs opacity-70">
                      Model: {message.model}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 p-3 text-gray-800">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* chat Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                maxLength={1000}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your finances..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={chatLoading}
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !currentMessage.trim()}
                className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-2 text-xs text-gray-500 text-right">
              {1000 - currentMessage.length}/1000 characters
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function News() {
  const [news, setNews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/news`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch news");
        }

        const data = await response.json();
        setNews(data.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching news:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchNews();

    // Refreshes every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + news.length) % news.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Financial News
        </h2>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Financial News
        </h2>
        <div className="flex h-64 items-center justify-center">
          <p className="text-red-600">Failed to load news: {error}</p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Financial News
        </h2>
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">No news available</p>
        </div>
      </div>
    );
  }

  const currentArticle = news[currentIndex];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Financial News
      </h2>

      <div className="relative">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50">
          {/* Article's image */}
          {currentArticle.image_url && (
            <div className="h-48 w-full overflow-hidden">
              <img
                src={currentArticle.image_url}
                alt={currentArticle.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Article contents */}
          <div className="p-6">
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
                {currentArticle.source}
              </span>
              <span>
                {new Date(currentArticle.published_at).toLocaleDateString()}
              </span>
            </div>

            <h3 className="mb-3 line-clamp-2 text-xl font-bold text-gray-900">
              {currentArticle.title}
            </h3>

            <p className="mb-4 line-clamp-3 text-sm text-gray-600">
              {currentArticle.description}
            </p>

            {/* Entities/Stock symbols */}
            {currentArticle.entities && currentArticle.entities.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {currentArticle.entities.slice(0, 3).map((entity, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                  >
                    {entity.symbol}
                  </span>
                ))}
              </div>
            )}

            <a
              href={currentArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700"
            >
              Read full article
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition-all hover:scale-110 hover:bg-white"
          aria-label="Previous article"
        >
          <svg
            className="h-5 w-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition-all hover:scale-110 hover:bg-white"
          aria-label="Next article"
        >
          <svg
            className="h-5 w-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Dot indicators */}
        <div className="mt-4 flex justify-center gap-2">
          {news.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-green-600"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to article ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  //backend health check
  const [backendStatus, setBackendStatus] = useState("checking");

  // memoize category colors to prevent re-creation
  const categoryColors = useMemo(
    () => ({
      housing: "#3B82F6",
      utilities: "#8B5CF6",
      entertainment: "#EC4899",
      insurance: "#EF4444",
      food: "#10B981",
      transportation: "#F59E0B",
      healthcare: "#06B6D4",
      other: "#6B7280",
    }),
    [],
  );

  const processSpendingData = useCallback(
    (spending, yearMonth) => {
      //pass in the month
      const categories = {};
      let total = 0;

      Object.values(spending).forEach((transaction) => {
        if (!transaction.date.startsWith(yearMonth)) return; //dont add to total if not the current month
        const category = (transaction.category || "other").toLowerCase();
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
    },
    [categoryColors],
  );

  const processBudgetData = useCallback((budgets, spending) => {
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
  }, []);

  const processTrendData = useCallback((trends) => {
    const chartData = Object.entries(trends)
      .map(([month, amount]) => ({
        month,
        spending: parseFloat(amount),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-5); // Last x months

    setTrendData(chartData);
  }, []);

  useEffect(() => {
    //Use commented out code if want to test the "dummy test user"
    //const TEST_UID = "iEQ13Kho4PfaRWY2n3d8";
    const db = getFirestore();
    const auth = getAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log("User is not signed in yet");
        setLoading(true);
        return;
      }
      console.log("Logged in as:", user.uid);

      const docRef = doc(db, "users", user.uid);
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      //const docRef = doc(db, "testUser", TEST_UID);

      const unsubscribeDoc = onSnapshot(
        docRef,
        (docSnap) => {
          try {
            if (docSnap.exists()) {
              const data = docSnap.data();

              setMonthlyIncome(data.monthlyIncome || 0);
              setSavingsGoal(data.savingsGoal || 1000);

              if (data.spending) {
                processSpendingData(data.spending, currentMonthYear);
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
      return () => unsubscribeDoc();
    });
    return () => unsubscribeAuth();
  }, [processSpendingData, processBudgetData, processTrendData]);

  //for server status monitoring, keeping it now for testing and debugging purposes and might keep it after development phase ----------do not remove it---------------
  useEffect(() => {
    const base = process.env.REACT_APP_API_BASE_URL;
    if (!base) {
      setBackendStatus("env-missing");
      return;
    }
    // console.log("Testing connection to backend:", base); <-- used this while making frontend talk to backend (for testing purposes)
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then((d) => setBackendStatus(d?.status || "unknown"))
      .catch(() => setBackendStatus("down"));
  }, []);

  // ---------------- Dev-only backend connection test ----------------
  // This fetch is for confirming frontend↔backend link during development.
  // It can be safely ignored in production.
  useEffect(() => {
    const base = process.env.REACT_APP_API_BASE_URL;
    if (!base) return;

    fetch(`${base}/api/testUser`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Test API Response:", data);
      })
      .catch((err) => {
        console.error("Error connecting to test API:", err);
      });
  }, []);

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
    <>
      <div className="min-h-screen bg-green-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center">
            <h1 className="mb-4 text-3xl font-bold text-green-600">
              Dashboard
            </h1>
            <p className="mb-6 text-gray-700">
              Welcome to Obfin: Finance Manager & Advisor
            </p>

            {/* Backend status pill, great for quick visual confirmation, will keep it while developing, but later we can hide it  behind a dev-only flag ------do not remove it--------- */}

            <div className="mb-4">
              <span
                className={
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium " +
                  (backendStatus === "ok"
                    ? "bg-green-100 text-green-700"
                    : backendStatus === "checking"
                      ? "bg-yellow-100 text-yellow-700"
                      : backendStatus === "env-missing"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700")
                }
                title={
                  backendStatus === "env-missing"
                    ? "REACT_APP_API_BASE_URL not set"
                    : ""
                }
              >
                {backendStatus === "ok" && "Backend: ok"}
                {backendStatus === "checking" && "Backend: checking…"}
                {backendStatus === "down" && "Backend: unreachable"}
                {backendStatus === "env-missing" && "Backend: env missing"}
                {backendStatus === "unknown" && "Backend: unknown"}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
          {/* News Segment*/}

          <div className="mb-8">
            <News />
          </div>

          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="mb-2 text-sm text-gray-600">
                Total Spent This Month
              </p>
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

      {/* include completely separate chatbot component */}
      <Chatbot />
    </>
  );
}
