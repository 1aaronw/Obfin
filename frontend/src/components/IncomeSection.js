import { useState } from "react";

export default function IncomeSection({ onIncomeChange }) {
  const [income, setIncome] = useState({
    monthlyIncome: "",
    state: "",
    savingsGoal: "",
  });
  //function is called when the user types in any input
  const handleChange = (e) => {
    const { id, value } = e.target; //spacific <input> element that triggered the event
    //regex expression. must start with a digit
    const updated = { ...income, [id]: value }; //creates a new object that copies the exisiting budget state but updates the only the field that changed
    //update the component Budget with the new object
    setIncome(updated);
    onIncomeChange(updated); // makes the changes propagate upwards
  };
  return (
    <section className="mb-6 rounded-lg border p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-800">
        Income Information
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Tell us about your monthly income
      </p>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <input
          type="number"
          id="monthlyIncome"
          placeholder="Monthly Income"
          value={income.monthlyIncome}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 p-2"
        />
        <select
          id="state"
          value={income.state}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 p-2"
        >
          <option value="" disabled hidden>
            Select your state
          </option>
          <option value="CA">CA</option>
          <option value="TX">TX</option>
        </select>
      </div>

      <input
        type="number"
        id="savingsGoal"
        placeholder="Monthly Savings Goal"
        value={income.savingsGoal}
        onChange={handleChange}
        className="w-full rounded-md border border-gray-300 p-2"
      />
    </section>
  );
}
