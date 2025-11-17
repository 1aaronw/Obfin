import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase/firebase";

export default function AIAdvisor() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // chat messages
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const bottomRef = useRef(null);

  // Smooth auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    setErrorMsg("");
    setLoading(true);

    const userMessage = input.trim();
    setInput("");

    // 1) Add user message bubble
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage },
    ]);

    try {
      const user = auth.currentUser;
      if (!user) {
        setErrorMsg("You must be logged in to use the advisor.");
        setLoading(false);
        return;
      }

      const uid = user.uid;

      const res = await fetch("http://localhost:5001/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, uid }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Something went wrong");
      }

      const data = await res.json();
      const fullText = data.response || "";

      // 2) Add empty AI bubble that we'll "type" into
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "" },
      ]);

      // 3) Fake streaming: gradually reveal the text
      const CHUNK_SIZE = 6;   // characters per step
      const INTERVAL_MS = 25; // delay between steps

      let index = 0;

      const intervalId = setInterval(() => {
        index += CHUNK_SIZE;
        const slice = fullText.slice(0, index);

        setMessages((prev) => {
          const updated = [...prev];
          // last message is the AI one we just added
          updated[updated.length - 1] = {
            sender: "ai",
            text: slice,
          };
          return updated;
        });

        if (index >= fullText.length) {
          clearInterval(intervalId);
          setLoading(false);
        }
      }, INTERVAL_MS);
    } catch (err) {
      console.error(err);
      setErrorMsg("Connection failed or backend error.");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Financial Advisor</h1>

      {/* Chat window */}
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

      {/* Input */}
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