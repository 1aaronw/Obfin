type BlackButtonProps = {
  text: string;
  onClick?: () => void;
};

export default function BlackButton({ text, onClick }: BlackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg bg-black py-3 font-medium text-white transition hover:bg-gray-800"
    >
      {text}
    </button>
  );
}
