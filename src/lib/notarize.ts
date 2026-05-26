import { getAddress, hashMessage, verifyMessage } from "ethers";
import { z } from "zod";

const documentHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const signatureSchema = z.string().regex(/^0x[a-fA-F0-9]+$/);

export const duplicateStatusSchema = z.enum([
  "not-found",
  "already-by-you",
  "already-by-others",
  "unavailable"
]);

export type DuplicateStatus = z.infer<typeof duplicateStatusSchema>;

export const notarizeSubmissionSchema = z.object({
  userId: z.string().min(1),
  documentHash: documentHashSchema,
  walletAddress: walletAddressSchema,
  authorizationMessage: z.string().min(1),
  authorizationSignature: signatureSchema,
  authorizationDigest: documentHashSchema,
  fileName: z.string().min(1),
  fileType: z.string().nullable(),
  description: z.string().trim().max(280).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8),
  nonce: z.string().min(1)
});

export type NotarizeSubmission = z.infer<typeof notarizeSubmissionSchema>;

export function normalizeTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of input.split(",")) {
    const tag = rawTag.trim();
    if (!tag) {
      continue;
    }

    const dedupeKey = tag.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    tags.push(tag);
  }

  return tags;
}

export function classifyDuplicateStatus(input: {
  attestationCount: number;
  hasWalletAttested: boolean;
}): DuplicateStatus {
  if (input.attestationCount <= 0) {
    return "not-found";
  }

  return input.hasWalletAttested ? "already-by-you" : "already-by-others";
}

export function verifyAuthorizationSignature(input: {
  authorizationMessage: string;
  authorizationSignature: string;
  walletAddress: string;
}): string {
  const recovered = getAddress(
    verifyMessage(input.authorizationMessage, input.authorizationSignature)
  );
  const claimedAddress = getAddress(input.walletAddress);

  if (recovered !== claimedAddress) {
    throw new Error("Authorization signature does not match the selected wallet.");
  }

  return recovered;
}

export function computeAuthorizationDigest(authorizationMessage: string): string {
  return hashMessage(authorizationMessage);
}
