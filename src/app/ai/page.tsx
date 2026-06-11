"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { MicIcon, SendIcon, SparkleIcon, CheckIcon } from "@/components/Icons";
import { useVoice } from "@/lib/useVoice";

interface MemberLite { id: string; name: string | null; email: string }
interface Suggestion {
  groupId: string | null;
  groupName: string | null;
  payer: MemberLite | null;
  splitAmong: MemberLite[];
  members: MemberLite[];
}
interface Parsed {
  amount: number | null;
  description: string;
  participants: string[];
  splitType: "equal" | "owes" | "paid";
  payerName: string | null;
  ower: string | null;
  category: { category: string; emoji: string; label: string };
  rawText: string;
  confidence: number;
}

type Msg =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "ai";
      text?: string;
      preview?: { parsed: Parsed; suggestion: Suggestion };
      saved?: boolean;
    };

const PROMPTS = [
  "Add 500 dinner with Rahul split equally",
  "Aman owes me 200 for movies",
  "I paid 1200 for groceries split with Priya and Aman",
  "Uber 350 to airport split with Priya",
];

export default function AIPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "ai",
      text:
        "Yo. Tell me about an expense in plain English and I'll log it for you. Try: \"Add 500 dinner with Rahul split equally\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { supported, listening, transcript, start, stop } = useVoice({
    lang: "en-IN",
    onResult: (text) => setInput(text),
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || busy) return;
      setInput("");
      setBusy(true);

      const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
      setMessages((m) => [...m, userMsg]);

      try {
        const res = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: "ai", text: data.error || "Couldn't parse that." },
          ]);
          return;
        }

        const aiMsg: Msg = {
          id: crypto.randomUUID(),
          role: "ai",
          preview: { parsed: data.parsed, suggestion: data.suggestion },
        };
        setMessages((m) => [...m, aiMsg]);
      } catch {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "ai", text: "Network hiccup. Try again." },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [input, busy]
  );

  const onMicTap = () => {
    if (!supported) {
      alert("Voice input isn't supported in this browser. Try Chrome on desktop or mobile.");
      return;
    }
    if (listening) stop();
    else start();
  };

  // Auto-stop listening helper: when user stops talking and we have a transcript, send.
  useEffect(() => {
    if (!listening && transcript) {
      const t = transcript;
      // brief delay so user can edit if desired
      setInput(t);
    }
  }, [listening, transcript]);

  const onConfirm = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.role !== "ai" || !msg.preview) return;
    const { parsed, suggestion } = msg.preview;
    if (!suggestion.groupId) return;
    if (!parsed.amount || parsed.amount <= 0) return;

    const splitAmongIds = suggestion.splitAmong.length
      ? suggestion.splitAmong.map((m) => m.id)
      : [];
    if (splitAmongIds.length === 0) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${suggestion.groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: parsed.description,
          amount: parsed.amount,
          paidById: suggestion.payer?.id,
          splitAmong: splitAmongIds,
        }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.role === "ai" ? { ...m, saved: true } : m
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: `Logged. ₹${(parsed.amount ?? 0).toFixed(2)} for "${parsed.description}" in ${suggestion.groupName}. 🤝`,
          },
        ]);
      } else {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: err.error || "Couldn't save that one.",
          },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return null;

  return (
    <div className="min-h-screen safe-bottom flex flex-col">
      <AppHeader title="AI Bro" subtitle="Type or speak — I'll handle the math" />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4 space-y-3">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} onConfirm={() => onConfirm(m.id)} busy={busy} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-muted text-sm pl-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "120ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "240ms" }} />
              <span className="ml-1">Parsing…</span>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-muted-strong hover:text-foreground hover:border-primary/40 transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="sticky bottom-2">
          <div className="rounded-2xl bg-card border border-border p-2 flex items-end gap-2 shadow-2xl shadow-black/40">
            <button
              onClick={onMicTap}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                listening
                  ? "bg-danger text-white pulse-ring"
                  : "bg-gradient-brand text-white shadow-lg shadow-primary/30"
              }`}
              aria-label={listening ? "Stop recording" : "Start voice input"}
              type="button"
            >
              <MicIcon size={20} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={listening ? "Listening…" : "e.g. Add 500 dinner with Rahul"}
              rows={1}
              className="flex-1 bg-transparent resize-none px-2 py-2.5 focus:outline-none placeholder:text-muted/60 text-sm"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || busy}
              className="w-11 h-11 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
              aria-label="Send"
              type="button"
            >
              <SendIcon size={18} />
            </button>
          </div>
          {!supported && (
            <p className="text-xs text-muted text-center mt-2">
              Voice input needs a Chromium browser. Typing works everywhere.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Bubble({
  msg,
  onConfirm,
  busy,
}: {
  msg: Msg;
  onConfirm: () => void;
  busy: boolean;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-brand text-white px-4 py-2.5 text-sm shadow-lg shadow-primary/20">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.preview) {
    const { parsed, suggestion } = msg.preview;
    const splitCount = suggestion.splitAmong.length;
    const perPerson =
      parsed.amount && splitCount > 0 ? parsed.amount / splitCount : null;
    const lowConfidence = parsed.confidence < 0.6 || !parsed.amount;

    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[92%] w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <SparkleIcon size={14} />
            </div>
            <span className="text-xs text-muted">AI bro</span>
          </div>
          <div className="rounded-2xl rounded-tl-md bg-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-gradient-brand-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-strong">
                  Parsed expense
                </span>
                {parsed.confidence > 0 && (
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-background-elevated border border-border text-muted-strong">
                    {Math.round(parsed.confidence * 100)}% confident
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-12 h-12 rounded-2xl bg-background-elevated border border-border flex items-center justify-center text-2xl">
                  {parsed.category.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{parsed.description}</p>
                  <p className="text-xs text-muted">{parsed.category.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums">
                    {parsed.amount
                      ? `₹${parsed.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <Row label="Group">
                {suggestion.groupName ? (
                  <span className="font-medium">{suggestion.groupName}</span>
                ) : (
                  <span className="text-warning">No group matched</span>
                )}
              </Row>
              <Row label="Paid by">
                {suggestion.payer ? (
                  <span className="font-medium">
                    {suggestion.payer.name || suggestion.payer.email}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Row>
              <Row label="Split among">
                {splitCount === 0 ? (
                  <span className="text-warning">Pick at least one person</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
                    {suggestion.splitAmong.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 rounded-full bg-primary-soft text-primary text-xs font-medium border border-primary/20"
                      >
                        {(p.name || p.email).split(/[\s@]/)[0]}
                      </span>
                    ))}
                  </div>
                )}
              </Row>
              {perPerson && (
                <Row label="Per person">
                  <span className="font-medium tabular-nums text-accent">
                    ₹{perPerson.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </Row>
              )}
            </div>
            {msg.saved ? (
              <div className="px-4 py-3 border-t border-border bg-success-soft text-success text-sm font-medium flex items-center gap-2">
                <CheckIcon size={18} /> Saved to {suggestion.groupName}
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {lowConfidence ? "Double-check before saving." : "Looks good?"}
                </p>
                <button
                  disabled={
                    busy || !parsed.amount || !suggestion.groupId || splitCount === 0
                  }
                  onClick={onConfirm}
                  className="px-4 py-2 rounded-xl bg-gradient-brand text-white text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-40"
                >
                  Confirm & save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start fade-up">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <SparkleIcon size={14} />
          </div>
          <span className="text-xs text-muted">AI bro</span>
        </div>
        <div className="rounded-2xl rounded-tl-md bg-card border border-border px-4 py-2.5 text-sm">
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted text-xs uppercase tracking-wider">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
