"use client";

// Passkey enrollment via Circle Modular Wallets. Lifted from arc-p2p-payments.
//
// The kit deliberately has no database. To keep the demo self-contained, the
// resulting credential blob + derived smart account address are persisted to
// localStorage and the user is redirected to /dashboard. A real production
// integration would POST these to a backend keyed off the user's session.

import { useState } from "react";
import { createPublicClient } from "viem";
import { toWebAuthnAccount } from "viem/account-abstraction";
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
} from "@circle-fin/modular-wallets-core";
import { arcTestnet } from "@/lib/chain/arc";

export const KIT_STORAGE_KEYS = {
  credential: "arc-attribution-kit:credential",
  walletAddress: "arc-attribution-kit:walletAddress",
  username: "arc-attribution-kit:username",
} as const;

interface Props {
  // Stable per-user identifier for Circle's WebAuthn flow. Generate with
  // crypto.randomUUID() and persist it so the same passkey is reusable.
  username: string;
}

export function PasskeySetup({ username }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;

  async function enroll() {
    if (typeof window === "undefined" || !clientKey || !clientUrl) {
      setError("Circle credentials missing. See .env.example.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
      const credential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: WebAuthnMode.Register,
        username,
      });

      const modularTransport = toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: modularTransport,
      });
      const webAuthnAccount = toWebAuthnAccount({ credential });
      const circleAccount = await toCircleSmartAccount({
        client: publicClient,
        owner: webAuthnAccount,
      });

      // Persist to localStorage so /dashboard can read the smart account
      // address + credential without a backend.
      window.localStorage.setItem(
        KIT_STORAGE_KEYS.credential,
        JSON.stringify(credential),
      );
      window.localStorage.setItem(
        KIT_STORAGE_KEYS.walletAddress,
        circleAccount.address.toLowerCase(),
      );
      window.localStorage.setItem(KIT_STORAGE_KEYS.username, username);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey enrollment failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 460,
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 6,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Set up your wallet</h2>
      <p style={{ opacity: 0.75, lineHeight: 1.5 }}>
        This kit uses a Circle Modular Smart Account secured by a passkey. Authenticate
        with Face ID or your fingerprint. No seed phrase. The wallet lives on Arc
        testnet and the contract sends accrued USDC straight to it when you claim.
      </p>
      {error && (
        <p style={{ color: "#b23a2a", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
      <button
        type="button"
        onClick={enroll}
        disabled={creating}
        style={{
          marginTop: 12,
          padding: "10px 20px",
          background: creating ? "#ddd" : "#0e0e0c",
          color: creating ? "#666" : "#fff",
          border: "none",
          borderRadius: 4,
          cursor: creating ? "not-allowed" : "pointer",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {creating ? "Setting up passkey..." : "Create wallet with passkey"}
      </button>
    </div>
  );
}
