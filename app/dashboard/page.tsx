import Link from "next/link";
import { DashboardClient } from "./client";
import { getPublicEscrowAddress } from "@/lib/chain/escrow";

export default function DashboardPage() {
  const escrowAddress = getPublicEscrowAddress();
  return (
    <main>
      <p style={{ fontSize: 12, marginBottom: 4 }}>
        <Link href="/" style={{ color: "#0e0e0c" }}>
          ← Home
        </Link>
      </p>
      <h1>/dashboard</h1>
      <p style={{ opacity: 0.75, maxWidth: 640, lineHeight: 1.6 }}>
        Enroll a passkey wallet and claim your accrued USDC. Each claim is a
        paymaster-sponsored userOp via Circle Paymaster v0.8 — you pay zero gas.
      </p>
      <DashboardClient escrowAddress={escrowAddress} />
    </main>
  );
}
