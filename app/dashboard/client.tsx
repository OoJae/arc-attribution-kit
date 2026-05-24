"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { PasskeySetup, KIT_STORAGE_KEYS } from "@/components/passkey-setup";
import { ClaimButton } from "@/components/claim-button";

interface Props {
  escrowAddress: Address | null;
}

export function DashboardClient({ escrowAddress }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [accrued, setAccrued] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setHydrated(true);
    const addr = window.localStorage.getItem(KIT_STORAGE_KEYS.walletAddress);
    const user = window.localStorage.getItem(KIT_STORAGE_KEYS.username);
    if (addr && addr.startsWith("0x")) setWalletAddress(addr as Address);
    if (user) setUsername(user);
  }, []);

  // Fetch accrued balance whenever we know the wallet address.
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/accrued?address=${walletAddress}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok) setAccrued(String(j.accruedUsdc ?? "0"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  if (!hydrated) return null;

  if (!walletAddress) {
    // Generate a stable per-browser username for the passkey enrollment.
    let pendingUsername =
      window.localStorage.getItem(KIT_STORAGE_KEYS.username) ?? "";
    if (!pendingUsername) {
      pendingUsername = `kit-${crypto.randomUUID()}`;
      window.localStorage.setItem(KIT_STORAGE_KEYS.username, pendingUsername);
    }
    return (
      <div style={{ marginTop: 24 }}>
        <PasskeySetup username={pendingUsername} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff",
          maxWidth: 580,
        }}
      >
        <p style={{ fontSize: 12, opacity: 0.55, margin: 0 }}>
          ARC TESTNET WALLET
        </p>
        <p
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            margin: "4px 0 16px",
            wordBreak: "break-all",
          }}
        >
          {walletAddress}
        </p>
        <p style={{ fontSize: 12, opacity: 0.55, margin: 0 }}>ACCRUED BALANCE</p>
        <p style={{ fontSize: 36, margin: "4px 0 16px", fontWeight: 700 }}>
          ${Number(accrued).toFixed(4)}
        </p>
        {loading && (
          <p style={{ fontSize: 12, opacity: 0.6, margin: "0 0 12px" }}>
            Reading from chain...
          </p>
        )}
        <ClaimButton
          escrowAddress={escrowAddress}
          accruedUsdc={accrued}
          username={username ?? ""}
          walletAddress={walletAddress}
        />
      </div>
      <p style={{ marginTop: 12, fontSize: 12 }}>
        <button
          onClick={() => {
            Object.values(KIT_STORAGE_KEYS).forEach((k) =>
              window.localStorage.removeItem(k),
            );
            window.location.reload();
          }}
          style={{
            background: "none",
            border: "none",
            color: "#b23a2a",
            cursor: "pointer",
            padding: 0,
            fontSize: 12,
            textDecoration: "underline",
          }}
        >
          Clear wallet from this browser
        </button>
      </p>
    </div>
  );
}
