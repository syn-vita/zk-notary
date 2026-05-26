import { expect } from "chai";

import type { AttestationRecord } from "./domain.ts";
import {
  fromDatabaseAttestationRow,
  filterOwnerAttestations,
  toPublicAttestationView
} from "./records.ts";

function createRecord(
  overrides: Partial<AttestationRecord> = {}
): AttestationRecord {
  return {
    id: "att-1",
    userId: "user-1",
    documentHash:
      "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578",
    attestingWallet: "0x1234000000000000000000000000000000005678",
    authorizationDigest:
      "0x3efbd5f6601fcb987799f4f3f87c0f6c102b0d22c5d34337f019b55fd16a5b72",
    chainId: 11155111,
    networkName: "Sepolia",
    txHash: "0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231",
    logIndex: 4,
    attestationRef:
      "eip155:11155111:0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231:4",
    fileName: "evidence.pdf",
    fileType: "application/pdf",
    description: "Supporting record",
    tags: ["Legal", "Archive"],
    publicDisplayName: null,
    status: "active",
    publicSupersededNote: null,
    privateSupersededNote: null,
    notarizedAt: "2026-05-26T12:00:00.000Z",
    createdAt: "2026-05-26T12:00:00.000Z",
    ...overrides
  };
}

describe("record privacy helpers", () => {
  it("normalizes snake_case database rows into the app record shape", () => {
    const record = fromDatabaseAttestationRow({
      id: "att-1",
      user_id: "user-1",
      document_hash:
        "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578",
      attesting_wallet: "0x1234000000000000000000000000000000005678",
      authorization_digest:
        "0x3efbd5f6601fcb987799f4f3f87c0f6c102b0d22c5d34337f019b55fd16a5b72",
      chain_id: 11155111,
      network_name: "Sepolia",
      tx_hash: "0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231",
      log_index: 4,
      attestation_ref:
        "eip155:11155111:0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231:4",
      file_name: "evidence.pdf",
      file_type: "application/pdf",
      description: "Supporting record",
      tags: ["Legal", "Archive"],
      public_display_name: "Giancarlo",
      status: "active",
      public_superseded_note: null,
      private_superseded_note: null,
      notarized_at: "2026-05-26T12:00:00.000Z",
      created_at: "2026-05-26T12:00:00.000Z"
    });

    expect(record.attestationRef).to.equal(
      "eip155:11155111:0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231:4"
    );
    expect(record.documentHash).to.equal(
      "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578"
    );
    expect(record.fileName).to.equal("evidence.pdf");
    expect(record.publicDisplayName).to.equal("Giancarlo");
    expect(record.publicSupersededNote).to.equal(null);
  });

  it("removes filename and private metadata from the public view", () => {
    const view = toPublicAttestationView(createRecord());

    expect(view).to.not.have.property("fileName");
    expect(view).to.not.have.property("description");
    expect(view).to.not.have.property("tags");
    expect(view.documentHash).to.equal(
      "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578"
    );
  });

  it("keeps an explicitly shareable superseded note public", () => {
    const view = toPublicAttestationView(
      createRecord({
        status: "superseded",
        publicSupersededNote: "Replaced by amended filing."
      })
    );

    expect(view.publicSupersededNote).to.equal("Replaced by amended filing.");
  });
});

describe("dashboard filtering helpers", () => {
  it("filters records by search query and status", () => {
    const records = [
      createRecord(),
      createRecord({
        id: "att-2",
        fileName: "thesis.pdf",
        status: "superseded",
        description: "Research appendix"
      })
    ];

    const filtered = filterOwnerAttestations(records, {
      query: "thesis",
      status: "superseded"
    });

    expect(filtered).to.have.length(1);
    expect(filtered[0]?.fileName).to.equal("thesis.pdf");
  });
});
