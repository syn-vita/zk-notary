# zkNotary — Notarized Document Vault DApp
## Application Specification Document

---

## 1. Project Overview

**zkNotary** is a decentralized document notarization application. Users can upload any file, hash its contents client-side, and permanently record that hash on the Ethereum Sepolia testnet via a smart contract. Anyone can later verify a document's authenticity and timestamp without trusting any central authority.

**Core Value Proposition:**
- Tamper-proof proof of existence for any document
- Publicly verifiable records on Sepolia Etherscan
- No gas popups — developer sponsors all transactions via Privy server wallets
- No raw file ever leaves the user's browser

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Auth & Wallet | Privy (embedded wallet + server wallet for gas sponsorship) |
| Blockchain | Ethereum Sepolia Testnet |
| Smart Contract | Solidity (via Hardhat) |
| Contract Interaction | ethers.js v6 |
| Off-chain DB | Supabase (PostgreSQL) |
| File Hashing | Web Crypto API (SHA-256, client-side only) |
| Package Manager | npm |

---

## 3. Smart Contract

### `zkNotary.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract zkNotary {
    struct Document {
        address owner;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Document) public documents;

    event DocumentNotarized(
        bytes32 indexed documentHash,
        address indexed owner,
        uint256 timestamp
    );

    function notarize(bytes32 documentHash) external {
        require(!documents[documentHash].exists, "Document already notarized");
        documents[documentHash] = Document({
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        emit DocumentNotarized(documentHash, msg.sender, block.timestamp);
    }

    function verify(bytes32 documentHash) external view returns (address owner, uint256 timestamp, bool exists) {
        Document memory doc = documents[documentHash];
        return (doc.owner, doc.timestamp, doc.exists);
    }
}
```

**Deployment:** Sepolia testnet via Hardhat. Save deployed contract address in `.env`.

---

## 4. Privy Setup — Sponsored Transactions

- Use **Privy server wallets** to sponsor gas
- The developer's funded Sepolia wallet submits all `notarize()` transactions via a Next.js API route — `PRIVY_APP_SECRET` never exposed to the browser
- Users authenticate via Privy (email, Google, or embedded wallet)
- Users never sign a transaction or see a gas prompt
- Privy handles session management and auth state

**Environment variables needed:**
```
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_SEPOLIA_RPC_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 5. Supabase Schema

### `documents` table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,               -- Privy user ID
  document_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hex string
  file_name TEXT NOT NULL,             -- Original filename
  file_type TEXT,                      -- MIME type
  description TEXT,                    -- User-provided label
  tags TEXT[] DEFAULT '{}',            -- e.g. ["Legal", "Academic"]
  tx_hash TEXT,                        -- Sepolia transaction hash
  notarized_at TIMESTAMPTZ,            -- Block timestamp
  is_superseded BOOLEAN DEFAULT FALSE, -- Revocation flag
  superseded_note TEXT,                -- Note explaining supersession
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> **Note:** The blockchain is the source of truth. Supabase is the UX layer — it stores filenames, tags, descriptions, and revocation notes that can't go on-chain.

---

## 6. File Structure

```
zknotary/
├── contracts/
│   ├── zkNotary.sol
│   └── hardhat.config.ts
├── scripts/
│   └── deploy.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # Root layout — Privy provider wraps here
│   │   ├── page.tsx                          # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx                      # Dashboard — requires auth
│   │   ├── notarize/
│   │   │   └── page.tsx                      # Notarize flow — requires auth
│   │   ├── verify/
│   │   │   └── page.tsx                      # Public verify page
│   │   └── api/
│   │       └── notarize/
│   │           └── route.ts                  # POST — server wallet submits tx, saves to Supabase
│   ├── components/
│   │   ├── FileDropzone.tsx                  # "use client"
│   │   ├── HashPreview.tsx                   # "use client"
│   │   ├── HashingProgressBar.tsx            # "use client"
│   │   ├── DocumentCard.tsx                  # "use client"
│   │   ├── TagInput.tsx                      # "use client"
│   │   ├── VerifyResult.tsx                  # "use client"
│   │   ├── VerifyCertificate.tsx             # "use client"
│   │   ├── QRCodeDisplay.tsx                 # "use client"
│   │   ├── EtherscanLink.tsx
│   │   ├── OnboardingTooltips.tsx            # "use client"
│   │   └── RevocationModal.tsx               # "use client"
│   ├── context/
│   │   └── AuthContext.tsx                   # "use client" — Privy auth context
│   ├── hooks/
│   │   ├── useNotarize.ts                    # Calls /api/notarize
│   │   ├── useVerify.ts                      # Reads contract directly (public RPC)
│   │   └── useDocuments.ts                   # Fetches from Supabase
│   └── lib/
│       ├── hash.ts                           # Client-side SHA-256 with progress
│       ├── contract.ts                       # ethers.js read-only contract instance
│       └── supabase.ts                       # Supabase client
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### Key Next.js App Router Rules
- All components that use browser APIs, React hooks, or event handlers **must** have `"use client"` at the top
- The hashing logic in `hash.ts` runs entirely in the browser — any component that calls it must be a client component
- The Privy provider must be wrapped in a client component in `layout.tsx`
- API routes in `app/api/` run server-side — this is where `PRIVY_APP_SECRET` is used safely
- Page components (`page.tsx`) can be server components unless they need interactivity

---

## 7. Core User Flows

### Flow 1 — Notarize a Document
1. User logs in via Privy
2. If first time: onboarding tooltip tour explains hashing and blockchain in plain English
3. User drags and drops a file onto `FileDropzone`
4. `HashingProgressBar` shows real-time hashing progress (important for large files)
5. App checks on-chain: if hash already exists, warn "This document was already notarized on [date]" and block resubmission
6. `HashPreview` shows the computed hash before submission
7. User adds optional description, tags (e.g. "Legal", "Academic", "Personal")
8. User clicks "Notarize"
9. Frontend calls `POST /api/notarize` with the hash + metadata
10. API route uses Privy server wallet to call `notarize(hash)` on-chain — no gas popup for user
11. On success: tx hash + metadata saved to Supabase from the API route
12. UI shows success screen with Etherscan link + QR code for the verify URL

### Flow 2 — Verify a Document
1. User (anyone, no login required) visits `/verify`
2. Hash pre-filled from URL query param `/verify?hash=0x...` if present
3. User uploads a file OR pastes a hash directly (toggle between the two)
4. App hashes file client-side
5. App calls `verify(hash)` on the contract directly via public RPC (read-only, free, no API route needed)
6. If found: show certificate-style ✅ result with owner address, timestamp, Etherscan link — printable
7. If not found: show ❌ "No record found on-chain"
8. If document is marked superseded in Supabase: show warning banner alongside the valid chain record

### Flow 3 — Dashboard
1. Authenticated user sees all their notarized documents (fetched from Supabase)
2. Search bar filters by filename or description
3. Tag filter chips narrow results (multi-select)
4. Date range filter available
5. Each `DocumentCard` shows: filename, tags, description, date, truncated hash, Etherscan link
6. Each card has: "Copy verify link", "View QR code", "Mark as superseded" actions
7. Superseded cards visually dimmed with a badge — blockchain record still exists and is valid

### Flow 4 — Onboarding Tour (First-Time Users)
1. Triggered automatically on first login
2. Tooltip sequence: Welcome → What is hashing? → Why is it safe? → What does "on-chain" mean? → How to verify later
3. Plain English — no jargon
4. Dismissable, re-triggerable from a "?" help button in the nav

---

## 8. Key Implementation Notes

### Client-Side Hashing with Progress (`src/lib/hash.ts`)
```typescript
"use client"; // if imported directly in a component — or keep as a plain TS utility

export async function hashFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  let offset = 0;
  const chunks: ArrayBuffer[] = [];

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    chunks.push(await chunk.arrayBuffer());
    offset += CHUNK_SIZE;
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)));
  }

  const fullBuffer = await new Blob(chunks).arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", fullBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
