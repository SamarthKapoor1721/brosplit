"use client";

import { useMemo, useState } from "react";
import UpiQrCode from "@/components/upi/UpiQrCode";
import { buildUpiUri, formatINR, isMobileDevice } from "@/lib/upi";
import { CheckIcon } from "@/components/Icons";

export interface PayRecipient {
  id: string;
  name: string;
  upiId: string | null;
  upiDisplayName: string | null;
}

/**
 * Bottom-sheet payment flow:
 *  mobile  → "Pay via UPI app" launches the upi:// intent
 *  desktop → QR + copyable UPI ID
 * After the user returns, asks for confirmation and records the settlement.
 */
export default function PaySheet({
  recipient,
  amount,
  note = "BroSplit Settlement",
  onConfirmPaid,
  onClose,
  busy,
}: {
  recipient: PayRecipient;
  amount: number;
  note?: string;
  onConfirmPaid: () => Promise<void> | void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [stage, setStage] = useState<"pay" | "confirm">("pay");
  const [copied, setCopied] = useState<"upi" | "link" | null>(null);

  const hasUpi = !!recipient.upiId;
  const mobile = useMemo(() => isMobileDevice(), []);
  const upiUri = hasUpi
    ? buildUpiUri({
        upiId: recipient.upiId!,
        displayName: recipient.upiDisplayName || recipient.name,
        amount,
        note,
      })
    : null;

  const copy = async (text: string, which: "upi" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable (http / old browser) — fall through silently
    }
  };

  const launchUpi = () => {
    if (!upiUri) return;
    window.location.href = upiUri;
    // When they come back to the tab, ask whether the payment went through.
    setStage("confirm");
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-3xl w-full max-w-md float-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Pay ${recipient.name}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-brand-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-success-soft text-success flex items-center justify-center font-semibold shrink-0">
                {recipient.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted">Paying</p>
                <p className="font-semibold truncate">{recipient.name}</p>
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums shrink-0">{formatINR(amount)}</p>
          </div>
        </div>

        {!hasUpi ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-2">🙈</div>
            <p className="font-medium">No UPI ID yet</p>
            <p className="text-muted text-sm mt-1">
              {recipient.name} hasn&apos;t configured a UPI ID. Nudge them to add one in
              their profile — or settle in cash and mark it paid.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-all"
              >
                Close
              </button>
              <button
                onClick={() => setStage("confirm")}
                className="flex-1 py-3 rounded-xl bg-card-hover border border-border font-medium hover:border-primary/40 transition-all"
              >
                Settled offline
              </button>
            </div>
            {stage === "confirm" && (
              <ConfirmBlock
                busy={busy}
                onYes={onConfirmPaid}
                onNo={() => setStage("pay")}
              />
            )}
          </div>
        ) : stage === "pay" ? (
          <div className="p-5 space-y-4">
            {/* Recipient UPI details */}
            <div className="rounded-2xl bg-background-elevated border border-border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted">UPI ID</p>
                <p className="font-mono text-sm truncate">{recipient.upiId}</p>
              </div>
              <button
                onClick={() => copy(recipient.upiId!, "upi")}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-strong hover:text-foreground transition-colors"
              >
                {copied === "upi" ? "Copied ✓" : "Copy"}
              </button>
            </div>

            {mobile ? (
              <>
                <button
                  onClick={launchUpi}
                  className="w-full py-3.5 rounded-2xl bg-gradient-brand text-white font-semibold text-lg shadow-lg shadow-primary/30 active:scale-[0.99] transition-all"
                >
                  Pay {formatINR(amount)}
                </button>
                <p className="text-xs text-muted text-center">
                  Opens GPay, PhonePe, Paytm or BHIM with the amount prefilled.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3 py-2">
                  <UpiQrCode value={upiUri!} size={200} />
                  <p className="text-xs text-muted text-center max-w-[260px]">
                    Scan with any UPI app — recipient, amount, and note are baked in.
                  </p>
                </div>
                <button
                  onClick={() => copy(upiUri!, "link")}
                  className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-strong hover:text-foreground hover:border-primary/40 transition-all"
                >
                  {copied === "link" ? "Payment link copied ✓" : "Copy payment link"}
                </button>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setStage("confirm")}
                className="flex-1 py-3 rounded-xl bg-success-soft border border-success/30 text-success font-medium hover:bg-success/15 transition-all"
              >
                I&apos;ve paid
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="font-semibold text-center">Have you completed the payment?</p>
            <p className="text-muted text-sm text-center mt-1">
              We&apos;ll record {formatINR(amount)} to {recipient.name} and update the
              group balances.
            </p>
            <ConfirmBlock busy={busy} onYes={onConfirmPaid} onNo={() => setStage("pay")} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmBlock({
  busy,
  onYes,
  onNo,
}: {
  busy?: boolean;
  onYes: () => Promise<void> | void;
  onNo: () => void;
}) {
  return (
    <div className="flex gap-3 mt-5">
      <button
        onClick={onNo}
        disabled={busy}
        className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-all disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={onYes}
        disabled={busy}
        className="flex-1 py-3 rounded-xl bg-gradient-success text-background font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CheckIcon size={18} />
        {busy ? "Saving…" : "Yes, mark as paid"}
      </button>
    </div>
  );
}
