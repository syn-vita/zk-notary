import type { AttestationRecord, VerificationOutcome } from "./domain.ts";

export type VerificationResolution = {
  outcome: VerificationOutcome;
  primaryRecord: AttestationRecord | null;
  relatedRecords: AttestationRecord[];
};

export function resolveVerificationOutcome(input: {
  requestedRef: string | null;
  matches: AttestationRecord[];
}): VerificationResolution {
  const orderedMatches = [...input.matches].sort((left, right) =>
    left.notarizedAt.localeCompare(right.notarizedAt)
  );

  if (orderedMatches.length === 0) {
    return {
      outcome: "not-found",
      primaryRecord: null,
      relatedRecords: []
    };
  }

  const requestedRecord = input.requestedRef
    ? orderedMatches.find((record) => record.attestationRef === input.requestedRef) ?? null
    : null;
  const primaryRecord = requestedRecord ?? orderedMatches[0];
  const relatedRecords = orderedMatches.filter(
    (record) => record.attestationRef !== primaryRecord.attestationRef
  );

  if (primaryRecord.status === "superseded") {
    return {
      outcome: "superseded-valid",
      primaryRecord,
      relatedRecords
    };
  }

  if (input.requestedRef && requestedRecord) {
    return {
      outcome: "exact-attestation",
      primaryRecord,
      relatedRecords
    };
  }

  if (relatedRecords.length > 0) {
    return {
      outcome: "hash-with-other-attestations",
      primaryRecord,
      relatedRecords
    };
  }

  return {
    outcome: "exact-attestation",
    primaryRecord,
    relatedRecords
  };
}

export function buildVerificationSummary(record: AttestationRecord): string {
  const baseSummary = [
    "Wallet-authorized proof recorded on Sepolia.",
    `Wallet: ${record.attestingWallet}.`,
    `Timestamp: ${new Date(record.notarizedAt).toLocaleString()}.`
  ];

  if (record.status === "superseded" && record.publicSupersededNote) {
    baseSummary.push(`Superseded context: ${record.publicSupersededNote}`);
  }

  return baseSummary.join(" ");
}
