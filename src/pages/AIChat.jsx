import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context";
import { chatWithData } from "../utils/geminiAPI";

const SUGGESTIONS = [
  "What is my biggest source of emissions?",
  "How do I compare to competitors?",
  "What's the quickest win to reduce my footprint?",
  "What regulations apply to my company?",
  "How much could I save by going renewable?",
];

export function AIChat() {
  const { emissions, company } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasData = (emissions.totalTonnes || 0) > 0;

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const reply = await chatWithData(newMessages, emissions, company);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError(
        "We couldn't reach Gemini. Please check your API key and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (text) => {
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-3">
        {!hasData && (
          <div className="max-w-md bg-slate-800/60 backdrop-blur-md rounded-2xl border border-white/10 p-4 text-xs md:text-sm text-slate-300 mb-2">
            For best answers, first calculate a baseline on the dashboard. You
            can still ask generic questions in the meantime.
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestion(s)}
              className="text-[11px] md:text-xs px-3 py-1 rounded-full bg-slate-800/40 border border-white/10 text-slate-300 hover:border-accentLime hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-slate-900/40 backdrop-blur-lg rounded-2xl border border-white/10 p-3 md:p-4 space-y-3 shadow-lg">
          {messages.length === 0 && (
            <div className="text-xs md:text-sm text-slate-400 text-center mt-2">
              Ask CarbonIQ anything about your carbon footprint, regulations,
              or reduction opportunities. Every answer is grounded in your
              emissions profile.
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => (
              <motion.div
                key={`${m.role}-${idx}-${m.content.slice(0, 8)}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs md:text-sm ${
                    m.role === "user"
                      ? "bg-accentLime text-primaryDark font-medium rounded-br-sm shadow-md"
                      : "bg-slate-800/60 text-white rounded-bl-sm border border-white/10 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="h-6 w-10 rounded-full bg-slate-800/60 border border-white/10 flex items-center justify-center">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                </span>
              </div>
              CarbonIQ is thinking…
            </div>
          )}
          {error && (
            <div className="text-[11px] text-danger bg-danger/5 border border-danger/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 bg-slate-900/60 backdrop-blur-md px-3 md:px-6 py-3"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask CarbonIQ anything about your footprint…"
            className="flex-1 rounded-full border border-white/10 px-3 md:px-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-accentLime bg-slate-800/50 text-white placeholder-slate-400 backdrop-blur-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-gradient inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full text-lg disabled:opacity-50 p-0"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}

export default AIChat;

