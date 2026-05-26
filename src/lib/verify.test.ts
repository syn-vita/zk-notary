import { expect } from "chai";

import type { AttestationRecord } from "./domain.ts";
import {
  buildVerificationSummary,
  resolveVerificationOutcome
} from "./verify.ts";

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
    tags: ["Legal"],
    status: "active",
    publicSupersededNote: null,
    privateSupersededNote: null,
    notarizedAt: "2026-05-26T12:00:00.000Z",
    createdAt: "2026-05-26T12:00:00.000Z",
    ...overrides
  };
}

describe("verification helpers", () => {
  it("resolves an exact attestation when the requested ref exists", () => {
    const primary = createRecord();
    const related = createRecord({
      id: "att-2",
      attestingWallet: "0x9999000000000000000000000000000000001234",
      attestationRef:
        "eip155:11155111:0xaa2941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8123:1"
    });

    const result = resolveVerificationOutcome({
      requestedRef: primary.attestationRef,
      matches: [primary, related]
    });

    expect(result.outcome).to.equal("exact-attestation");
    expect(result.primaryRecord?.attestationRef).to.equal(primary.attestationRef);
    expect(result.relatedRecords).to.have.length(1);
  });

  it("marks a superseded record as valid but superseded", () => {
    const superseded = createRecord({
      status: "superseded",
      publicSupersededNote: "Replaced by a revised filing."
    });

    const result = resolveVerificationOutcome({
      requestedRef: superseded.attestationRef,
      matches: [superseded]
    });

    expect(result.outcome).to.equal("superseded-valid");
    expect(result.primaryRecord?.publicSupersededNote).to.equal(
      "Replaced by a revised filing."
    );
  });

  it("falls back to hash-with-other-attestations when a file hash matches multiple records", () => {
    const first = createRecord();
    const second = createRecord({
      id: "att-2",
      attestingWallet: "0x9999000000000000000000000000000000001234",
      attestationRef:
        "eip155:11155111:0xaa2941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8123:1"
    });

    const result = resolveVerificationOutcome({
      requestedRef: null,
      matches: [first, second]
    });

    expect(result.outcome).to.equal("hash-with-other-attestations");
    expect(result.primaryRecord?.attestationRef).to.equal(first.attestationRef);
    expect(result.relatedRecords).to.have.length(1);
  });

  it("returns not-found when there are no matching records", () => {
    const result = resolveVerificationOutcome({
      requestedRef: null,
      matches: []
    });

    expect(result.outcome).to.equal("not-found");
    expect(result.primaryRecord).to.equal(null);
  });

  it("builds a reviewer-facing summary for a public certificate", () => {
    const summary = buildVerificationSummary(
      createRecord({
        status: "superseded",
        publicSupersededNote: "Archived after an amended filing."
      })
    );

    expect(summary).to.contain("Wallet-authorized proof recorded on Sepolia");
    expect(summary).to.contain("Archived after an amended filing.");
  });
});
