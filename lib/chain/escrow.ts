// AttributionEscrow read/write helpers. Wraps the contract deployed at
// ATTRIBUTION_ESCROW_ADDRESS on Arc testnet.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  keccak256,
  toHex,
  encodeFunctionData,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/chain/arc";

export const ESCROW_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "platformFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "function",
    name: "accrued",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "subjectCreator",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "registerSubject",
    stateMutability: "nonpayable",
    inputs: [
      { type: "bytes32", name: "subjectId" },
      { type: "address", name: "creator" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "creditFees",
    stateMutability: "nonpayable",
    inputs: [
      { type: "bytes32", name: "subjectId" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "payoutBatch",
    stateMutability: "nonpayable",
    inputs: [{ type: "address[]", name: "creators" }],
    outputs: [],
  },
] as const;

function getEscrowAddress(): Address | null {
  const addr = process.env.ATTRIBUTION_ESCROW_ADDRESS;
  if (!addr || !addr.startsWith("0x") || addr.length !== 42) return null;
  return addr as Address;
}

export function isEscrowDeployed(): boolean {
  return getEscrowAddress() !== null;
}

function getPublicClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network"),
  });
}

function getOwnerWallet() {
  const key = process.env.OPERATOR_PRIVATE_KEY;
  if (!key || !key.startsWith("0x")) {
    throw new Error("OPERATOR_PRIVATE_KEY missing or invalid");
  }
  const account = privateKeyToAccount(key as Hex);
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network"),
  });
}

// Hash any string subject id into bytes32 so callers can use human-readable
// identifiers like "referral-abc123" or "fill-0xabcd...".
export function subjectIdToBytes32(subjectId: string): Hex {
  return keccak256(toHex(subjectId));
}

export async function registerSubject(params: {
  subjectId: string;
  creator: Address;
}): Promise<Hex> {
  const address = getEscrowAddress();
  if (!address) throw new Error("ATTRIBUTION_ESCROW_ADDRESS not set");
  const wallet = getOwnerWallet();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "registerSubject",
    args: [subjectIdToBytes32(params.subjectId), params.creator],
  });
}

export async function creditFees(params: {
  subjectId: string;
  amountUsdc: string;
}): Promise<Hex> {
  const address = getEscrowAddress();
  if (!address) throw new Error("ATTRIBUTION_ESCROW_ADDRESS not set");
  const wallet = getOwnerWallet();
  const amount = parseUnits(params.amountUsdc, 6);
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "creditFees",
    args: [subjectIdToBytes32(params.subjectId), amount],
  });
}

export async function payoutBatch(creators: Address[]): Promise<Hex> {
  const address = getEscrowAddress();
  if (!address) throw new Error("ATTRIBUTION_ESCROW_ADDRESS not set");
  const wallet = getOwnerWallet();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "payoutBatch",
    args: [creators],
  });
}

export async function readAccruedBalance(creator: Address): Promise<string> {
  const address = getEscrowAddress();
  if (!address) return "0";
  const client = getPublicClient();
  const raw = (await client.readContract({
    address,
    abi: ESCROW_ABI,
    functionName: "accrued",
    args: [creator],
  })) as bigint;
  return formatUnits(raw, 6);
}

export async function readSubjectCreator(subjectId: string): Promise<Address | null> {
  const address = getEscrowAddress();
  if (!address) return null;
  const client = getPublicClient();
  const creator = (await client.readContract({
    address,
    abi: ESCROW_ABI,
    functionName: "subjectCreator",
    args: [subjectIdToBytes32(subjectId)],
  })) as Address;
  if (creator === "0x0000000000000000000000000000000000000000") return null;
  return creator;
}

// Encoded `claim()` calldata for sendUserOperation. The Modular Wallet bundler
// wants `data: Hex`, not an ABI + functionName, so we encode here.
export function encodeClaimCalldata(): { to: Address; data: Hex } {
  const address = getEscrowAddress();
  if (!address) throw new Error("ATTRIBUTION_ESCROW_ADDRESS not set");
  return {
    to: address,
    data: encodeFunctionData({ abi: ESCROW_ABI, functionName: "claim", args: [] }),
  };
}

export function getPublicEscrowAddress(): Address | null {
  return getEscrowAddress();
}
