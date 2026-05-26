export type AttestationRecordStatus = "active" | "superseded";

export type AttestationRecord = {
  id: string;
  userId: string;
  documentHash: string;
  attestingWallet: string;
  authorizationDigest: string;
  chainId: number;
  networkName: string;
  txHash: string;
  logIndex: number;
  attestationRef: string;
  fileName: string;
  fileType: string | null;
  description: string | null;
  tags: string[];
  status: AttestationRecordStatus;
  publicSupersededNote: string | null;
  privateSupersededNote: string | null;
  notarizedAt: string;
  createdAt: string;
};

export type VerificationOutcome =
  | "exact-attestation"
  | "hash-with-other-attestations"
  | "not-found"
  | "superseded-valid";

export type DuplicateCheckResponse = {
  status: "not-found" | "already-by-you" | "already-by-others" | "unavailable";
  attestationCount: number;
  hasWalletAttested: boolean;
  message: string;
};

export type NotarizeResponse = {
  attestationRef: string;
  receiptPath: string;
  txHash: string;
  notarizedAt: string;
  walletAddress: string;
  documentHash: string;
};

export type VerificationLookupResponse = {
  outcome: VerificationOutcome;
  primaryRecord: AttestationRecord | null;
  relatedRecords: AttestationRecord[];
  query: {
    attestationRef: string | null;
    documentHash: string | null;
  };
};
