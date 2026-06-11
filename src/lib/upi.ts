/**
 * UPI utilities — validation and deep-link generation.
 * Shared by profile settings, the pay sheet, and API validation.
 */

/**
 * UPI VPA format: <username>@<provider>
 * Username: alphanumeric with . _ - (2–256 chars before @).
 * Provider: alphabetic handle like ybl, oksbi, paytm.
 */
export const UPI_ID_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidUpiId(value: string): boolean {
  return UPI_ID_REGEX.test(value.trim());
}

export interface UpiPaymentParams {
  upiId: string;
  displayName?: string | null;
  amount: number;
  note?: string;
}

/**
 * Builds a `upi://pay` deep link. All params are URL-encoded.
 * Amount is fixed to 2 decimals as required by most UPI apps.
 */
export function buildUpiUri({ upiId, displayName, amount, note }: UpiPaymentParams): string {
  const params = new URLSearchParams();
  params.set("pa", upiId.trim());
  if (displayName?.trim()) params.set("pn", displayName.trim());
  params.set("am", amount.toFixed(2));
  params.set("cu", "INR");
  params.set("tn", note?.trim() || "BroSplit Settlement");
  return `upi://pay?${params.toString()}`;
}

/** Coarse mobile detection for choosing deep-link vs QR flow. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
