import { expect } from "chai";

import type { AttestationRecord } from "./domain.ts";
import {
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
    status: "active",
    publicSupersededNote: null,
    privateSupersededNote: null,
    notarizedAt: "2026-05-26T12:00:00.000Z",
    createdAt: "2026-05-26T12:00:00.000Z",
    ...overrides
  };
}

describe("record privacy helpers", () => {
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
