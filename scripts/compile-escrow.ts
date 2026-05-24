// Compile contracts/AttributionEscrow.sol via the npm `solc` package and
// write contracts/build/AttributionEscrow.json so deploy-escrow.ts can read it.
//
// Usage: `npm run compile`  (which runs `tsx scripts/compile-escrow.ts`).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const SRC = join(process.cwd(), "contracts", "AttributionEscrow.sol");
const OUT_DIR = join(process.cwd(), "contracts", "build");
const OUT = join(OUT_DIR, "AttributionEscrow.json");

function main() {
  if (!existsSync(SRC)) {
    console.error(`Source not found: ${SRC}`);
    process.exit(1);
  }
  const source = readFileSync(SRC, "utf-8");

  // CommonJS interop: solc only ships a CJS entrypoint.
  const require = createRequire(import.meta.url);
  const solc = require("solc") as {
    compile: (input: string) => string;
  };

  const input = {
    language: "Solidity",
    sources: {
      "AttributionEscrow.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };

  const out = JSON.parse(solc.compile(JSON.stringify(input)));

  if (out.errors) {
    const fatal = out.errors.filter((e: { severity: string }) => e.severity === "error");
    if (fatal.length > 0) {
      console.error(
        "solc errors:\n" +
          fatal.map((e: { formattedMessage: string }) => e.formattedMessage).join("\n"),
      );
      process.exit(1);
    }
    for (const w of out.errors) console.warn(w.formattedMessage);
  }

  const contract = out.contracts?.["AttributionEscrow.sol"]?.AttributionEscrow;
  if (!contract) {
    console.error("AttributionEscrow not found in solc output");
    process.exit(1);
  }

  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}`;

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({ abi, bytecode, compiledAt: new Date().toISOString() }, null, 2),
  );

  const sizeKb = (bytecode.length / 2 / 1024).toFixed(2);
  console.log(`Wrote ${OUT} (bytecode ${sizeKb} KiB, ${abi.length} ABI entries)`);
}

main();
