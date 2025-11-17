import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase/firebase";

export default function AIAdvisor() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // local-only chat history
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const bottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setErrorMsg("");
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg("You must be logged in to use the advisor.");
      setLoading(false);
      return;
    }

    const uid = user.uid;

    // Add your message to UI immediately
    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
      const res = await fetch("http://localhost:5001/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, uid }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong");
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.response },
        ]);
      }
    } catch (err) {
      setErrorMsg("Backend connection failed");
    }

    setInput("");
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Financial Advisor</h1>

      {/* Chat Box */}
      <div className="border rounded p-4 h-[400px] overflow-y-auto bg-white shadow-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 p-3 rounded max-w-[75%] whitespace-pre-line ${
              msg.sender === "user"
                ? "bg-blue-600 text-white ml-auto"
                : "bg-gray-200 text-black mr-auto"
            }`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-gray-200 text-black p-3 rounded">
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {errorMsg && (
        <p className="text-red-600 mt-4">{errorMsg}</p>
      )}

      {/* Input Area */}
      <div className="mt-4 flex">
        <input
          className="flex-1 border p-3 rounded-l"
          placeholder="Ask anything about your finances..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
}