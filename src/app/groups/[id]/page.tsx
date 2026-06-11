"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import {
  PlusIcon,
  MicIcon,
  SparkleIcon,
  TrashIcon,
  UsersIcon,
  CheckIcon,
} from "@/components/Icons";
import { useVoice } from "@/lib/useVoice";
import { categorize } from "@/lib/categories";
import PaySheet, { PayRecipient } from "@/components/upi/PaySheet";
import { useToast } from "@/components/Toast";

interface User {
  id: string;
  name: string | null;
  email: string;
  upiId?: string | null;
  upiDisplayName?: string | null;
}
interface ExpenseSplit {
  id: string;
  amount: number;
  user: User;
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  paidBy: User;
  splits: ExpenseSplit[];
}
interface GroupMember {
  id: string;
  role: string;
  user: User;
}
interface Group {
  id: string;
  name: string;
  description: string | null;
  members: GroupMember[];
  expenses: Expense[];
}
interface Balance {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

interface Settlement {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  payer: User;
  receiver: User;
}

export default function GroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "members">("expenses");
  const { toast, showToast } = useToast();

  // Pay flow
  const [payTarget, setPayTarget] = useState<{ recipient: PayRecipient; amount: number } | null>(null);
  const [settling, setSettling] = useState(false);

  // Add Expense
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState("");

  const { supported: voiceSupported, listening, start, stop } = useVoice({
    lang: "en-IN",
    onResult: (t) => setAiText(t),
  });