```

### API Route — Notarize (`src/app/api/notarize/route.ts`)
- Receives: `{ hash, fileName, fileType, description, tags, userId }`
- Verifies the Privy session server-side
- Uses Privy server wallet + ethers.js to call `notarize(hash)` on Sepolia
- Waits for tx confirmation, then saves full record to Supabase
- Returns: `{ txHash, notarizedAt }`
- `PRIVY_APP_SECRET` only ever used here — never in client code

### Read-Only Contract Calls (Verify + Duplicate Check)
- Use `ethers.JsonRpcProvider` with `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- Call `verify(hash)` directly from the browser — no API route needed since it's read-only and free
- Used both on the Verify page and for duplicate detection before notarization

### Shareable Verify Link & QR Code
- Format: `/verify?hash=0x...`
- Pre-populate hash field from URL params using `useSearchParams()` (client component)
- QR code generated client-side using `qrcode.react`
- Shown after successful notarization and on each dashboard card

### Certificate-Style Verify Result
- Styled div rendered client-side
- Contains: zkNotary logo, document hash, owner wallet address, timestamp, Etherscan link, "Verified on Ethereum Sepolia" badge
- `window.print()` triggers browser print/save as PDF
- If superseded: includes a red "SUPERSEDED" watermark banner

### Revocation / Supersession
- Cannot delete from blockchain — that's by design and a feature
- Supabase `is_superseded` + `superseded_note` lets users annotate a document as outdated
- Verify page shows a warning banner if superseded, but valid chain record is still shown
- Dashboard dims superseded cards visually

