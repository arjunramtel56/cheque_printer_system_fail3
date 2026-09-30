"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Send, Bot, User, RotateCcw, ShieldCheck } from "lucide-react";

/**
 * Cheque Assistant chat (User and Trial panels).
 *
 * Talks to the deterministic /api/assistant endpoint (no LLM). The component
 * keeps a client-side conversation list for context display only — the API is
 * stateless and answers each question independently, so history can never leak
 * server-side state. Errors always render a visible message with a Retry
 * action; the UI never silently fails.
 */

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
  suggestions?: string[];
}

interface ApiSuccess {
  answer: string;
  source: string;
  suggestions: string[] | null;
}
interface ApiError {
  error: string;
}

const SOURCE_LABELS: Record<string, { en: string; ne: string }> = {
  PRODUCT: { en: "Reactify system feature", ne: "रियाक्टिफाई सिस्टम सुविधा" },
  PRACTICE: {
    en: "General cheque practice (as implemented by this system)",
    ne: "सामान्य चेक अभ्यास (यो सिस्टमले लागू गरेको)",
  },
  NRB: { en: "Nepal Rastra Bank publication", ne: "नेपाल राष्ट्र बैंक प्रकाशन" },
  SYSTEM: { en: "Assistant notice", ne: "सहायक सूचना" },
};

const WELCOME: Record<"en" | "ne", string> = {
  en: "Hello! I'm the Cheque Printing Assistant. I can help with printing cheques in this system, alignment and calibration, bank templates, and payments and subscriptions. What would you like to know?",
  ne: "नमस्ते! म चेक प्रिन्टिङ सहायक हुँ। यो सिस्टममा चेक प्रिन्ट, मिलान र क्यालिब्रेशन, बैंक टेम्पलेट, र भुक्तानी/सदस्यताबारे मद्दत गर्न सक्छु। के जान्न चाहनुहुन्छ?",
};

const SUGGESTED: Record<"en" | "ne", string[]> = {
  en: [
    "How do I print a cheque?",
    "Why is my cheque alignment incorrect?",
    "What should I check before printing?",
    "What printing method does the system support?",
    "How does payment verification work?",
  ],
  ne: [
    "चेक कसरी प्रिन्ट गर्ने?",
    "चेकको मिलान किन गलत छ?",
    "प्रिन्ट गर्नुअघि के जाँच्नुपर्छ?",
    "सिस्टमले कुन प्रिन्टिङ विधि समर्थन गर्छ?",
    "भुक्तानी प्रमाणीकरण कसरी हुन्छ?",
  ],
};

let nextId = 1;
const genId = () => `m${nextId++}`;

export function ChequeAssistant() {
  const locale = useLocale() as "en" | "ne";
  const [messages, setMessages] = useState<ChatEntry[]>([
    { id: "welcome", role: "assistant", text: WELCOME[locale] },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setLastQuestion(trimmed);
    setInput("");
    setMessages((m) => [...m, { id: genId(), role: "user", text: trimmed }]);
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, locale }),
      });

      const data = (await res.json().catch(() => null)) as (ApiSuccess & ApiError) | null;

      if (!res.ok) {
        const msg =
          data?.error ??
          (locale === "ne"
            ? "सहायक उपलब्ध छैन। कृपया फेरि प्रयास गर्नुहोस्।"
            : "The assistant is unavailable right now. Please try again.");
        setError(msg);
        return;
      }

      if (!data?.answer) {
        setError(
          locale === "ne"
            ? "सहायकले खाली जवाफ फर्कायो। कृपया फेरि प्रयास गर्नुहोस्।"
            : "The assistant returned an empty response. Please try again."
        );
        return;
      }

      setMessages((m) => [
        ...m,
        {
          id: genId(),
          role: "assistant",
          text: data.answer,
          source: data.source,
          suggestions: data.suggestions ?? undefined,
        },
      ]);
      scrollToBottom();
    } catch {
      setError(
        locale === "ne"
          ? "सञ्जालमा समस्या भयो। कृपया आफ्नो इन्टरनेट जाँची फेरि प्रयास गर्नुहोस्।"
          : "Network problem — please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }

  function retry() {
    if (lastQuestion) ask(lastQuestion);
  }

  function reset() {
    setMessages([{ id: genId(), role: "assistant", text: WELCOME[locale] }]);
    setError(null);
    setLastQuestion(null);
  }

  const suggestions = SUGGESTED[locale];

  return (
    <div className="flex h-[600px] flex-col rounded-lg border bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-line ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {m.text}
              {m.role === "assistant" && m.source && SOURCE_LABELS[m.source] && (
                <div className="mt-2 flex items-center gap-1 border-t border-border/50 pt-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck size={11} />
                  {SOURCE_LABELS[m.source][locale]}
                </div>
              )}
              {m.role === "assistant" && m.suggestions && m.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot size={14} className="animate-pulse" />
            </div>
            <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">
                  {locale === "ne" ? "सहायक सोच्दै" : "Assistant is thinking"}
                </span>
                <span className="animate-pulse">.</span>
                <span className="animate-pulse [animation-delay:75ms]">.</span>
                <span className="animate-pulse [animation-delay:150ms]">.</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p>{error}</p>
            {lastQuestion && (
              <button
                type="button"
                onClick={retry}
                disabled={isLoading}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs hover:bg-destructive/10 disabled:opacity-50"
              >
                <RotateCcw size={12} />
                {locale === "ne" ? "फेरि प्रयास" : "Retry"}
              </button>
            )}
          </div>
        )}
      </div>

      {messages.length <= 1 && !isLoading && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t p-4"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              locale === "ne"
                ? "चेक, रकम वा टेम्पलेटबारे सोध्नुहोस्…"
                : "Ask about cheques, printing, or payments…"
            }
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary focus-within:ring-2"
            disabled={isLoading}
            maxLength={1000}
            aria-label={locale === "ne" ? "प्रश्न" : "Question"}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label={locale === "ne" ? "पठाउनुहोस्" : "Send"}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={reset}
              disabled={isLoading}
              title={locale === "ne" ? "कुराकानी खाली गर्नुहोस्" : "Clear conversation"}
              aria-label={locale === "ne" ? "कुराकानी खाली गर्नुहोस्" : "Clear conversation"}
              className="inline-flex items-center justify-center rounded-md border border-input px-3 text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
