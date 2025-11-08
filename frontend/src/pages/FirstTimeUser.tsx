// import { signInWithPopup } from "firebase/auth";
// import { auth, googleProvider, db } from "../firebase/firebase";
// import { doc, getDoc } from "firebase/firestore";
import HeaderSection from "../components/HeaderSection";
import IncomeSection from "../components/IncomeSection";
import BudgetSection from "../components/BudgetSection";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function FirstTimeUser() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow">
        <HeaderSection />
        <IncomeSection />
        <BudgetSection />
        <Button text={"Complete Setup"} onClick={handleClick} />
      </div>
    </div>
  );
}
