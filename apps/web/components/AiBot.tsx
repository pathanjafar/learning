"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Markdown from "./Markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I am Reborn AI, your learning companion. Ask me any conceptual questions, debugging help, or ask for a hint on your current topic!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorDetails(null);
    const newMessages: Message[] = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Collect webpage context info dynamically
    let pageContext: any = null;
    try {
      if (pathname.startsWith("/problems/")) {
        const title = document.querySelector("h1")?.textContent || "";
        const statement = document.querySelector(".prose-reborn")?.textContent || "";
        const editorInfo = (window as any).__rebornEditor;
        pageContext = {
          type: "problem",
          title,
          statement: statement.substring(0, 4000), // safe limit for context
          code: editorInfo?.code || "",
          language: editorInfo?.language || "",
        };
      } else if (pathname.startsWith("/lessons/")) {
        const title = document.querySelector("h1")?.textContent || "";
        const content = document.querySelector(".prose-reborn")?.textContent || "";
        pageContext = {
          type: "lesson",
          title,
          content: content.substring(0, 8000),
        };
      }
    } catch (e) {
      console.warn("Could not read page context", e);
    }

    try {
      const res = await fetch("/backend/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          context: pageContext
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If API key is missing, explain to user
        if (data.error && data.error.includes("GEMINI_API_KEY")) {
          setErrorDetails(data.details || "API key is not configured.");
        } else {
          setErrorDetails(data.details || data.error || "An error occurred.");
        }
        setIsLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setErrorDetails("Could not connect to the backend server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const predefinedPrompts = [
    "Explain Binary Search",
    "Explain recursion vs iteration",
    "How to analyze Time Complexity?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Window */}
      {isOpen && (
        <div className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-panel/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-semibold text-white tracking-wide">Reborn AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white"
                      : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            ))}

            {/* Error State Banner */}
            {errorDetails && (
              <div className="bg-red-950/50 border border-red-900 rounded-xl p-3 text-xs text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1 text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  Setup Required
                </div>
                <p>{errorDetails}</p>
                <p className="mt-2 text-red-300 font-medium">
                  To fix: open your root <code className="bg-red-900/50 px-1 py-0.5 rounded text-white text-[10px]">.env</code> file, set <code className="bg-red-900/50 px-1 py-0.5 rounded text-white text-[10px]">GEMINI_API_KEY=your_key</code>, and restart your server.
                </p>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start items-center gap-2">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Prompt suggestions chips */}
          {messages.length === 1 && !isLoading && !errorDetails && (
            <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-900/40 border-t border-slate-800/50">
              {predefinedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/60 transition-all active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-accent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-accent hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-accent text-white p-2 rounded-xl transition-all active:scale-95"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Pulsing Neon floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-accent to-indigo-500 rounded-full shadow-lg shadow-accent/40 flex items-center justify-center text-white hover:scale-105 hover:rotate-6 transition-all duration-300 cursor-pointer border border-white/10 active:scale-95"
        aria-label="AI assistant"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
