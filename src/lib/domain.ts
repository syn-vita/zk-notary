export type AttestationRecordStatus = "active" | "superseded";

export type UserProfile = {
  userId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

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
  publicDisplayName: string | null;
  status: AttestationRecordStatus;
  publicSupersededNote: string | null;
  privateSupersededNote: string | null;
  notarizedAt: string;
  createdAt: string;
};

export type PublicAttestationRecord = {
  attestationRef: string;
  documentHash: string;
  attestingWallet: string;
  publicDisplayName: string | null;
  chainId: number;
  networkName: string;
  txHash: string;
  logIndex: number;
  status: AttestationRecordStatus;
  publicSupersededNote: string | null;
  notarizedAt: string;
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

export type NotarizeProfileResponse = {
  profile: UserProfile | null;
};

export type VerificationLookupResponse = {
  outcome: VerificationOutcome;
  primaryRecord: PublicAttestationRecord | null;
  relatedRecords: PublicAttestationRecord[];
  query: {
    attestationRef: string | null;
    documentHash: string | null;
  };
};

export type DashboardListResponse = {
  records: AttestationRecord[];
};

export type UserProfileResponse = {
  profile: UserProfile | null;
};
