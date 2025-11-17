export default function BlackButton({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg bg-black py-3 font-medium text-white transition hover:bg-gray-800"
    >
      {text}
    </button>
  );
}
