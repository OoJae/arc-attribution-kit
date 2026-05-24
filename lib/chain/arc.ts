// Arc testnet chain definition + viem public client.

import { createPublicClient, defineChain, http } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const ARC_CONTRACTS = {
  // USDC: native gas + ERC-20. 18 decimals as gas, 6 decimals as ERC-20.
  USDC: "0x3600000000000000000000000000000000000000",
  // Circle Paymaster v0.8 on Arc testnet. Sponsors gas for paymaster-signed userOps.
  PAYMASTER_V08: "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966",
} as const;

export const CCTP_DOMAINS = {
  POLYGON_AMOY: 7,
  ARC_TESTNET: 26,
} as const;

export function getArcPublicClient(rpcUrl?: string) {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl ?? process.env.ARC_RPC_URL),
  });
}
