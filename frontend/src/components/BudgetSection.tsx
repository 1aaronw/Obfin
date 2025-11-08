export default function BudgetSection() {
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
          placeholder="Housing"
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          placeholder="Entertainment"
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          placeholder="Food & Groceries"
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          placeholder="Insurance"
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          placeholder="Utilities"
          className="rounded-md border border-gray-300 p-2"
        />
        <input
          placeholder="Miscellaneous"
          className="rounded-md border border-gray-300 p-2"
        />
      </div>
    </section>
  );
}
