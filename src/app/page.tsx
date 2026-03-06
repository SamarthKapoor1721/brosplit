import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B$</span>
            </div>
            <span className="text-xl font-bold">
              BRO<span className="text-primary">SPLIT</span>
            </span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm rounded-lg border border-border text-muted hover:text-foreground hover:border-primary/50 transition-all"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover transition-all"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-24 sm:py-32 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            💸 Stop the awkward money talks
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
            Split expenses
            <br />
            <span className="text-primary">like a bro.</span>
          </h1>
          <p className="text-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Create groups, add expenses, and let BROSPLIT figure out who owes
            what. No more spreadsheets, no more arguments. Just vibes.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all text-lg shadow-lg shadow-primary/25"
            >
              Get Started — It&apos;s Free
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-24">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">
              👥
            </div>
            <h3 className="text-lg font-semibold mb-2">Create Groups</h3>
            <p className="text-muted text-sm">
              Roommates, trips, dinners — create a group for any occasion and
              invite friends by email.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl mb-4">
              💰
            </div>
            <h3 className="text-lg font-semibold mb-2">Track Expenses</h3>
            <p className="text-muted text-sm">
              Add expenses and they get automatically split among group members.
              Fair and square.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-2xl mb-4">
              ✅
            </div>
            <h3 className="text-lg font-semibold mb-2">Settle Up</h3>
            <p className="text-muted text-sm">
              Smart debt simplification shows the minimum number of payments
              needed to settle all balances.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-muted text-sm">
        <p>© 2026 BROSPLIT. Built for bros, by bros. 🤝</p>
      </footer>
    </div>
  );
}
