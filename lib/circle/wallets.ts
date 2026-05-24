// Circle Modular Wallets helpers. Used by the passkey enrollment flow on the
// client (see components/passkey-setup.tsx). Server-side helpers live here
// too for any flow that needs to derive a smart account address from a stored
// credential.

import { createPublicClient } from "viem";
import {
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
} from "@circle-fin/modular-wallets-core";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { arcTestnet } from "@/lib/chain/arc";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function getCirclePasskeyTransport() {
  return toPasskeyTransport(
    requireEnv("NEXT_PUBLIC_CIRCLE_CLIENT_URL"),
    requireEnv("NEXT_PUBLIC_CIRCLE_CLIENT_KEY"),
  );
}

export function getCircleModularTransport() {
  // The /arcTestnet suffix targets Arc testnet through Circle's bundler.
  return toModularTransport(
    `${requireEnv("NEXT_PUBLIC_CIRCLE_CLIENT_URL")}/arcTestnet`,
    requireEnv("NEXT_PUBLIC_CIRCLE_CLIENT_KEY"),
  );
}

export async function deriveSmartAccountAddress(credential: unknown) {
  const transport = getCircleModularTransport();
  const publicClient = createPublicClient({ chain: arcTestnet, transport });
  const webAuthn = toWebAuthnAccount({ credential: credential as never });
  const account = await toCircleSmartAccount({
    client: publicClient,
    owner: webAuthn,
  });
  return account.address;
}
