export type AttestationReferenceInput = {
  chainId: number;
  transactionHash: string;
  logIndex: number;
};

export type AuthorizationMessageInput = {
  appName: string;
  chainName: string;
  documentHash: string;
  walletAddress: string;
  nonce: string;
};

export type AttestationReference = AttestationReferenceInput;

const ATTESTATION_REFERENCE_PATTERN =
  /^eip155:(\d+):(0x[a-fA-F0-9]{64}):(\d+)$/;

export function createAttestationReference(
  input: AttestationReferenceInput
): string {
  const { chainId, transactionHash, logIndex } = input;

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("A positive chain ID is required.");
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    throw new Error("A 32-byte transaction hash is required.");
  }

  if (!Number.isInteger(logIndex) || logIndex < 0) {
    throw new Error("A non-negative log index is required.");
  }

  return `eip155:${chainId}:${transactionHash.toLowerCase()}:${logIndex}`;
}

export function parseAttestationReference(reference: string): AttestationReference {
  const match = ATTESTATION_REFERENCE_PATTERN.exec(reference);

  if (!match) {
    throw new Error("Invalid attestation reference.");
  }

  return {
    chainId: Number(match[1]),
    transactionHash: match[2].toLowerCase(),
    logIndex: Number(match[3])
  };
}

export function buildAuthorizationMessage(
  input: AuthorizationMessageInput
): string {
  return [
    `${input.appName}`,
    "",
    "Authorize a sponsored document attestation.",
    "Your original file stays in your browser. Only the file hash and attestation details are recorded.",
    "",
    `Wallet: ${input.walletAddress}`,
    `Document hash: ${input.documentHash}`,
    `Network: ${input.chainName}`,
    `Nonce: ${input.nonce}`
  ].join("\n");
}
