# zkNotary

`zkNotary` is an evidence-oriented document attestation app that records
wallet-authorized proofs for file hashes on `Ethereum Sepolia`.

The product is designed around one core idea:
- the original file stays local in the browser
- the app hashes it locally
- the user authorizes the attestation with a wallet signature
- the backend sponsors the Sepolia transaction
- public verification stays proof-only and privacy-conscious

It is not a licensed legal notary product. It proves file integrity, wallet
authorization, and timestamped attestation history. It does not by itself prove
authorship, truthfulness, or universal legal enforceability.

## Features

- Local-only file hashing in the browser
- Gasless sponsored notarization on `Sepolia`
- Public verification by:
  - file upload
  - attestation reference
  - hash
- Private owner dashboard for:
  - filenames
  - descriptions
  - tags
  - supersession notes
  - editable private display name
- Optional per-attestation public display-name snapshot
- Proof-only receipt and certificate export/print flow

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Privy` for auth and wallet UX
- `Supabase` for app-owned metadata
- `Solidity + Hardhat + ethers` for on-chain attestation logic
- `Ethereum Sepolia`

## Product Model

### Public proof surfaces

Public verification and receipt views may expose:
- attestation reference
- document hash
- attesting wallet
- chain/network
- transaction hash
- notarized timestamp
- public superseded note
- optional `public_display_name` snapshot when explicitly opted in

Public proof views must not expose:
- filename
- description
- tags
- private superseded note
- private profile display name

### Private owner surfaces

The dashboard is the private metadata surface. It shows:
- filename
- description
- tags
- private notes
- supersession management
- private editable account display name

### Display names

There are two separate name concepts:

1. `profiles.display_name`
- private
- editable
- owner-facing only

2. `attestations.public_display_name`
- optional
- per-attestation
- snapshot at notarization time
- default opt-in toggle is `off`

This distinction is important. Public proof pages must not live-read the private
profile name.

## Repository Structure

- `src/app/`
  Next.js App Router pages and API routes
- `src/components/`
  UI workbenches, certificates, navigation, and shared UI pieces
- `src/lib/`
  domain types, attestation helpers, Supabase access, profile logic, and chain helpers
- `contracts/`
  Solidity attestation contract
- `scripts/`
  Hardhat deployment script
- `supabase/`
  historical migrations plus a unified schema bootstrap file

## Database Setup

For a fresh Supabase project, run:

- `supabase/schema.sql`

in the Supabase SQL editor.

The numbered files under `supabase/migrations/` are preserved as incremental
history:
- `202605260001_create_attestations.sql`
- `202605260002_create_profiles.sql`
- `202605260003_add_public_display_name_to_attestations.sql`

Fresh installs only need `supabase/schema.sql`.

## Contract Deployment

The attestation contract must be deployed to `Sepolia` before live notarization
works.

Deployment command:

```bash
npm run deploy:sepolia
```

After deployment, set:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

The deploy script reads:
- `SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY` if present
- otherwise `SPONSOR_PRIVATE_KEY`

## Environment Variables

### Public

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_NAME=Sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_PRIVY_CLIENT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Server-only

```env
PRIVY_APP_SECRET=
PRIVY_VERIFICATION_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SEPOLIA_RPC_URL=
SPONSOR_PRIVATE_KEY=
```

Important:
- `SUPABASE_SERVICE_ROLE_KEY` is server-only
- `SPONSOR_PRIVATE_KEY` is server-only
- do not expose either value in client code or public docs/screenshots

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run a production build:

```bash
npm run build
```

## Verification Semantics

Verification is based on the `document hash`, not the filename.

Examples:
- same file contents, different filename -> should still verify
- updated file contents, same filename -> should not match the old attestation
- another user uploading the exact same file -> can still see the public proof

The product answers:
- has this exact file been attested before?
- which wallet attested it?
- when was it attested?

It does not answer:
- is the uploader the same person who originally notarized it?

## Vercel Deployment Checklist

Before deploying to Vercel:

1. Run `supabase/schema.sql` in your Supabase project
2. Deploy the contract to `Sepolia`
3. Fund the sponsor wallet with Sepolia ETH
4. Add every required env var in Vercel Project Settings
5. Ensure Privy allowed origins include your Vercel domain
6. Ensure the deployed app can reach:
   - Supabase
   - Privy
   - Sepolia RPC

Notes for this repo:
- API routes explicitly use `runtime = "nodejs"`
- `/api/notarize` sets `maxDuration = 300` because it waits for an on-chain transaction
- the app depends on server-side access to Privy, Supabase, and Sepolia RPC for live notarization

## Key Routes

User-facing:
- `/`
- `/notarize`
- `/verify`
- `/dashboard`
- `/notarize/receipt/[reference]`

API:
- `/api/notarize`
- `/api/notarize/check`
- `/api/verify`
- `/api/dashboard/attestations`
- `/api/dashboard/attestations/[id]`
- `/api/dashboard/profile`

## Current UX Constraints

If you redesign the UI, preserve these rules:
- verification remains hash-based
- public proof pages stay privacy-safe
- private profile name is not public by default
- public display name remains a per-attestation opt-in snapshot
- dashboard remains the owner-only metadata surface

## Notes

- `npm run dev` may conflict if multiple Next dev servers are already running locally
- print/export uses a popup print window flow designed to work in Chromium/Edge
- older accounts without profile rows still work and fall back to wallet address in owner views