  // Add Member
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      setGroup(await res.json());
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/balances`);
      setBalances(await res.json());
    } catch {}
  }, [groupId]);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`);
      if (res.ok) setSettlements(await res.json());
    } catch {}
  }, [groupId]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session && groupId) {
      fetchGroup();
      fetchBalances();
      fetchSettlements();
    }
  }, [session, groupId, fetchGroup, fetchBalances, fetchSettlements]);

  const confirmSettlement = async () => {
    if (!payTarget) return;
    setSettling(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: payTarget.recipient.id,
          amount: payTarget.amount,
          note: "BroSplit Settlement",
        }),
      });
      if (res.ok) {
        setPayTarget(null);
        showToast(`Marked ₹${payTarget.amount.toFixed(2)} as paid`);
        fetchBalances();
        fetchSettlements();
      } else {
        const data = await res.json();
        showToast(data.error || "Couldn't record settlement", "error");
      }
    } catch {
      showToast("Network error — try again", "error");
    } finally {
      setSettling(false);
    }
  };

  const openAddExpenseModal = () => {
    if (group) setSelectedMembers(group.members.map((m) => m.user.id));
    setExpensePaidBy(session?.user?.id || "");
    setShowAddExpense(true);
    setAiText("");
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingExpense(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseDesc,
          amount: parseFloat(expenseAmount),
          paidById: expensePaidBy,
          splitAmong: selectedMembers,
        }),
      });
      if (res.ok) {
        setExpenseDesc("");
        setExpenseAmount("");
        setSelectedMembers([]);
        setShowAddExpense(false);
        setAiText("");
        fetchGroup();
        fetchBalances();
      }
    } finally {
      setAddingExpense(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    fetchGroup();
    fetchBalances();
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setMemberError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      });
      const data = await res.json();
      if (!res.ok) setMemberError(data.error);
      else {
        setMemberEmail("");
        setShowAddMember(false);
        fetchGroup();
      }
    } finally {
      setAddingMember(false);
    }
  };

  const runAISuggest = async () => {
    if (!aiText.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText, groupId }),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.parsed as {
          amount: number | null;
          description: string;
        };
        const s = data.suggestion as {
          payer: { id: string } | null;
          splitAmong: { id: string }[];
        };
        if (p.amount) setExpenseAmount(String(p.amount));
        if (p.description) setExpenseDesc(p.description);
        if (s.payer) setExpensePaidBy(s.payer.id);
        if (s.splitAmong.length > 0) setSelectedMembers(s.splitAmong.map((u) => u.id));
      }
    } finally {
      setAiBusy(false);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const deleteGroup = async () => {
    if (!confirm("Delete this group? All expenses will be lost.")) return;
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  }
  if (!group) return null;

  const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);
  const isAdmin = group.members.some(
    (m) => m.user.id === session?.user?.id && m.role === "admin"
  );

  // My net in this group
  let myNet = 0;
  for (const b of balances) {
    if (b.from === session?.user?.id) myNet -= b.amount;
    if (b.to === session?.user?.id) myNet += b.amount;
  }

  return (
    <div className="min-h-screen safe-bottom">
      <AppHeader
        title={group.name}
        subtitle={`${group.members.length} members · ${group.expenses.length} expenses`}
        back={{ href: "/dashboard" }}
        right={
          isAdmin ? (
            <button
              onClick={deleteGroup}
              className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-danger transition-colors"
              title="Delete group"
            >
              <TrashIcon size={16} />
            </button>
          ) : null
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Hero card */}
        <section className="rounded-3xl border border-border p-5 bg-gradient-brand-soft relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-strong">Your position</p>
              <p
                className={`text-3xl font-semibold tabular-nums mt-1 ${
                  myNet > 0.01 ? "text-success" : myNet < -0.01 ? "text-danger" : "text-foreground"
                }`}
              >
                {myNet >= 0 ? "+" : "−"}₹{Math.abs(myNet).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted mt-1">
                {myNet > 0.01
                  ? "You're owed in this group"
                  : myNet < -0.01
                  ? "You owe in this group"
                  : "Settled here"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted">Group total</p>
              <p className="text-base font-semibold tabular-nums mt-1">
                ₹{totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <button
            onClick={openAddExpenseModal}
            className="mt-4 w-full py-3 rounded-2xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            <PlusIcon size={18} /> Add expense
          </button>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-2xl p-1">
          {(["expenses", "balances", "members"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Expenses */}
        {activeTab === "expenses" && (
          <div className="space-y-2">
            {group.expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <div className="text-4xl mb-2">📝</div>
                <p className="font-medium">No expenses yet</p>
                <p className="text-muted text-sm mt-1">Add the first one to start splitting.</p>
                <button
                  onClick={openAddExpenseModal}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30"
                >
                  Add expense
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
                {group.expenses.map((e) => {
                  const cat = categorize(e.description);
                  const yourSplit = e.splits.find((s) => s.user.id === session?.user?.id);
                  const youPaid = e.paidBy.id === session?.user?.id;
                  const yourShare = yourSplit?.amount ?? 0;
                  // What this expense does to your balance:
                  //  - you paid  → you lent (others' share owed back to you)
                  //  - you owe   → you borrowed (your share)
                  //  - neither   → not involved
                  const involved = youPaid || !!yourSplit;
                  const lent = e.amount - yourShare; // amount others owe you
                  const date = new Date(e.date);
                  return (
                    <div
                      key={e.id}
                      className="group flex items-center gap-3 p-4 hover:bg-card-hover transition-colors"
                    >
                      {/* Stacked date */}
                      <div className="w-9 shrink-0 text-center leading-none">
                        <p className="text-[11px] uppercase tracking-wide text-muted">
                          {date.toLocaleDateString("en-IN", { month: "short" })}
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {date.toLocaleDateString("en-IN", { day: "numeric" })}
                        </p>
                      </div>

                      <div className="w-11 h-11 rounded-xl bg-background-elevated border border-border flex items-center justify-center text-lg shrink-0">
                        {cat.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.description}</p>
                        <p className="text-xs text-muted truncate">
                          {involved
                            ? `${youPaid ? "You" : e.paidBy.name || e.paidBy.email} paid ₹${e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "You were not involved"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {!involved ? (
                          <p className="text-xs text-muted">not involved</p>
                        ) : youPaid ? (
                          <>
                            <p className="text-[11px] text-success">you lent</p>
                            <p className="text-base font-semibold tabular-nums text-success">
                              ₹{lent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] text-danger">you borrowed</p>
                            <p className="text-base font-semibold tabular-nums text-danger">
                              ₹{yourShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </>
                        )}
                      </div>

                      {youPaid && (
                        <button
                          onClick={() => deleteExpense(e.id)}
                          className="ml-1 text-muted hover:text-danger shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Balances */}
        {activeTab === "balances" && (
          <div className="space-y-2">
            {balances.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium">All settled up</p>
                <p className="text-muted text-sm mt-1">Everyone&apos;s even. Nice work.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted px-1">
                  Simplified — fewest transfers to settle the group.
                </p>
                <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
                  {balances.map((b, i) => {
                    const youOwe = b.from === session?.user?.id;
                    const youReceive = b.to === session?.user?.id;
                    const receiver = group.members.find((m) => m.user.id === b.to)?.user;
                    return (
                      <div key={i} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-danger-soft text-danger flex items-center justify-center text-sm font-semibold">
                              {b.fromName[0].toUpperCase()}
                            </div>
                            <span className="text-muted">→</span>
                            <div className="w-9 h-9 rounded-full bg-success-soft text-success flex items-center justify-center text-sm font-semibold">
                              {b.toName[0].toUpperCase()}
                            </div>
                            <p className="text-sm truncate">
                              <span className={youOwe ? "text-danger font-medium" : ""}>
                                {youOwe ? "You" : b.fromName}
                              </span>
                              {" pay "}
                              <span className={youReceive ? "text-success font-medium" : ""}>
                                {youReceive ? "you" : b.toName}
                              </span>
                            </p>
                          </div>
                          <p
                            className={`font-semibold tabular-nums ${
                              youReceive ? "text-success" : youOwe ? "text-danger" : "text-foreground"
                            }`}
                          >
                            ₹{b.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        {youOwe && (
                          <div className="mt-3 pl-12">
                            {receiver?.upiId ? (
                              <button
                                onClick={() =>
                                  setPayTarget({
                                    recipient: {
                                      id: b.to,
                                      name: b.toName,
                                      upiId: receiver.upiId ?? null,
                                      upiDisplayName: receiver.upiDisplayName ?? null,
                                    },
                                    amount: b.amount,
                                  })
                                }
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-lg shadow-primary/30 active:scale-[0.99] transition-all"
                              >
                                Pay ₹{b.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} via UPI
                              </button>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <button
                                  disabled
                                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-card-hover border border-border text-muted text-sm font-medium cursor-not-allowed"
                                >
                                  Pay via UPI
                                </button>
                                <p className="text-xs text-muted">
                                  {b.toName} hasn&apos;t configured a UPI ID yet.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Settlement history */}
            {settlements.length > 0 && (
              <div className="pt-3">
                <p className="text-xs uppercase tracking-wider text-muted mb-2 px-1">
                  Settlement history
                </p>
                <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
                  {settlements.map((s) => {
                    const youPaid = s.payer.id === session?.user?.id;
                    const youGot = s.receiver.id === session?.user?.id;
                    return (
                      <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-success-soft text-success flex items-center justify-center shrink-0">
                            ✓
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm truncate">
                              <span className={youPaid ? "font-medium" : ""}>
                                {youPaid ? "You" : s.payer.name || s.payer.email}
                              </span>
                              {" paid "}
                              <span className={youGot ? "font-medium" : ""}>
                                {youGot ? "you" : s.receiver.name || s.receiver.email}
                              </span>
                            </p>
                            <p className="text-xs text-muted">
                              {new Date(s.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                              {s.note && s.note !== "BroSplit Settlement" ? ` · ${s.note}` : ""}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold tabular-nums text-success shrink-0">
                          ₹{s.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members */}
        {activeTab === "members" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-muted text-sm">
                {group.members.length} member{group.members.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium hover:bg-accent/15 transition-all"
              >
                <UsersIcon size={14} /> Invite
              </button>
            </div>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              {group.members.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-semibold">
                      {(m.user.name || m.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {m.user.name || m.user.email}
                        {m.user.id === session?.user?.id && (
                          <span className="text-primary text-xs ml-2">(You)</span>
                        )}
                      </p>
                      <p className="text-muted text-xs">{m.user.email}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      m.role === "admin"
                        ? "bg-warning-soft text-warning"
                        : "bg-background-elevated text-muted"
                    }`}
                  >
                    {m.role}
                  </span>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="mt-4 rounded-2xl border border-danger/20 bg-danger-soft p-4">
                <p className="text-sm font-semibold text-danger">Danger zone</p>
                <p className="text-xs text-muted mt-0.5 mb-3">
                  Permanently delete this group and all its expenses.
                </p>
                <button
                  onClick={deleteGroup}
                  className="w-full py-2.5 rounded-xl bg-danger text-white text-sm font-medium hover:opacity-90 transition-all"
                >
                  Delete group
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto float-in">
            <div className="p-6 pb-4 border-b border-border">
              <h2 className="text-lg font-semibold">Add expense</h2>
              <p className="text-muted text-sm">Type, talk, or fill in by hand.</p>
            </div>

            {/* AI / Voice composer */}
            <div className="px-6 pt-5">
              <div className="rounded-2xl bg-gradient-brand-soft border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <SparkleIcon size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Quick fill with AI
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!voiceSupported) {
                        alert("Voice input needs a Chromium browser.");
                        return;
                      }
                      listening ? stop() : start();
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      listening
                        ? "bg-danger text-white pulse-ring"
                        : "bg-gradient-brand text-white shadow-lg shadow-primary/30"
                    }`}
                    aria-label="Voice input"
                  >
                    <MicIcon size={18} />
                  </button>
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        runAISuggest();
                      }
                    }}
                    placeholder={listening ? "Listening…" : "e.g. 500 dinner with Rahul"}
                    rows={1}
                    className="flex-1 bg-background-elevated rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border resize-none"
                  />
                  <button
                    type="button"
                    onClick={runAISuggest}
                    disabled={!aiText.trim() || aiBusy}
                    className="px-3 h-10 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-30 shrink-0"
                  >
                    {aiBusy ? "…" : "Fill"}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={addExpense} className="p-6 pt-4 space-y-4">
              <Field label="Description">
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                  placeholder="e.g. Dinner at Pizza Place"
                  required
                />
              </Field>

              <Field label="Amount">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all tabular-nums text-lg font-medium"
                    placeholder="0.00"
                    required
                  />
                </div>
              </Field>

              <Field label="Paid by">
                <div className="relative">
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all appearance-none"
                    required
                  >
                    {group.members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name || m.user.email}
                        {m.user.id === session?.user?.id ? " (You)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">▾</div>
                </div>
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-muted-strong font-semibold">
                    Split among
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedMembers(group.members.map((m) => m.user.id))}
                      className="text-primary hover:underline"
                    >
                      All
                    </button>
                    <span className="text-muted">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMembers([])}
                      className="text-muted hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.members.map((m) => {
                    const checked = selectedMembers.includes(m.user.id);
                    return (
                      <button
                        key={m.user.id}
                        type="button"
                        onClick={() => toggleMemberSelection(m.user.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          checked
                            ? "bg-primary-soft border-primary/40"
                            : "bg-background-elevated border-border hover:border-border-strong"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            checked ? "bg-gradient-brand border-transparent text-white" : "border-border"
                          }`}
                        >
                          {checked && <CheckIcon size={14} />}
                        </span>
                        <span className="text-sm truncate">
                          {(m.user.name || m.user.email).split(/[\s@]/)[0]}
                          {m.user.id === session?.user?.id && (
                            <span className="text-primary text-[10px] ml-1">(you)</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-muted">
                    {selectedMembers.length} of {group.members.length}
                  </span>
                  {expenseAmount && selectedMembers.length > 0 && (
                    <span className="text-accent font-medium tabular-nums">
                      ₹{(parseFloat(expenseAmount) / selectedMembers.length).toFixed(2)} each
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingExpense || selectedMembers.length === 0}
                  className="flex-1 py-3 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {addingExpense ? "Adding…" : "Add expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Sheet */}
      {payTarget && (
        <PaySheet
          recipient={payTarget.recipient}
          amount={payTarget.amount}
          note={`BroSplit Settlement · ${group.name}`}
          onConfirmPaid={confirmSettlement}
          onClose={() => setPayTarget(null)}
          busy={settling}
        />
      )}
      {toast}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md float-in">
            <h2 className="text-lg font-semibold mb-1">Invite a friend</h2>
            <p className="text-muted text-sm mb-5">
              We&apos;ll email them a link to join this group.
            </p>
            {memberError && (
              <div className="mb-4 p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-sm">
                {memberError}
              </div>
            )}
            <form onSubmit={addMember} className="space-y-4">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
                placeholder="friend@example.com"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setMemberError("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="flex-1 py-3 rounded-xl bg-gradient-brand text-white font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {addingMember ? "Inviting…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-muted-strong font-semibold mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
