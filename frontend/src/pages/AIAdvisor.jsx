import { useState } from "react";
import { auth } from "../firebase/firebase";

export default function AIAdvisor() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const sendMessage = async () => {
  setLoading(true);
  setErrorMsg("");
  setResponse("");

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
      body: JSON.stringify({ message, uid }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErrorMsg(data.error || "Something went wrong");
    } else {
      setResponse(data.response);
    }
  } catch (err) {
    setErrorMsg("Backend connection failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Financial Advisor</h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask anything about your finances..."
        className="w-full p-3 border rounded mb-4"
        rows={4}
      />

      <button
        onClick={sendMessage}
        disabled={loading}
        className="bg-blue-600 text-white py-2 px-4 rounded"
      >
        {loading ? "Thinking..." : "Ask Advisor"}
      </button>

      {errorMsg && <p className="text-red-600 mt-4">{errorMsg}</p>}

      {response && (
        <div className="mt-6 p-4 bg-gray-100 border rounded whitespace-pre-line">
          {response}
        </div>
      )}
    </div>
  );
}