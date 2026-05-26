import { expect } from "chai";

import {
  buildAuthorizationMessage,
  createAttestationReference,
  parseAttestationReference
} from "./attestations.ts";

describe("attestation utilities", () => {
  it("creates a stable attestation reference from tx coordinates", () => {
    const reference = createAttestationReference({
      chainId: 11155111,
      transactionHash:
        "0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231",
      logIndex: 4
    });

    expect(reference).to.equal(
      "eip155:11155111:0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231:4"
    );
  });

  it("parses a previously generated attestation reference", () => {
    const parsed = parseAttestationReference(
      "eip155:11155111:0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231:4"
    );

    expect(parsed).to.deep.equal({
      chainId: 11155111,
      transactionHash:
        "0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231",
      logIndex: 4
    });
  });

  it("rejects malformed attestation references", () => {
    expect(() => parseAttestationReference("not-a-reference")).to.throw(
      "Invalid attestation reference."
    );
  });

  it("builds a plain-English authorization message", () => {
    const message = buildAuthorizationMessage({
      appName: "zkNotary",
      chainName: "Ethereum Sepolia",
      documentHash:
        "0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231",
      walletAddress: "0x1234000000000000000000000000000000005678",
      nonce: "att-12345"
    });

    expect(message).to.contain("Authorize a sponsored document attestation");
    expect(message).to.contain("Wallet: 0x1234000000000000000000000000000000005678");
    expect(message).to.contain(
      "Document hash: 0x2e92941f8ef64d3f9e7f4057d31f6a7bf0f8d2a2ea57d6acaa63f44d52db8231"
    );
    expect(message).to.contain("Network: Ethereum Sepolia");
    expect(message).to.contain("Nonce: att-12345");
  });
});
