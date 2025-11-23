import { setDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getAuth } from "firebase/auth";
import { useState } from "react";
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
    monthlyIncome: "",
    state: "",
    savingsGoal: "",
  });

  const isBudgetValid = () => {
    //checks every value in the object budget to ensure its not an empty string or a negative number
    return Object.values(budget).every(
      (value) => value !== "" || Number(value) > 0,
    );
  };

  const isIncomeValid = () => {
    const { monthlyIncome, savingsGoal, state } = incomeData; // since savingsGoal is a string need to check for it
    return (
      monthlyIncome !== "" &&
      Number(monthlyIncome) > 0 &&
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
          entertainment: Number(budget.entertainment),
          food: Number(budget.food),
          insurance: Number(budget.insurance),
          utilities: Number(budget.utilities),
          miscellaneous: Number(budget.miscellaneous),
        },
        monthlyIncome: Number(incomeData.monthlyIncome),
        state: incomeData.state,
        savingsGoal: Number(incomeData.savingsGoal),
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
