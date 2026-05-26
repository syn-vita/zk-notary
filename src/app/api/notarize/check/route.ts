import { NextResponse } from "next/server";
import { getAddress } from "ethers";
import { z } from "zod";

import { classifyDuplicateStatus } from "@/lib/notarize";
import { getReadContract } from "@/lib/zknotary-contract";

export const runtime = "nodejs";

const querySchema = z.object({
  hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  wallet: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional()
});

export async function GET(request: Request) {
  const parseResult = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );

  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid duplicate-check parameters." }, { status: 400 });
  }

  const registry = getReadContract();
  if (!registry) {
    return NextResponse.json({
      status: "unavailable",
      attestationCount: 0,
      hasWalletAttested: false,
      message: "Registry access is not configured."
    });
  }

  const walletAddress = parseResult.data.wallet ? getAddress(parseResult.data.wallet) : null;
  const [countRaw, hasWalletAttested] = await Promise.all([
    registry.getAttestationCount(parseResult.data.hash),
    walletAddress
      ? registry.hasWalletAttested(parseResult.data.hash, walletAddress)
      : Promise.resolve(false)
  ]);

  const attestationCount = Number(countRaw);
  const status = classifyDuplicateStatus({
    attestationCount,
    hasWalletAttested
  });

  return NextResponse.json({
    status,
    attestationCount,
    hasWalletAttested,
    message:
      status === "not-found"
        ? "No prior attestations found."
        : status === "already-by-you"
          ? "This wallet already attested the same file hash."
          : "This file hash already has attestations from other wallets."
  });
}
