import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase/firebase";

export default function AIAdvisor() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // chat messages
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const recommendedPrompts = [
    "What did I spend most on this month?",
    "Am I overspending in Food?",
    "Summarize my last 30 days spending",
    "What was my income last year?",
    "How can I save more money?",
  ];

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
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);

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
      setMessages((prev) => [...prev, { sender: "ai", text: "" }]);

      // 3) Fake streaming: gradually reveal the text
      const CHUNK_SIZE = 6; // characters per step
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
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-3xl font-bold">AI Financial Advisor</h1>

      {/* Chat window */}
      <div className="h-[400px] overflow-y-auto rounded border bg-white p-4 shadow-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 max-w-[75%] whitespace-pre-line rounded p-3 ${
              msg.sender === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-gray-200 text-black"
            }`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="mr-auto rounded bg-gray-200 p-3 text-black">
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {errorMsg && <p className="mt-4 text-red-600">{errorMsg}</p>}

      {/* Recommended Prompts */}
      <div className="mt-4">
        <h3 className="mb-2 font-semibold">Try asking:</h3>
        <div className="flex flex-wrap gap-2">
          {recommendedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(p);
              }}
              className="rounded bg-gray-200 px-3 py-1 text-black hover:bg-gray-300"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="mt-4 flex">
        <input
          className="flex-1 rounded-l border p-3"
          placeholder="Ask anything about your finances..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-r bg-blue-600 px-4 py-2 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}
