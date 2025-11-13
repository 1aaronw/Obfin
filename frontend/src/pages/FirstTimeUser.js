// import { signInWithPopup } from "firebase/auth";
// import { auth, googleProvider, db } from "../firebase/firebase";
// import { doc, getDoc } from "firebase/firestore";
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
    monthly_income: "",
    state: "",
  });

  const isBudgetValid = () => {
    return Object.values(budget).every(
      (value) => value !== "" || Number(value) > 0,
    );
  };

  const isIncomeValid = () => {
    return Object.values(incomeData).every(
      (value) => value !== "" || Number(value) > 0,
    );
  };

  const handleBudgetChange = (updatedValues) => {
    setBudget(updatedValues);
  };

  const handleIncomeChange = (updatedValues) => {
    setIncomeData(updatedValues);
  };

  const handleClick = () => {
    if (!isBudgetValid()) {
      alert("All budget categories must have a positive number!");
      return;
    }
    if (!isIncomeValid()) {
      alert("All income categories must have a positive number!");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow">
        <HeaderSection />
        <IncomeSection onIncomeChange={handleIncomeChange} />
        <BudgetSection onBudgetChange={handleBudgetChange} />
        <Button text={"Complete Setup"} onClick={handleClick} />
      </div>
    </div>
  );
}
