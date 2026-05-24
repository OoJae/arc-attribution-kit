// Returns the encoded calldata + destination address the client should pass
// into the bundler's sendUserOperation call. The actual claim() userOp is
// signed by the creator's passkey on the client; this route exists so the
// client doesn't need to import the escrow ABI directly.

import { encodeClaimCalldata, isEscrowDeployed } from "@/lib/chain/escrow";

export const runtime = "nodejs";

export async function GET() {
  if (!isEscrowDeployed()) {
    return Response.json(
      { ok: false, error: "ATTRIBUTION_ESCROW_ADDRESS not set" },
      { status: 500 },
    );
  }
  try {
    const calldata = encodeClaimCalldata();
    return Response.json({ ok: true, ...calldata });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "encode failed" },
      { status: 500 },
    );
  }
}
