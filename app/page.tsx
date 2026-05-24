import Link from "next/link";

export default function Landing() {
  return (
    <main>
      <header style={{ borderBottom: "1px solid #ddd", paddingBottom: 16, marginBottom: 24 }}>
        <p
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            opacity: 0.55,
            margin: 0,
          }}
        >
          ARC OPEN SOURCE SHOWCASE
        </p>
        <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "8px 0 0" }}>
          Arc Attribution Kit
        </h1>
        <p style={{ fontSize: 18, opacity: 0.8, marginTop: 8, maxWidth: 640 }}>
          Operator credits creators on Arc. Creators claim with zero gas.
        </p>
      </header>

      <section style={{ marginBottom: 32 }}>
        <p style={{ lineHeight: 1.6, maxWidth: 680 }}>
          A starter kit for Arc builders. Ship a contract pattern where an Operator
          credits many Creators against arbitrary subject IDs, and Creators withdraw
          their accrued USDC with a paymaster-sponsored passkey-signed userOp. The
          same primitive powers Polymarket builder codes, referral splits, content
          royalties, and marketplace revenue shares.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card
          href="/admin"
          title="/admin"
          body="Operator UI. Register a subject + creator, credit fees. Optional CCTP sweep from Polygon Amoy → Arc."
        />
        <Card
          href="/dashboard"
          title="/dashboard"
          body="Creator UI. Enroll passkey, view accrued balance, claim USDC via paymaster-sponsored userOp."
        />
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 24 }}>
        <h2 style={{ fontSize: 22 }}>What it gives Arc builders</h2>
        <ul style={{ lineHeight: 1.7, maxWidth: 720 }}>
          <li>
            <code>AttributionEscrow.sol</code> with configurable platform fee bps.
          </li>
          <li>viem read/write helpers + a node-only solc compile + deploy script.</li>
          <li>
            CCTP v2 sweep generator (Polygon Amoy → Arc), mints directly into the escrow contract.
          </li>
          <li>Modular Wallets passkey enrollment, lifted from arc-p2p-payments.</li>
          <li>Circle Paymaster v0.8 sponsorship on the claim userOp so creators pay zero gas.</li>
        </ul>
        <p style={{ marginTop: 24, fontSize: 13, opacity: 0.7 }}>
          Compared to{" "}
          <a href="https://github.com/circlefin/arc-p2p-payments" target="_blank" rel="noreferrer">
            arc-p2p-payments
          </a>{" "}
          (P2P transfers) and{" "}
          <a href="https://github.com/circlefin/arc-commerce" target="_blank" rel="noreferrer">
            arc-commerce
          </a>{" "}
          (checkout), this kit handles post-checkout multi-recipient on-chain attribution
          with paymaster-sponsored claims.
        </p>
        <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
          Live in production at{" "}
          <a href="https://babel-markets.vercel.app" target="_blank" rel="noreferrer">
            Babel Markets
          </a>{" "}
          — wires Polymarket builder-code fills into the same primitive.
        </p>
      </section>
    </main>
  );
}

function Card({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 6,
        background: "#fff",
        color: "#0e0e0c",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          color: "#b23a2a",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.5 }}>{body}</p>
    </Link>
  );
}
