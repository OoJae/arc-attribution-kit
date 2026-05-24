// Circle Modular Wallets bundler client preconfigured for Arc testnet.
//
// Reuses the Arc minimum-priority-fee handler from the arc-p2p-payments sample
// so userOps don't get rejected for underpriced gas. Wrap any "send userOp"
// flow on Arc through this so fee policy lives in one place.

import { createPublicClient, parseGwei } from "viem";
import {
  createBundlerClient,
  type SmartAccount,
} from "viem/account-abstraction";
import { toModularTransport } from "@circle-fin/modular-wallets-core";
import { arcTestnet } from "@/lib/chain/arc";

export function getArcModularTransport() {
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
  if (!clientUrl || !clientKey) {
    throw new Error(
      "Circle Modular Wallets env vars missing (NEXT_PUBLIC_CIRCLE_CLIENT_URL / KEY).",
    );
  }
  return toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
}

export function createArcBundlerClient(account: SmartAccount) {
  const transport = getArcModularTransport();
  const publicClient = createPublicClient({ chain: arcTestnet, transport });
  return createBundlerClient({
    account,
    chain: arcTestnet,
    transport,
    userOperation: {
      async estimateFeesPerGas({ bundlerClient }) {
        const MIN_PRIORITY_FEE = parseGwei("1");
        const fees = await bundlerClient
          .request({ method: "pimlico_getUserOperationGasPrice" as never })
          .catch(() => null);
        if (fees) {
          const fast = (
            fees as { fast: { maxFeePerGas: string; maxPriorityFeePerGas: string } }
          ).fast;
          const maxPriority = BigInt(fast.maxPriorityFeePerGas);
          return {
            maxFeePerGas: BigInt(fast.maxFeePerGas),
            maxPriorityFeePerGas:
              maxPriority < MIN_PRIORITY_FEE ? MIN_PRIORITY_FEE : maxPriority,
          };
        }
        const block = await publicClient.getBlock();
        const baseFee = block.baseFeePerGas ?? parseGwei("48");
        return {
          maxFeePerGas: baseFee * 2n + MIN_PRIORITY_FEE,
          maxPriorityFeePerGas: MIN_PRIORITY_FEE,
        };
      },
    },
  });
}
