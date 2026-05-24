"use client";

// Operator-side form. Inputs a subjectId + creator address + amount in USDC
// and POSTs to /api/credit. The server runs registerSubject if needed, then
// creditFees from the operator EOA (contract owner).

import { useState } from "react";
import { toast } from "sonner";

export function CreditForm() {
  const [busy, setBusy] = useState(false);
  const [subjectId, setSubjectId] = useState("referral-abc123");
  const [creator, setCreator] = useState("");
  const [amount, setAmount] = useState("0.5");
  const [apiKey, setApiKey] = useState("");
  const [lastTx, setLastTx] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLastTx(null);
    try {
      const res = await fetch("/api/credit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-operator-key": apiKey,
        },
        body: JSON.stringify({
          subjectId,
          creator,
          amountUsdc: amount,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Credit failed (${res.status})`);
      }
      setLastTx(json.creditTx);
      toast.success(`Credited ${amount} USDC against ${subjectId}`, {
        description: (json.creditTx as string).slice(0, 18) + "...",
        action: {
          label: "ArcScan",
          onClick: () =>
            window.open(`https://testnet.arcscan.app/tx/${json.creditTx}`, "_blank"),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Credit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 480,
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Subject ID</span>
        <input
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          style={inputStyle}
          placeholder="referral-abc123"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Creator address (0x...)</span>
        <input
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          required
          pattern="^0x[a-fA-F0-9]{40}$"
          style={inputStyle}
          placeholder="0x1234..."
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Amount (USDC)</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          inputMode="decimal"
          pattern="^\d+(\.\d+)?$"
          style={inputStyle}
          placeholder="0.5"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Operator API key</span>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          type="password"
          style={inputStyle}
          placeholder="from OPERATOR_API_KEY env"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        style={{
          marginTop: 8,
          padding: "10px 20px",
          background: busy ? "#ddd" : "#0e0e0c",
          color: busy ? "#666" : "#fff",
          border: "none",
          borderRadius: 4,
          cursor: busy ? "not-allowed" : "pointer",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {busy ? "Crediting..." : "Credit fees"}
      </button>
      {lastTx && (
        <p style={{ fontSize: 12, margin: 0 }}>
          Credit tx:{" "}
          <a
            href={`https://testnet.arcscan.app/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            {lastTx.slice(0, 10)}...
          </a>
        </p>
      )}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
};
