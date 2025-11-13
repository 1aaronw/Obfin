import { useState } from "react";

export default function IncomeSection({ onIncomeChange }) {
  const [income, setIncome] = useState({
    monthly_income: "",
    state_change: "",
    monthly_goal: "",
  });
  //function is called when the user types in any input
  const handleChange = (e) => {
    const { id, value } = e.target; //spacific <input> element that triggered the event
    //regex expression. must start with a digit
    if (value == "" || (/^\d+$/.test(value) && Number(value) >= 0)) {
      const updated = { ...income, [id]: value }; //creates a new object that copies the exisiting budget state but updates the only the field that changed
      //update the component Budget with the new object
      setIncome(updated);
      onIncomeChange(updated); // makes the changes propagate upwards
    }
  };
  //handles strings
  const handleSelectChange = (e) => {
    const { value } = e.target;
    const updated = { ...income, currency_change: value };
    setIncome(updated);
    onIncomeChange(updated);
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
          id="monthly_income"
          placeholder="Monthly Income"
          value={income.monthly_income}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 p-2"
        />
        <select
          value={income.currency_change}
          onChange={handleSelectChange}
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
        id="monthly_goal"
        placeholder="Monthly Savings Goal"
        value={income.monthly_goal}
        onChange={handleChange}
        className="w-full rounded-md border border-gray-300 p-2"
      />
    </section>
  );
}