---

## 9. UI/UX Requirements

### General
- Dark theme, professional and minimal
- Responsive (desktop-first, mobile-friendly)
- Toast notifications for all async actions — never silent failures
- Always show descriptive status text alongside loaders: "Hashing file...", "Checking for duplicates...", "Submitting to blockchain...", "Confirmed!"

### Landing Page
- Hero section in plain English — no blockchain jargon in the headline
- Two primary CTAs: "Notarize a Document" and "Verify a Document"
- Visual explainer: file → hash → blockchain → verification
- No login required to visit Verify

### Notarize Page (`"use client"`)
- Large drag-and-drop zone
- `HashingProgressBar` on file drop for large files
- Inline duplicate warning if hash already exists on-chain
- Hash preview before submission
- Tag input with predefined suggestions + custom entry
- Optional description field
- "Notarize" button disabled until file is dropped and hashing is complete
- Post-success: tx hash + Etherscan link + QR code

### Verify Page (`"use client"` for interactive parts)
- Toggle: "Upload file" vs "Paste hash"
- Hash pre-filled from URL query param
- Certificate-style ✅ result with print button
- Clear ❌ "No record found" state
- Superseded warning banner when applicable
- No login required — fully public

### Dashboard (`"use client"`)
- Search bar (filename or description)
- Tag filter chips (multi-select)
- Date range filter
- Grid of `DocumentCard` components
- Each card: filename, tags, description, date, truncated hash, Etherscan link, copy verify link, view QR, mark as superseded
- Superseded cards dimmed with badge
- Empty state with CTA to notarize first document

### Onboarding Tooltip Tour
- Triggered on first login
- Steps: Welcome → What is hashing? → Why is it safe? → What does "on-chain" mean? → How to verify later
- Re-triggerable from "?" help button in nav

---

## 10. Demo Script (for presentation)

1. Open the app, show the landing page — explain it in one sentence
2. Log in with Privy — no wallet setup, no MetaMask, no gas prompts
3. First-time onboarding tour plays — show it briefly, then dismiss
4. Drop a PDF — progress bar shows hashing in real time
5. Add a tag ("Academic") and a description
6. Click Notarize — no gas popup, transaction confirms in seconds
7. Show the success screen: Etherscan link + QR code
8. Open Etherscan — show the live public record on Sepolia
9. Scan the QR code (or open the verify link in incognito)
10. Upload the same file on the Verify page — ✅ certificate result, show the print button
11. Modify the file slightly, upload again — ❌ no record found
12. Back on dashboard — show search, tag filter, "Mark as superseded" flow
13. The contrast between ✅ verified and ❌ tampered (steps 10–11) is your money moment

---
