// Public read endpoint. Returns the on-chain accrued balance for an address.
// The contract's `accrued(address)` getter is public so this is just a
// convenience wrapper; the client could equally call the contract directly
// if you expose NEXT_PUBLIC_ARC_RPC_URL.

import { NextRequest } from "next/server";
import type { Address } from "viem";
import { isEscrowDeployed, readAccruedBalance } from "@/lib/chain/escrow";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isEscrowDeployed()) {
    return Response.json(
      { ok: false, error: "ATTRIBUTION_ESCROW_ADDRESS not set" },
      { status: 500 },
    );
  }
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({ ok: false, error: "invalid address" }, { status: 400 });
  }
  try {
    const accruedUsdc = await readAccruedBalance(address as Address);
    return Response.json({ ok: true, accruedUsdc });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "read failed" },
      { status: 500 },
    );
  }
}
