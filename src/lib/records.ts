import type { AttestationRecord, PublicAttestationRecord } from "./domain.ts";

export function toPublicAttestationView(
  record: AttestationRecord
): PublicAttestationRecord {
  return {
    attestationRef: record.attestationRef,
    documentHash: record.documentHash,
    attestingWallet: record.attestingWallet,
    chainId: record.chainId,
    networkName: record.networkName,
    txHash: record.txHash,
    logIndex: record.logIndex,
    status: record.status,
    publicSupersededNote: record.publicSupersededNote,
    notarizedAt: record.notarizedAt
  };
}

export function filterOwnerAttestations(
  records: AttestationRecord[],
  input: {
    query: string;
    status: "all" | "active" | "superseded";
  }
): AttestationRecord[] {
  const query = input.query.trim().toLowerCase();

  return records.filter((record) => {
    const matchesStatus = input.status === "all" || record.status === input.status;
    if (!matchesStatus) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [record.fileName, record.description ?? "", record.tags.join(" "), record.attestationRef]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}
