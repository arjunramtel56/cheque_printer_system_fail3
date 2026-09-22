// @ts-nocheck
"use client";

import { useChat } from "ai/react";
import { Send, Bot, User } from "lucide-react";

export function ChequeAssistant() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/agent",
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your Cheque Assistant. I can help you create cheque drafts, convert amounts to words, list recent cheques, and more. How can I help you today?",
        },
      ],
    });

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex h-[600px] flex-col rounded-lg border bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                m.role === "assistant"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <Bot size={14} />
              ) : (
                <User size={14} />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.content}
              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {m.toolCalls.map((tc) => (
                    <div key={tc.id} className="text-xs opacity-70">
                      <span className="font-mono">{tc.name}</span>(...args)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot size={14} className="animate-pulse" />
            </div>
            <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">Assistant is thinking</span>
                <span className="animate-pulse">.</span>
                <span className="animate-pulse delay-75">.</span>
                <span className="animate-pulse delay-150">.</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error.message || "An error occurred. Please try again."}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about cheques, amounts, or templates..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary focus-within:ring-2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
