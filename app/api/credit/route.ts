// Operator endpoint. Gated by OPERATOR_API_KEY so this can be public-facing
// (e.g. on a hackathon demo URL) without random callers crediting themselves.
//
// Flow:
//  1. Validate the request body + API key.
//  2. If the subject is not yet registered on-chain, call registerSubject.
//  3. Call creditFees(subjectId, amount). The contract's platformFeeBps applies
//     on top, splitting the credit between the creator and the operator.

import { NextRequest } from "next/server";
import { z } from "zod";
import type { Address } from "viem";
import {
  creditFees,
  isEscrowDeployed,
  readSubjectCreator,
  registerSubject,
} from "@/lib/chain/escrow";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  subjectId: z.string().min(1).max(200),
  creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid creator address"),
  amountUsdc: z.string().regex(/^\d+(\.\d+)?$/, "invalid amount"),
});

export async function POST(req: NextRequest) {
  const operatorKey = process.env.OPERATOR_API_KEY;
  const presented = req.headers.get("x-operator-key");
  if (!operatorKey || !presented || presented !== operatorKey) {
    return Response.json(
      { ok: false, error: "Invalid operator API key" },
      { status: 401 },
    );
  }
  if (!isEscrowDeployed()) {
    return Response.json(
      { ok: false, error: "ATTRIBUTION_ESCROW_ADDRESS not set" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  try {
    // Idempotent registration: only fire if not already registered with this creator.
    let registerTx: string | null = null;
    const existing = await readSubjectCreator(parsed.data.subjectId);
    if (!existing) {
      registerTx = await registerSubject({
        subjectId: parsed.data.subjectId,
        creator: parsed.data.creator as Address,
      });
    } else if (existing.toLowerCase() !== parsed.data.creator.toLowerCase()) {
      return Response.json(
        {
          ok: false,
          error: `subject "${parsed.data.subjectId}" is already registered to ${existing}`,
        },
        { status: 409 },
      );
    }

    const creditTx = await creditFees({
      subjectId: parsed.data.subjectId,
      amountUsdc: parsed.data.amountUsdc,
    });

    return Response.json({
      ok: true,
      registerTx,
      creditTx,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "credit failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
