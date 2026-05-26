import { NextResponse } from "next/server";
import { Interface, getAddress } from "ethers";

import { createAttestationReference } from "@/lib/attestations";
import { publicEnv } from "@/lib/env";
import type { AttestationRecord, NotarizeResponse } from "@/lib/domain";
import {
  computeAuthorizationDigest,
  notarizeSubmissionSchema,
  resolveAttestationChainId,
  verifyAuthorizationSignature
} from "@/lib/notarize";
import { getPrivyServerClient } from "@/lib/privy-server";
import { getServiceSupabaseClient, requireProfileDisplayName } from "@/lib/supabase";
import { getReadContract, getWriteContract, zkNotaryAbi } from "@/lib/zknotary-contract";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!authToken) {
    return NextResponse.json({ error: "Missing Privy access token." }, { status: 401 });
  }

  const parseResult = notarizeSubmissionSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid notarization payload." }, { status: 400 });
  }

  const privy = getPrivyServerClient();
  const supabase = getServiceSupabaseClient();
  const readRegistry = getReadContract();
  const writeRegistry = getWriteContract();

  if (!privy || !supabase || !readRegistry || !writeRegistry) {
    return NextResponse.json(
      { error: "Server-side notarization services are not fully configured." },
      { status: 503 }
    );
  }

  const payload = parseResult.data;

  try {
    const claims = await privy.utils().auth().verifyAuthToken(authToken);
    if (claims.user_id !== payload.userId) {
      return NextResponse.json({ error: "Authenticated user mismatch." }, { status: 403 });
    }

    const claimedWallet = getAddress(payload.walletAddress);
    verifyAuthorizationSignature({
      authorizationMessage: payload.authorizationMessage,
      authorizationSignature: payload.authorizationSignature,
      walletAddress: claimedWallet
    });

    const expectedDigest = computeAuthorizationDigest(payload.authorizationMessage);
    if (expectedDigest !== payload.authorizationDigest) {
      return NextResponse.json(
        { error: "Authorization digest does not match the signed message." },
        { status: 400 }
      );
    }

    const alreadyExists = await readRegistry.hasWalletAttested(
      payload.documentHash,
      claimedWallet
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "This wallet has already attested the same file hash." },
        { status: 409 }
      );
    }

    const transaction = await writeRegistry.notarize(
      payload.documentHash,
      claimedWallet,
      payload.authorizationDigest
    );
    const receipt = await transaction.wait();

    if (!receipt) {
      throw new Error("Transaction receipt was not returned.");
    }

    const iface = new Interface(zkNotaryAbi);
    const matchingLog = receipt.logs.find((log: (typeof receipt.logs)[number]) => {
      try {
        return iface.parseLog(log)?.name === "DocumentAttested";
      } catch {
        return false;
      }
    });

    if (!matchingLog) {
      throw new Error("Attestation event was not found in the receipt.");
    }

    const block = await receipt.getBlock();
    if (!block) {
      throw new Error("Could not resolve the notarization block.");
    }

    const chainId = resolveAttestationChainId({
      configuredChainId: publicEnv.NEXT_PUBLIC_CHAIN_ID,
      blockChainId: block.chainId
    });
    const publicDisplayName = payload.shareDisplayNamePublicly
      ? await requireProfileDisplayName(payload.userId)
      : null;

    if (payload.shareDisplayNamePublicly && !publicDisplayName) {
      return NextResponse.json(
        {
          error:
            "Save a private display name in your dashboard before sharing it on a public attestation."
        },
        { status: 409 }
      );
    }

    const attestationRef = createAttestationReference({
      chainId,
      transactionHash: receipt.hash,
      logIndex: matchingLog.index
    });
    const notarizedAt = new Date(Number(block.timestamp) * 1000).toISOString();

    const record: Omit<AttestationRecord, "id" | "createdAt"> = {
      userId: payload.userId,
      documentHash: payload.documentHash,
      attestingWallet: claimedWallet,
      authorizationDigest: payload.authorizationDigest,
      chainId,
      networkName: publicEnv.NEXT_PUBLIC_CHAIN_NAME,
      txHash: receipt.hash,
      logIndex: matchingLog.index,
      attestationRef,
      fileName: payload.fileName,
      fileType: payload.fileType,
      description: payload.description,
      tags: payload.tags,
      publicDisplayName,
      status: "active",
      publicSupersededNote: null,
      privateSupersededNote: null,
      notarizedAt
    };

    const { error } = await supabase.from("attestations").insert({
      user_id: record.userId,
      document_hash: record.documentHash,
      attesting_wallet: record.attestingWallet,
      authorization_digest: record.authorizationDigest,
      chain_id: record.chainId,
      network_name: record.networkName,
      tx_hash: record.txHash,
      log_index: record.logIndex,
      attestation_ref: record.attestationRef,
      file_name: record.fileName,
      file_type: record.fileType,
      description: record.description,
      tags: record.tags,
      public_display_name: record.publicDisplayName,
      status: record.status,
      public_superseded_note: record.publicSupersededNote,
      private_superseded_note: record.privateSupersededNote,
      notarized_at: record.notarizedAt
    });

    if (error) {
      throw error;
    }

    const response: NotarizeResponse = {
      attestationRef,
      receiptPath: `/notarize/receipt/${encodeURIComponent(attestationRef)}`,
      txHash: receipt.hash,
      notarizedAt,
      walletAddress: claimedWallet,
      documentHash: payload.documentHash
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Notarization could not be completed."
      },
      { status: 500 }
    );
  }
}
