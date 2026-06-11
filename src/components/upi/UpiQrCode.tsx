"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a QR code for any string (typically a upi:// URI).
 * Generated client-side as a data URL — no uploads, always in sync
 * with recipient, amount, and note.
 */
export default function UpiQrCode({
  value,
  size = 208,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x for retina sharpness
      margin: 2,
      color: { dark: "#0f0f17", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-card border border-border text-muted text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        Couldn&apos;t generate QR
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`rounded-2xl bg-card border border-border shimmer ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="UPI payment QR code"
      width={size}
      height={size}
      className={`rounded-2xl bg-white p-1 ${className}`}
    />
  );
}
