"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export default function InvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${groupId}/invite`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setGroup(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [groupId]);

  // If already logged in, go straight to the group
  useEffect(() => {
    if (status === "authenticated" && group) {
      router.push(`/groups/${groupId}`);
    }
  }, [status, group, groupId, router]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading invitation...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Group not found</h1>
          <p className="text-muted mb-6">
            This invite link may be invalid or the group may have been deleted.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all"
          >
            Go to BROSPLIT
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Invite Card */}
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-muted text-sm mb-1">You&apos;ve been invited to join</p>
          <h1 className="text-3xl font-bold text-primary mb-2">{group?.name}</h1>
          {group?.description && (
            <p className="text-muted text-sm mb-4">{group.description}</p>
          )}
          <p className="text-muted text-xs mb-8">
            {group?.memberCount} member{group?.memberCount !== 1 ? "s" : ""} already in this group
          </p>

          <div className="space-y-3">
            <Link
              href={`/register?redirect=/groups/${groupId}`}
              className="block w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all text-center"
            >
              Create Account to Join
            </Link>
            <Link
              href={`/login?redirect=/groups/${groupId}`}
              className="block w-full py-3 rounded-xl border border-border text-muted hover:text-foreground hover:border-primary/50 transition-all text-center"
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            BROSPLIT
          </Link>{" "}
          — Split expenses with friends 💸
        </p>
      </div>
    </div>
  );
}
