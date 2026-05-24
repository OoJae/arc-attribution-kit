"use client";

// CCTP v2 sweep panel: burn USDC on Polygon Amoy, mint into the
// AttributionEscrow contract on Arc. Useful for builders who collect fees on
// Polygon (e.g. Polymarket) and aggregate them onto Arc for distribution.
//
// The mint recipient is forced server-side to the escrow contract address so
// any swept USDC immediately backs future creditFees calls.

import { useState } from "react";
import { toast } from "sonner";

interface SweepEvent {
  stage: "burn-pending" | "burn-confirmed" | "attestation-fetched" | "mint-confirmed";
  burnTxHash?: string;
  mintTxHash?: string;
  attestationStatus?: string;
  note?: string;
}

interface DoneEvent {
  mock: boolean;
  result: {
    burnTxHash: string;
    mintTxHash: string;
    attestationStatus: string;
    amountUsdc: string;
  } | null;
}

const STAGE_LABEL: Record<SweepEvent["stage"], string> = {
  "burn-pending": "Burning USDC on Polygon Amoy",
  "burn-confirmed": "Burn confirmed",
  "attestation-fetched": "Iris attestation received",
  "mint-confirmed": "Minted into escrow on Arc testnet",
};

export function SweepPanel() {
  const [running, setRunning] = useState(false);
  const [amount, setAmount] = useState("0.1");
  const [apiKey, setApiKey] = useState("");
  const [events, setEvents] = useState<SweepEvent[]>([]);
  const [done, setDone] = useState<DoneEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setRunning(true);
    setEvents([]);
    setDone(null);
    setError(null);
    try {
      const res = await fetch("/api/sweep", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-operator-key": apiKey,
        },
        body: JSON.stringify({ amountUsdc: amount }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text();
        setError(`Sweep failed (${res.status}): ${body.slice(0, 200)}`);
        setRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done: rdone } = await reader.read();
        if (rdone) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const evMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!evMatch || !dataMatch) continue;
          const evType = evMatch[1];
          const payload = JSON.parse(dataMatch[1]);
          if (evType === "progress") {
            setEvents((p) => [...p, payload as SweepEvent]);
          } else if (evType === "done") {
            const d = payload as DoneEvent;
            setDone(d);
            if (d.result) {
              toast.success(
                `Swept ${d.result.amountUsdc} USDC to Arc${d.mock ? " (mock)" : ""}`,
              );
            }
          } else if (evType === "error") {
            const msg = (payload as { error: string }).error;
            setError(msg);
            toast.error(msg);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <h3 style={{ marginTop: 0 }}>CCTP sweep Polygon Amoy → Arc</h3>
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Mints directly into the escrow contract so swept USDC backs future credits.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={running}
          inputMode="decimal"
          style={{
            padding: "8px 10px",
            border: "1px solid #ccc",
            borderRadius: 4,
            width: 100,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          placeholder="Operator API key"
          disabled={running}
          style={{
            padding: "8px 10px",
            border: "1px solid #ccc",
            borderRadius: 4,
            flex: 1,
            minWidth: 180,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
        <button
          type="button"
          onClick={start}
          disabled={running || Number(amount) < 0.1}
          style={{
            padding: "8px 16px",
            background: running ? "#ddd" : "#0e0e0c",
            color: running ? "#666" : "#fff",
            border: "none",
            borderRadius: 4,
            cursor: running ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {running ? "Sweeping..." : "Sweep to Arc"}
        </button>
      </div>
      {error && (
        <p style={{ color: "#b23a2a", fontSize: 13, margin: "10px 0" }}>{error}</p>
      )}
      {(events.length > 0 || done) && (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {events.map((ev, idx) => (
            <li
              key={`${ev.stage}-${idx}`}
              style={{
                display: "flex",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid #eee",
                fontSize: 13,
              }}
            >
              <span style={{ opacity: 0.5 }}>0{idx + 1}</span>
              <span style={{ flex: 1 }}>{STAGE_LABEL[ev.stage]}</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                {(ev.burnTxHash || ev.mintTxHash)?.slice(0, 10)}
                {(ev.burnTxHash || ev.mintTxHash) ? "..." : null}
                {ev.attestationStatus && !ev.mintTxHash ? ev.attestationStatus : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      {done?.result && (
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
          Swept {done.result.amountUsdc} USDC{done.mock ? " (mock)" : ""}.
        </p>
      )}
    </div>
  );
}
