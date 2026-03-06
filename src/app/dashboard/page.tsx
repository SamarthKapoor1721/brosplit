"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Group {
  id: string;
  name: string;
  description: string | null;
  members: {
    user: { id: string; name: string | null; email: string };
  }[];
  _count: { expenses: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchGroups();
    }
  }, [session]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      });
      if (res.ok) {
        setNewGroupName("");
        setNewGroupDesc("");
        setShowCreateModal(false);
        fetchGroups();
      }
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setCreating(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Groups</h1>
            <p className="text-muted mt-1">
              Manage your expense groups and settle up
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 cursor-pointer"
          >
            + New Group
          </button>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🫂</div>
            <h2 className="text-xl font-semibold mb-2">No groups yet</h2>
            <p className="text-muted mb-6">
              Create your first group and start splitting expenses!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all cursor-pointer"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-card-hover transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    👥
                  </div>
                  <span className="text-xs text-muted bg-background px-2 py-1 rounded-full">
                    {group._count.expenses} expenses
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-muted text-sm mb-3">{group.description}</p>
                )}
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 4).map((m) => (
                      <div
                        key={m.user.id}
                        className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-xs font-medium text-primary"
                        title={m.user.name || m.user.email}
                      >
                        {(m.user.name || m.user.email)[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted ml-2">
                    {group.members.length} member
                    {group.members.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-6">Create New Group</h2>
              <form onSubmit={createGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                    placeholder="e.g., Goa Trip 2026"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                    placeholder="What's this group for?"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-muted hover:text-foreground hover:border-primary/50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? "Creating..." : "Create Group"}
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
