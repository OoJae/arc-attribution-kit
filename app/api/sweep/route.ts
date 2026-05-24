// CCTP v2 sweep: burn USDC on Polygon Amoy, mint directly into the
// AttributionEscrow contract on Arc. Streams progress as Server-Sent Events.
//
// Gated by the same OPERATOR_API_KEY as /api/credit. In mock mode
// (CCTP_ENABLED != "1") returns a fake 4-event sequence so the UI flow can be
// demoed without burning testnet USDC.

import { NextRequest } from "next/server";
import { z } from "zod";
import type { Address } from "viem";
import {
  cctpEnabled,
  sweepUsdcToArc,
  sweepUsdcToArcMock,
  type SweepProgress,
  type SweepResult,
} from "@/lib/circle/cctp";
import { getPublicEscrowAddress } from "@/lib/chain/escrow";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  amountUsdc: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .refine((v) => Number(v) >= 0.1, { message: "Minimum sweep is 0.1 USDC" }),
});

function sseEncode(event: string, payload: unknown): Uint8Array {
  const data = JSON.stringify(payload, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  return new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`);
}

export async function POST(req: NextRequest) {
  const operatorKey = process.env.OPERATOR_API_KEY;
  const presented = req.headers.get("x-operator-key");
  if (!operatorKey || !presented || presented !== operatorKey) {
    return new Response(
      JSON.stringify({ error: "Invalid operator API key" }),
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues.map((i) => i.message).join("; ") }),
      { status: 400 },
    );
  }

  const mock = !cctpEnabled();
  const escrowAddress = getPublicEscrowAddress();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sseEncode("init", { mock, amountUsdc: parsed.data.amountUsdc }));
      try {
        const gen = mock
          ? sweepUsdcToArcMock({ amountUsdc: parsed.data.amountUsdc })
          : sweepUsdcToArc({
              amountUsdc: parsed.data.amountUsdc,
              recipientArc: (escrowAddress ?? undefined) as Address | undefined,
            });
        let result: SweepResult | null = null;
        while (true) {
          const next = await gen.next();
          if (next.done) {
            result = next.value;
            break;
          }
          controller.enqueue(sseEncode("progress", next.value as SweepProgress));
        }
        controller.enqueue(sseEncode("done", { mock, result }));
      } catch (err) {
        controller.enqueue(
          sseEncode("error", {
            error: err instanceof Error ? err.message : "Sweep failed",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
