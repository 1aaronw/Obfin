export default function IncomeSection() {
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
          placeholder="Monthly Income"
          className="w-full rounded-md border border-gray-300 p-2"
        />
        <select className="w-full rounded-md border border-gray-300 p-2">
          <option>USD ($)</option>
          <option>EUR (€)</option>
          <option>JPY (¥)</option>
        </select>
      </div>

      <input
        type="number"
        placeholder="Monthly Savings Goal"
        className="w-full rounded-md border border-gray-300 p-2"
      />
    </section>
  );
}
