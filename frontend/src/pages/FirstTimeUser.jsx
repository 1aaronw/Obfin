import { setDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import HeaderSection from "../components/HeaderSection";
import IncomeSection from "../components/IncomeSection";
import BudgetSection from "../components/BudgetSection";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function FirstTimeUser() {
  const navigate = useNavigate();

  const [budget, setBudget] = useState({
    housing: "",
    entertainment: "",
    food: "",
    insurance: "",
    utilities: "",
    miscellaneous: "",
  });

  const [incomeData, setIncomeData] = useState({
    annualIncome: "",
    state: "",
    monthlySavingsGoal: "",
  });

  const convertToCategories = (budget) => {
    const keys = [
      "food",
      "entertainment",
      "insurance",
      "utilities",
      "miscellaneous",
    ];

    return keys.map((k) => ({
      id: k,
      name: k.charAt(0).toUpperCase() + k.slice(1),
      amount: budget[k] || 0,
    }));
  };

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const { annualIncome, state } = incomeData;
  useEffect(() => {
    if (!annualIncome) return;

    const fetchMonthlyIncome = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/tax/calculate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              income: Number(annualIncome),
              state,
            }),
          },
        );

        const data = await response.json();
        if (response.ok) {
          const autoMonthly = Math.round(data.netIncome / 12);
          setMonthlyIncome(autoMonthly);
        }
      } catch (err) {
        console.error("Auto income fetch failed:", err);
      }
    };

    fetchMonthlyIncome();
  }, [annualIncome, state]);

  const isBudgetValid = () => {
    //checks every value in the object budget to ensure its not an empty string or a negative number
    return Object.values(budget).every(
      (value) => value !== "" || Number(value) > 0,
    );
  };

  const isIncomeValid = () => {
    const { annualIncome, savingsGoal, state } = incomeData; // since savingsGoal is a string need to check for it
    return (
      annualIncome !== "" &&
      Number(annualIncome) > 0 &&
      savingsGoal !== "" &&
      Number(savingsGoal) > 0 &&
      state !== ""
    );
  };

  const handleBudgetChange = (updatedValues) => {
    setBudget(updatedValues);
  };
  const handleIncomeChange = (updatedValues) => {
    setIncomeData(updatedValues);
    setMonthlyIncome(updatedValues);
  };

  const handleCompleteSetup = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("user not signed in");
      return;
    }
    if (!isBudgetValid()) {
      alert("All budget categories must have a positive number!");
      return;
    }
    if (!isIncomeValid()) {
      alert("All income categories must be filled!");
      return;
    }

    try {
      //creates a new doc and adds stores budget and income fields
      await setDoc(doc(db, "users", user.uid), {
        createdAt: new Date(),
        budgets: {
          categories: convertToCategories(budget), //new categories structures
          annualIncome: Number(incomeData.annualIncome),
          monthlyIncome,
          state: incomeData.state,
          monthlySavingsGoal: Number(incomeData.savingsGoal),
        },
      });
      console.log("Successfully saved!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving user data:", error);
      alert("Failed to save user data.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow">
        <HeaderSection />
        <IncomeSection onIncomeChange={handleIncomeChange} />
        <BudgetSection onBudgetChange={handleBudgetChange} />
        <Button text={"Complete Setup"} onClick={handleCompleteSetup} />
      </div>
    </div>
  );
}
