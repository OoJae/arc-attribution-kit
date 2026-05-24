import Link from "next/link";
import { CreditForm } from "@/components/credit-form";
import { SweepPanel } from "@/components/sweep-panel";
import { getPublicEscrowAddress } from "@/lib/chain/escrow";

export default async function AdminPage() {
  const escrowAddress = getPublicEscrowAddress();

  return (
    <main>
      <p style={{ fontSize: 12, marginBottom: 4 }}>
        <Link href="/" style={{ color: "#0e0e0c" }}>
          ← Home
        </Link>
      </p>
      <h1>/admin</h1>
      <p style={{ opacity: 0.75, maxWidth: 640, lineHeight: 1.6 }}>
        Register subjects and credit fees. Calls run from the operator EOA
        (contract owner). Gated by the OPERATOR_API_KEY env var so this page
        can be public-facing.
      </p>

      {escrowAddress ? (
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          AttributionEscrow:{" "}
          <a
            href={`https://testnet.arcscan.app/address/${escrowAddress}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {escrowAddress}
          </a>
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#b23a2a" }}>
          ATTRIBUTION_ESCROW_ADDRESS not set. Run <code>npm run compile && npm run deploy</code>.
        </p>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>Credit fees</h2>
        <CreditForm />
      </section>

      <section style={{ marginTop: 40 }}>
        <SweepPanel />
      </section>
    </main>
  );
}
