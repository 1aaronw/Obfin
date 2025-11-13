import { useState } from "react";

export default function BudgetSection({ onBudgetChange }) {
  // Use state is the value we want the state to be initially. so we want them all to be 0 initally
  const [budget, setBudget] = useState({
    housing: "",
    entertainment: "",
    food: "",
    insurance: "",
    utilities: "",
    miscellaneous: "",
  });
  //stores all the errors. initally empty
  const [errors, setErrors] = useState({
    housing: "",
    entertainment: "",
    food: "",
    insurance: "",
    utilities: "",
    miscellaneous: "",
  });

  //function is called when the user types in any input
  const handleChange = (e) => {
    const { id, value } = e.target; //spacific <input> element that triggered the event
    //regex expression. must start with a digit
    if (value === "" || /^[0-9]+$/.test(value)) {
      const updated = { ...budget, [id]: value }; //creates a new object that copies the exisiting budget state but updates the only the field that changed
      //update the component Budget with the new object
      setBudget(updated);
      onBudgetChange(updated); // makes the changes propagate upwards
      setErrors({ ...errors, [id]: "" }); // clear error
    }
  };

  return (
    <section className="mb-6 rounded-lg border p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-800">
        Budget Categories
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Set your monthly budget for each category
      </p>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          id="housing"
          placeholder="Housing"
          value={budget.housing}
          onChange={handleChange}
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          type="number"
          id="entertainment"
          placeholder="Entertainment"
          value={budget.entertainment}
          onChange={handleChange}
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          type="number"
          id="food"
          placeholder="Food & Groceries"
          value={budget.food}
          onChange={handleChange}
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          type="number"
          id="insurance"
          placeholder="Insurance"
          value={budget.insurance}
          onChange={handleChange}
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          type="number"
          id="utilities"
          placeholder="Utilities"
          value={budget.utilities}
          onChange={handleChange}
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          type="number"
          id="miscellaneous"
          placeholder="Miscellaneous"
          value={budget.miscellaneous}
          onChange={handleChange}
          className="rounded-md border border-gray-300 p-2"
        />
      </div>
    </section>
  );
}
