import type { AttestationRecord, PublicAttestationRecord } from "./domain.ts";

export type DatabaseAttestationRow = {
  id: string;
  user_id: string;
  document_hash: string;
  attesting_wallet: string;
  authorization_digest: string;
  chain_id: number;
  network_name: string;
  tx_hash: string;
  log_index: number;
  attestation_ref: string;
  file_name: string;
  file_type: string | null;
  description: string | null;
  tags: string[] | null;
  public_display_name: string | null;
  status: AttestationRecord["status"];
  public_superseded_note: string | null;
  private_superseded_note: string | null;
  notarized_at: string;
  created_at: string;
};

export function fromDatabaseAttestationRow(
  row: DatabaseAttestationRow
): AttestationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    documentHash: row.document_hash,
    attestingWallet: row.attesting_wallet,
    authorizationDigest: row.authorization_digest,
    chainId: row.chain_id,
    networkName: row.network_name,
    txHash: row.tx_hash,
    logIndex: row.log_index,
    attestationRef: row.attestation_ref,
    fileName: row.file_name,
    fileType: row.file_type,
    description: row.description,
    tags: row.tags ?? [],
    publicDisplayName: row.public_display_name,
    status: row.status,
    publicSupersededNote: row.public_superseded_note,
    privateSupersededNote: row.private_superseded_note,
    notarizedAt: row.notarized_at,
    createdAt: row.created_at
  };
}

export function toPublicAttestationView(
  record: AttestationRecord
): PublicAttestationRecord {
  return {
    attestationRef: record.attestationRef,
    documentHash: record.documentHash,
    attestingWallet: record.attestingWallet,
    publicDisplayName: record.publicDisplayName,
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
