"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string;
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

export default function GroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "members">("expenses");

  // Add Expense State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);

  // Add Member State
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
      const data = await res.json();
      setGroup(data);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/balances`);
      const data = await res.json();
      setBalances(data);
    } catch (err) {
      console.error("Failed to fetch balances", err);
    }
  }, [groupId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && groupId) {
      fetchGroup();
      fetchBalances();
    }
  }, [session, groupId, fetchGroup, fetchBalances]);

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
        setExpensePaidBy(session?.user?.id || "");
        setSelectedMembers([]);
        setShowAddExpense(false);
        fetchGroup();
        fetchBalances();
      }
    } catch (err) {
      console.error("Failed to add expense", err);
    } finally {
      setAddingExpense(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      fetchGroup();
      fetchBalances();
    } catch (err) {
      console.error("Failed to delete expense", err);
    }
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
      if (!res.ok) {
        setMemberError(data.error);
      } else {
        setMemberEmail("");
        setShowAddMember(false);
        fetchGroup();
      }
    } catch {
      setMemberError("Something went wrong");
    } finally {
      setAddingMember(false);
    }
  };

  const openAddExpenseModal = () => {
    if (group) {
      setSelectedMembers(group.members.map((m) => m.user.id));
    }
    setExpensePaidBy(session?.user?.id || "");
    setShowAddExpense(true);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (!group) return null;

  const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back + Header */}
        <Link
          href="/dashboard"
          className="text-muted hover:text-foreground text-sm mb-4 inline-flex items-center gap-1 transition-colors"
        >
          ← Back to Groups
        </Link>

        <div className="flex items-start justify-between mb-6 mt-2">
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            {group.description && (
              <p className="text-muted mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted">
              <span>{group.members.length} members</span>
              <span>•</span>
              <span>{group.expenses.length} expenses</span>
              <span>•</span>
              <span>Total: ₹{totalExpenses.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={openAddExpenseModal}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 cursor-pointer"
          >
            + Add Expense
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6">
          {(["expenses", "balances", "members"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize cursor-pointer ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div className="space-y-3">
            {group.expenses.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                <p className="text-muted mb-4">
                  Add your first expense to start splitting!
                </p>
                <button
                  onClick={openAddExpenseModal}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all cursor-pointer"
                >
                  Add First Expense
                </button>
              </div>
            ) : (
              group.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 rounded-xl bg-card border border-border hover:border-border/80 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg">
                        💸
                      </div>
                      <div>
                        <h4 className="font-medium">{expense.description}</h4>
                        <p className="text-muted text-xs">
                          Paid by{" "}
                          <span className="text-foreground">
                            {expense.paidBy.id === session?.user?.id
                              ? "You"
                              : expense.paidBy.name || expense.paidBy.email}
                          </span>{" "}
                          • Split among{" "}
                          {expense.splits.length === group.members.length
                            ? "everyone"
                            : expense.splits
                                .map((s) =>
                                  s.user.id === session?.user?.id
                                    ? "You"
                                    : s.user.name || s.user.email
                                )
                                .join(", ")}
                          {" "}({expense.splits.length}{" "}
                          {expense.splits.length === 1 ? "person" : "people"})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          ₹{expense.amount.toFixed(2)}
                        </p>
                        <p className="text-muted text-xs">
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      {(expense.paidBy.id === session?.user?.id) && (
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="text-muted hover:text-danger transition-colors text-sm cursor-pointer"
                          title="Delete expense"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === "balances" && (
          <div className="space-y-3">
            {balances.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2">All settled up!</h3>
                <p className="text-muted">
                  No outstanding balances. Everyone&apos;s even!
                </p>
              </div>
            ) : (
              <>
                <p className="text-muted text-sm mb-4">
                  Simplified settlements — the minimum number of payments needed:
                </p>
                {balances.map((balance, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-card border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center text-sm font-medium text-danger">
                        {balance.fromName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          <span className={balance.from === session?.user?.id ? "text-primary" : ""}>
                            {balance.from === session?.user?.id ? "You" : balance.fromName}
                          </span>
                          {" → "}
                          <span className={balance.to === session?.user?.id ? "text-primary" : ""}>
                            {balance.to === session?.user?.id ? "You" : balance.toName}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-lg text-warning">
                      ₹{balance.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <p className="text-muted text-sm">
                {group.members.length} member{group.members.length !== 1 ? "s" : ""} in this group
              </p>
              <button
                onClick={() => setShowAddMember(true)}
                className="px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-all cursor-pointer"
              >
                + Invite Member
              </button>
            </div>
            {group.members.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl bg-card border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                      {member.user.id === session?.user?.id && (
                        <span className="text-primary text-xs ml-2">(You)</span>
                      )}
                    </p>
                    <p className="text-muted text-xs">{member.user.email}</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    member.role === "admin"
                      ? "bg-warning/10 text-warning"
                      : "bg-background text-muted"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-6">Add Expense</h2>
              <form onSubmit={addExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                    placeholder="e.g., Dinner at Pizza Place"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Paid by *
                  </label>
                  <div className="relative">
                    <select
                      value={expensePaidBy}
                      onChange={(e) => setExpensePaidBy(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all appearance-none cursor-pointer"
                      required
                    >
                      {group.members.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.name || member.user.email}
                          {member.user.id === session?.user?.id ? " (You)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      ▾
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-muted">
                      Split among
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMembers(group.members.map((m) => m.user.id))}
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-muted text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMembers([])}
                        className="text-xs text-muted hover:text-foreground hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                    {group.members.map((member) => (
                      <label
                        key={member.user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedMembers.includes(member.user.id)
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-background border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.user.id)}
                          onChange={() => toggleMemberSelection(member.user.id)}
                          className="w-4 h-4 rounded border-border accent-primary"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary">
                            {(member.user.name || member.user.email)[0].toUpperCase()}
                          </div>
                          <span className="text-sm">
                            {member.user.name || member.user.email}
                            {member.user.id === session?.user?.id && (
                              <span className="text-primary text-xs ml-1">(You)</span>
                            )}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted">
                      {selectedMembers.length} of {group.members.length} selected
                    </p>
                    {expenseAmount && selectedMembers.length > 0 && (
                      <p className="text-xs text-accent font-medium">
                        ₹{(parseFloat(expenseAmount) / selectedMembers.length).toFixed(2)} per person
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-muted hover:text-foreground hover:border-primary/50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingExpense || selectedMembers.length === 0}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {addingExpense ? "Adding..." : "Add Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-2">Invite Member</h2>
              <p className="text-muted text-sm mb-6">
                Add someone by their email. If they don&apos;t have an account yet,
                they&apos;ll be able to sign up and see the group.
              </p>

              {memberError && (
                <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                  {memberError}
                </div>
              )}

              <form onSubmit={addMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                    placeholder="friend@example.com"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(false);
                      setMemberError("");
                    }}
                    className="flex-1 py-2.5 rounded-lg border border-border text-muted hover:text-foreground hover:border-primary/50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="flex-1 py-2.5 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {addingMember ? "Inviting..." : "Invite"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
