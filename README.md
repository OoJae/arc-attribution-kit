# Arc Attribution Kit

> Operator credits creators on Arc. Creators claim with zero gas.

A starter kit for Arc builders who need a "platform attributes fees to many creators, creators withdraw on demand" flow. The same primitive shows up in: prediction-market builder codes, affiliate / referral splits, content royalties, and marketplace revenue shares.

Submitted to the [Arc Open Source Showcase](https://arc-oss.thecanteenapp.com/).

## Live demo

[https://arc-attribution-kit.vercel.app](https://arc-attribution-kit.vercel.app)

Two routes: `/admin` (operator credits creators against subject IDs) and `/dashboard` (creator enrolls a passkey + claims accrued USDC via paymaster-sponsored userOp).

## What you get

- `contracts/AttributionEscrow.sol` — operator-attributed escrow with a configurable platform-fee bps and per-subject creator mapping.
- viem read/write helpers (`lib/chain/escrow.ts`).
- Foundry-free Solidity compile + deploy scripts (`scripts/compile-escrow.ts`, `scripts/deploy-escrow.ts`) using the npm `solc` package.
- CCTP v2 sweep generator (`lib/circle/cctp.ts`) that mints USDC from Polygon Amoy directly into the escrow contract on Arc.
- Modular Wallets passkey enrollment (`components/passkey-setup.tsx`, `lib/circle/wallets.ts`) lifted from `arc-p2p-payments`.
- Circle Paymaster v0.8 sponsorship for the claim userOp so creators pay zero gas (`components/claim-button.tsx`, `lib/circle/bundler.ts`).
- A minimal Next.js demo dapp with `/admin` (operator) and `/dashboard` (creator) routes.

## Compared to existing Arc reference code

| Repo | What it handles |
|---|---|
| [arc-p2p-payments](https://github.com/circlefin/arc-p2p-payments) | Peer-to-peer USDC transfers (single sender → single receiver) with passkey wallets. |
| [arc-commerce](https://github.com/circlefin/arc-commerce) | Checkout flows. Single payment in, single recipient. |
| **arc-attribution-kit** (this repo) | **Post-checkout, multi-recipient on-chain attribution.** An Operator credits many Creators against arbitrary subject IDs; Creators see their accrued balance and withdraw with a paymaster-sponsored userOp. |

## Quickstart

```bash
git clone https://github.com/OoJae/arc-attribution-kit.git
cd arc-attribution-kit
npm install
cp .env.example .env.local   # then fill in OPERATOR_PRIVATE_KEY + Circle keys

npm run compile              # solc -> contracts/build/AttributionEscrow.json
npm run deploy               # deploys to Arc testnet, prints contract address

# paste the printed address into .env.local as ATTRIBUTION_ESCROW_ADDRESS
npm run dev                  # open http://localhost:3000
```

## Architecture

```
+-----------------+      registerSubject       +------------------+
| Operator EOA    | -------------------------> |                  |
| (contract owner)|      creditFees            | AttributionEscrow|
|                 | -------------------------> |   (Arc testnet)  |
+-----------------+                            |                  |
       ^                                       |  accrued[creator]|
       | CCTP v2 burn/mint                     |  subjectCreator  |
       | (optional fan-in)                     +------------------+
+-----------------+                                     |
| Polygon Amoy    |                                     | claim()
| TokenMessengerV2|                                     v
+-----------------+                            +------------------+
                                               |  Creator wallet  |
                                               |  (passkey,       |
                                               |   paymaster gas) |
                                               +------------------+
```

The Operator EOA is the contract owner. It registers each subject (a bytes32 derived from any string id you choose) against a creator address, then credits fees against the subject id. The contract splits each credit between the creator and the platform per `platformFeeBps` (set at deploy time).

Creators enroll a passkey via Circle Modular Wallets, see their accrued balance on `/dashboard`, and click claim. The claim is a paymaster-sponsored userOp via Circle Paymaster v0.8 — the creator pays zero gas.

## The contract in one screen

```solidity
contract AttributionEscrow {
    address public owner;
    address public usdc;
    uint16 public immutable platformFeeBps;

    mapping(address => uint256) public accrued;
    mapping(bytes32 => address) public subjectCreator;

    function registerSubject(bytes32 subjectId, address creator) external onlyOwner {
        subjectCreator[subjectId] = creator;
    }

    function creditFees(bytes32 subjectId, uint256 amount) external onlyOwner {
        address creator = subjectCreator[subjectId];
        require(creator != address(0), "unknown subject");
        uint256 platformCut = (amount * platformFeeBps) / 10_000;
        accrued[creator] += amount - platformCut;
        if (platformCut > 0) accrued[owner] += platformCut;
    }

    function claim() external {
        uint256 owed = accrued[msg.sender];
        if (owed == 0) revert NothingToClaim();
        accrued[msg.sender] = 0;
        require(IERC20(usdc).transfer(msg.sender, owed), "transfer failed");
    }
}
```

Full source with events + payoutBatch in [`contracts/AttributionEscrow.sol`](contracts/AttributionEscrow.sol).

## Integration patterns

### 1. Prediction-market builder codes

Map each market's question to a subject id; credit the builder fee from each on-chain fill. This is what [Babel Markets](https://github.com/OoJae/babel-markets) does — see the wired-up sweep + credit flow in `app/api/escrow/sweep/route.ts` on that repo.

### 2. Affiliate / referral splits

Subject id = the referral code or affiliate slug. When a referred user pays, the platform credits the affiliate's address against that subject id. The 80/20 default keeps a slice of fee revenue for the platform.

### 3. Marketplace revenue shares

Subject id = the listing id or product sku. Each sale credits the seller; payments aggregate on Arc; sellers withdraw on demand with zero gas.

## Operator endpoints

The demo dapp exposes three API routes:

- `POST /api/credit` — body `{ subjectId, creator, amountUsdc }`, header `x-operator-key: <OPERATOR_API_KEY>`. Idempotently registers the subject then calls `creditFees`.
- `POST /api/sweep` — body `{ amountUsdc }`. Streams the 4-stage CCTP sweep as Server-Sent Events. Mint recipient is forced to the escrow contract.
- `GET /api/accrued?address=0x...` — public read; returns the on-chain accrued balance for the given address. No auth.

## Used by

- [Babel Markets](https://github.com/OoJae/babel-markets) — wires Polymarket builder-code fills into this primitive. Live at https://babel-markets.vercel.app.

## License

MIT. Fork freely.

---

Built for the [Arc Open Source Showcase](https://arc-oss.thecanteenapp.com/) at the Agora Agents Hackathon (Canteen × Circle × Arc).
